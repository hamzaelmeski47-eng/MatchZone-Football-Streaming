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
    html = html.replace(/<script[\s\S]*?clearonclick[\s\S]*?<\/script>/gi, "<!-- clearonclick-stripped -->");
    html = html.replace(/<script[\s\S]*?aclib[\s\S]*?<\/script>/gi, "<!-- aclib-stripped -->");
    html = html.replace(/<script[\s\S]*?acscdn[\s\S]*?<\/script>/gi, "<!-- acscdn-stripped -->");
    html = html.replace(/<script[\s\S]*?__cxwwzo[\s\S]*?<\/script>/gi, "<!-- cxwwzo-stripped -->");
    html = html.replace(/<script[\s\S]*?extancecompert[\s\S]*?<\/script>/gi, "<!-- ad-stripped -->");
    html = html.replace(/<script[\s\S]*?boredflix[\s\S]*?<\/script>/gi, "<!-- analytics-stripped -->");
    html = html.replace(/<script[\s\S]*?googlesyndication[\s\S]*?<\/script>/gi, "<!-- adsense-stripped -->");
    html = html.replace(/<script[\s\S]*?upwafts[\s\S]*?<\/script>/gi, "<!-- popunder-stripped -->");
    html = html.replace(/<script[\s\S]*?__moSandbox[\s\S]*?<\/script>/gi, "<!-- sandbox-detector-stripped -->");
    html = html.replace(/<script[\s\S]*?mosb[\s\S]*?<\/script>/gi, "<!-- sandbox-banner-stripped -->");
    html = html.replace(/<script[\s\S]*?window\.__moSandbox[\s\S]*?<\/script>/gi, "<!-- sandbox-check-stripped -->");
    html = html.replace(/<script[\s\S]*?Chrome PDF Viewer[\s\S]*?<\/script>/gi, "<!-- pdf-check-stripped -->");
    html = html.replace(/<script[\s\S]*?embed-sandboxed[\s\S]*?<\/script>/gi, "<!-- embed-sandboxed-stripped -->");
    html = html.replace(/u\.searchParams\.set\(["']sb["'],\s*["']1["']\)/gi, 'console.log("sb blocked")');
    html = html.replace(/var stop=1&&\(reason===["']sandbox["']\|\|reason===["']popups["']\);/gi, 'var stop=0;');
    html = html.replace(/<script[\s\S]*?249903[\s\S]*?<\/script>/gi, "<!-- popup-zone-stripped -->");
    html = html.replace(/<script[\s\S]*?last=0,done=false[\s\S]*?<\/script>/gi, "<!-- click-hijack-stripped -->");
    html = html.replace(/<script[\s\S]*?umami[\s\S]*?<\/script>/gi, "<!-- umami-stripped -->");
    html = html.replace(/<script[\s\S]*?frubth[\s\S]*?<\/script>/gi, "<!-- ad-burst-stripped -->");

    // 2. Ensure relative assets resolve to matchora.to without adding a base tag (which hijacks relative API routes)
    html = html.replace(/src=["']\/logo\.webp["']/gi, 'src="https://matchora.to/logo.webp"');
    html = html.replace(/href=["']\/favicon\.ico["']/gi, 'href="https://matchora.to/favicon.ico"');
    html = html.replace(/href=["']\/icon\.png["']/gi, 'href="https://matchora.to/icon.png"');

    // 3. Rewrite /api/play/ calls to our backend proxy
    html = html.replace(/\/api\/play\//g, "/api/streams/play-proxy/");
    // Also rewrite telemetry endpoints directly to matchora.to
    html = html.replace(/\/api\/leave\//g, "https://matchora.to/api/leave/");
    html = html.replace(/\/api\/report\//g, "https://matchora.to/api/report/");
    html = html.replace(/\/api\/cap/g, "https://matchora.to/api/cap");

    // 4. Force START_MUTED=true so Chrome autoplay policy allows immediate seamless playback without manual play button
    html = html.replace(/START_MUTED\s*=\s*false/g, "START_MUTED=true");

    // 5. Ensure video has playsinline and webkit-playsinline for iOS/Safari
    html = html.replace(/<video id="v"/i, '<video id="v" playsinline webkit-playsinline muted');

    // 6. Inject strict anti-popup defense & instant autoplay unlock directly inside the player
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

        // Safeguard fetch: ensure play requests route to this backend's proxy even if origin differs
        (function() {
          var origFetch = window.fetch;
          window.fetch = function(input, init) {
            if (typeof input === 'string') {
              if (input.indexOf('/api/play/') !== -1) {
                input = input.replace(/.*?\\/api\\/play\\//, '/api/streams/play-proxy/');
              } else if (input.indexOf('matchora.to/api/streams/play-proxy/') !== -1) {
                input = input.replace(/^https?:\\/\\/[^\\/]*matchora\\.to/, '');
              }
            }
            return origFetch.call(this, input, init);
          };
        })();

        // Instant autoplay and interaction unmute
        (function() {
          function triggerPlay() {
            var v = document.getElementById('v');
            if (v && v.paused) {
              v.muted = true;
              v.play().catch(function() {});
            }
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', triggerPlay);
          } else {
            triggerPlay();
          }

          function unmuteAndPlay() {
            var v = document.getElementById('v');
            if (v) {
              v.muted = false;
              if (v.paused) v.play().catch(function() {});
            }
          }
          document.addEventListener('click', unmuteAndPlay, false);
          document.addEventListener('touchstart', unmuteAndPlay, false);
        })();
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

    const data = (await response.json()) as any;
    if (data && data.url && typeof data.url === "string") {
      // Wrap stream URL in our HLS proxy so CDN cross-origin restrictions are completely bypassed
      data.url = `/api/streams/hls-proxy?url=${encodeURIComponent(data.url)}`;
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to fetch stream token" });
  }
}));

/**
 * GET /api/streams/hls-proxy
 * Proxies HLS playlists (.m3u8) and video fragments (.ts)
 * bypassing CDN CORS restrictions and ensuring uninterrupted playback.
 */
router.get("/hls-proxy", asyncHandler(async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.startsWith("https://")) {
    return res.status(400).send("Invalid stream target URL");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Referer": "https://matchora.to/",
        "Origin": "https://matchora.to",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to stream chunk");
    }

    const contentType = response.headers.get("content-type") || "";
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

    // If playlist (.m3u8 or mpegurl), rewrite segment URLs to route through proxy
    if (targetUrl.includes(".m3u8") || contentType.includes("mpegurl")) {
      const playlist = await response.text();
      const baseUri = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const urlQuery = targetUrl.includes("?") ? targetUrl.substring(targetUrl.indexOf("?")) : "";

      const lines = playlist.split("\n");
      const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;
        let fullUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
          ? trimmed
          : new URL(trimmed, baseUri).toString();
        if (!fullUrl.includes("?") && urlQuery) {
          fullUrl += urlQuery;
        }
        return `/api/streams/hls-proxy?url=${encodeURIComponent(fullUrl)}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Cache-Control", "no-cache, no-store");
      return res.send(rewritten.join("\n"));
    }

    // Binary segment (.ts / .m4s / etc.)
    if (contentType) res.setHeader("Content-Type", contentType);
    const contentLength = response.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Cache-Control", "public, max-age=3600");
    if (response.body) {
      const { Readable } = await import("stream");
      return (Readable.fromWeb(response.body as any) as any).pipe(res);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return res.send(buffer);
  } catch (err: any) {
    return res.status(502).send("HLS proxy error");
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