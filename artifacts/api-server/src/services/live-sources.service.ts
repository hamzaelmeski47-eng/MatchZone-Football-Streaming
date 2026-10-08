import { env } from "../config/env";
import { getActiveStreamsForMatch } from "../models/stream.model";
import { logger } from "../lib/logger";
import {
  providerRegistry,
  type LiveSource,
  type LiveSourceType,
  type MatchContext,
} from "../providers";
import { getFixtureById } from "./api-football.service";
import { matchoraService } from "./matchora.service";
import { resolveMatchBroadcaster } from "./broadcaster";

export type { LiveSource, LiveSourceType, MatchContext };

export interface MatchChannelItem {
  id: string;
  name: string;
  lang?: string;
  quality?: string;
  embedUrl: string;
}

export interface LiveSourcesResponse {
  matchId: number;
  sources: LiveSource[];
  hasSources: boolean;
  matchChannels?: MatchChannelItem[];
  message: string | null;
}

/**
 * Replaces template variables in a stream server URL.
 * Supported variables:
 *   {matchId}  → API-Football fixture ID (number)
 *   {home}     → home team name (URL-encoded)
 *   {away}     → away team name (URL-encoded)
 *   {league}   → league/competition name (URL-encoded)
 */
function resolveServerUrl(
  template: string,
  vars: { matchId: number; home?: string; away?: string; league?: string }
): string {
  return template
    .replace(/\{matchId\}/gi, String(vars.matchId))
    .replace(/\{home\}/gi, encodeURIComponent(vars.home || ""))
    .replace(/\{away\}/gi, encodeURIComponent(vars.away || ""))
    .replace(/\{league\}/gi, encodeURIComponent(vars.league || ""));
}

/**
 * Normalizes stream type into one of 'embed' | 'hls' | 'dash'
 */
function normalizeSourceType(type: string): LiveSourceType {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "iframe" || lower === "embed") return "embed";
  if (lower === "dash" || lower === "mpd") return "dash";
  return "hls";
}

/**
 * Core Live Sources Service
 *
 * Architecture:
 * API-Football (fixture.id, metadata)
 *      ↓
 * Live Sources Service
 *      ↓
 * LiveStreamProvider Adapter (SportSRC V2)
 *      ↓
 * Authorized/returned embed URL
 *      ↓
 * Frontend LiveSources Component & Video Player
 *
 * If no valid stream exists:
 * returns message: "البث المباشر غير متوفر حالياً"
 */
