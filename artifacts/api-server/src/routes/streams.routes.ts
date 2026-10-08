import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import {
  getMatchStreamController,
  getMatchLiveSourcesController,
  getMatchoraSourceController,
  getActiveMatchesWithStreamsController,
  getStreamServersController,
  listStreamsController,
  createStreamController,
  updateStreamController,
  deleteStreamController,
} from "../controllers/streams.controller";

const router = Router();

/**
 * GET /api/streams/active-matches
 * Returns list of match IDs that currently have active authorized streams/iframes
 */
router.get("/active-matches", asyncHandler(getActiveMatchesWithStreamsController));

/**
 * GET /api/streams/clean-embed
 * Strips popup ads and trackers from Matchora embeds so users experience zero popups on clicks.
 */
router.get("/clean-embed", asyncHandler(async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.startsWith("https://")) {
    return res.status(400).send("Invalid stream URL");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Referer": "https://matchora.to/",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Stream source temporarily unavailable");
    }

    let html = await response.text();

    // 1. Strip all popup ad networks, trackers, and clickjackers
    html = html.replace(/<script[\s\S]*?extancecompert[\s\S]*?<\/script>/gi, "<!-- ad-stripped -->");
    html = html.replace(/<script[\s\S]*?boredflix[\s\S]*?<\/script>/gi, "<!-- analytics-stripped -->");
    html = html.replace(/<script[\s\S]*?googlesyndication[\s\S]*?<\/script>/gi, "<!-- adsense-stripped -->");
    html = html.replace(/<script[\s\S]*?upwafts[\s\S]*?<\/script>/gi, "<!-- popunder-stripped -->");
    html = html.replace(/<script[\s\S]*?__moSandbox[\s\S]*?<\/script>/gi, "<!-- sandbox-detector-stripped -->");
    html = html.replace(/<script[\s\S]*?frubth[\s\S]*?<\/script>/gi, "<!-- ad-burst-stripped -->");

    // 2. Add base tag so assets (styles, Hls.js, svgs) resolve to matchora.to
    const baseDomain = new URL(targetUrl).origin;
    if (!html.includes("<base ")) {
      html = html.replace("<head>", `<head><base href="${baseDomain}/">`);
    }

    // 3. Rewrite /api/play/ calls to our backend proxy to bypass CORS
    html = html.replace(/\/api\/play\//g, "/api/streams/play-proxy/");

    // 4. Inject strict anti-popup defense directly inside the player
    const antiPopupScript = `
      <script>
        // Completely neutralize window.open popup ads
        window.open = function() { console.log("[MatchZone] Popup ad neutralized"); return null; };
        // Block programmatic and target="_blank" ad redirects
        document.addEventListener('click', function(e) {
          var a = e.target && e.target.closest ? e.target.closest('a') : null;
          if (a && a.target === '_blank' && !a.href.includes(location.host)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }, true);
      </script>
    `;
    html = html.replace("</head>", `${antiPopupScript}</head>`);

    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (err: any) {
    return res.status(502).send("Error loading clean stream");
  }
}));

/**
 * GET /api/streams/play-proxy/:ch
 * Proxies the Matchora play token request with required Referer header
 */
router.get("/play-proxy/:ch", asyncHandler(async (req, res) => {
  const ch = String(req.params.ch || "");
  const queryString = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const target = `https://matchora.to/api/play/${encodeURIComponent(ch)}${queryString}`;

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Referer": `https://matchora.to/embed/channel/${encodeURIComponent(ch)}`,
      },
    });

    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to fetch stream token" });
  }
}));

/**
 * GET /api/streams/servers
 * Returns global server configuration (must be before /:matchId)
 */
router.get("/servers", asyncHandler(getStreamServersController));

/**
 * GET /api/streams/:matchId/matchora
 * GET /api/streams/matchora/:matchId
 * Returns direct Matchora source object { available, provider: "Matchora", embedUrl?, eventId?, reason? }
 */
router.get("/:matchId/matchora", asyncHandler(getMatchoraSourceController));
router.get("/matchora/:matchId", asyncHandler(getMatchoraSourceController));

/**
 * GET /api/streams/:matchId/sources
 * GET /api/streams/match/:matchId/sources
 * Returns structured canonical Live Sources array
 */
router.get("/:matchId/sources", asyncHandler(getMatchLiveSourcesController));
router.get("/match/:matchId/sources", asyncHandler(getMatchLiveSourcesController));

/**
 * GET /api/streams/:matchId
 * Returns authorized stream + server list for a specific match
 */
router.get("/:matchId", asyncHandler(getMatchStreamController));
router.get("/match/:matchId", asyncHandler(getMatchStreamController));

/**
 * Admin stream management endpoints
 */
router.get("/", asyncHandler(listStreamsController));
router.post("/", asyncHandler(createStreamController));
router.put("/:id", asyncHandler(updateStreamController));
router.delete("/:id", asyncHandler(deleteStreamController));

export default router;