export async function getLiveSourcesForMatch(
  fixtureId: number,
  options?: {
    home?: string;
    away?: string;
    league?: string;
    date?: string;
    kickoff?: string;
    status?: string;
  }
): Promise<LiveSourcesResponse> {
  // 1. Resolve match context: if home/away missing, attempt lookup from API-Football
  let homeTeam = options?.home?.trim() || "";
  let awayTeam = options?.away?.trim() || "";
  let competition = options?.league?.trim() || "";
  let date = options?.date?.trim() || "";
  let kickoffTime = options?.kickoff?.trim() || "";

  if ((!homeTeam || !awayTeam) && fixtureId) {
    try {
      const fixture = await getFixtureById(fixtureId);
      if (fixture) {
        homeTeam = homeTeam || fixture.teams.home.name;
        awayTeam = awayTeam || fixture.teams.away.name;
        competition = competition || fixture.league.name;
        date = date || fixture.fixture.date;
      }
    } catch {
      // Fallback silently if API-Football is offline or unconfigured
    }
  }

  // If match has not kicked off yet (starting whistle hasn't blown), do not return stream player
  const nowMs = Date.now();
  let kickoffMs = 0;
  if (date || options?.date) {
    const parsed = new Date(date || options?.date || "").getTime();
    if (!isNaN(parsed)) kickoffMs = parsed;
  }
  const isUpcoming = options?.status === 'upcoming' || (kickoffMs > 0 && kickoffMs > nowMs);
  if (isUpcoming) {
    const broadcaster = resolveMatchBroadcaster({
      homeName: homeTeam,
      awayName: awayTeam,
      competitionName: competition,
    });
    return {
      matchId: fixtureId,
      sources: [],
      hasSources: false,
      matchChannels: [
        {
          id: `${fixtureId}-main`,
          name: broadcaster,
          embedUrl: "",
          lang: "العربية",
        },
      ],
      message: "المباراة لم تبدأ بعد - سيبدأ البث المباشر فور إطلاق صافرة البداية",
    };
  }

  const sources: LiveSource[] = [];
  const seenUrls = new Set<string>();

  const matchContext: MatchContext = {
    fixtureId,
    homeTeam,
    awayTeam,
    competition,
    date,
    kickoffTime,
    status: options?.status,
  };

  // 2. Query configured Live Stream Providers (e.g. SportSrcProvider)
  const providers = providerRegistry.getProviders();
  for (const provider of providers) {
    try {
      const providerSources = await provider.getSources(matchContext);
      for (const pSrc of providerSources) {
        if (pSrc.embedUrl && !seenUrls.has(pSrc.embedUrl)) {
          seenUrls.add(pSrc.embedUrl);
          sources.push(pSrc);
        }
      }
    } catch (err: any) {
      logger.warn(
        { provider: provider.name, fixtureId, err: err?.message || err },
        "Error querying live stream provider"
      );
    }
  }

  // 3. Check authorized database/model streams registered for this fixture
  try {
    const dbStreams = await getActiveStreamsForMatch(fixtureId);
    for (let idx = 0; idx < dbStreams.length; idx++) {
      const s = dbStreams[idx];
      if (s.stream_url && !seenUrls.has(s.stream_url)) {
        seenUrls.add(s.stream_url);
        sources.push({
          id: `db-${s.id}`,
          name: s.provider || `المصدر ${sources.length + 1}`,
          type: normalizeSourceType(s.stream_type),
          embedUrl: s.stream_url,
          status: s.is_active ? "active" : "offline",
          provider: s.provider,
        });
      }
    }
  } catch {
    // If DB is offline, continue with provider streams
  }

  // 4. Do not include unverified dummy streamServers (Server 1/2/3)
  // Matchora and authenticated providers/database supply verified streams

  // Filter out any offline, empty, or invalid/markdown URLs
  const activeSources = sources.filter(
    (s) =>
      s.status !== "offline" &&
      typeof s.embedUrl === "string" &&
      s.embedUrl.startsWith("https://") &&
      !s.embedUrl.includes("[") &&
      !s.id.startsWith("server-")
  );

  // Prioritize beIN Sports with Arabic commentary first
  activeSources.sort((a, b) => {
    const isBeinA = a.isBein || a.name.toLowerCase().includes("bein") || (a.channel || "").toLowerCase().includes("bein");
    const isBeinB = b.isBein || b.name.toLowerCase().includes("bein") || (b.channel || "").toLowerCase().includes("bein");
    const isArA = a.isArabic || a.name.includes("عربي") || a.commentator?.includes("عربي") || a.lang?.toLowerCase() === "arabic";
    const isArB = b.isArabic || b.name.includes("عربي") || b.commentator?.includes("عربي") || b.lang?.toLowerCase() === "arabic";

    const aScore = (isBeinA && isArA ? 5000 : 0) + (isArA ? 3000 : 0) + (isBeinA ? 1500 : 0);
    const bScore = (isBeinB && isArB ? 5000 : 0) + (isArB ? 3000 : 0) + (isBeinB ? 1500 : 0);

    return bScore - aScore;
  });

  // User requested: "khali ghir wahda li na9la lmatch bel arbiya w tkoun HD"
  // Keep only the single top Arabic HD stream (or single top stream)
  const arabicSources = activeSources.filter(
    (s) => s.isArabic || s.name.includes("عربي") || s.commentator?.includes("عربي") || s.lang?.toLowerCase() === "arabic"
  );

  let finalSources: LiveSource[] = [];
  if (arabicSources.length > 0) {
    const best = arabicSources[0];
    best.quality = "HD";
    finalSources = [best];
  } else if (activeSources.length > 0) {
    const best = activeSources[0];
    best.quality = best.quality || "HD";
    finalSources = [best];
  }

  // Collect available match channels for the Channels button
  let matchChannels: MatchChannelItem[] = [];
  try {
    const directEvent = await matchoraService.fetchEventById(String(fixtureId));
    if (directEvent && Array.isArray(directEvent.channels) && directEvent.channels.length > 0) {
      matchChannels = directEvent.channels
        .filter((c) => !c.dead)
        .map((c) => ({
          id: String(c.id),
          name: c.name,
          lang: c.lang,
          quality: c.quality || "HD",
          embedUrl: c.embed_url || `https://matchora.to/embed/channel/${c.id}`,
        }));
    }
  } catch {
    // Ignore error
  }

  return {
    matchId: fixtureId,
    sources: finalSources,
    hasSources: finalSources.length > 0,
    matchChannels,
    message: finalSources.length === 0 ? "البث المباشر غير متوفر حالياً" : null,
  };
}
