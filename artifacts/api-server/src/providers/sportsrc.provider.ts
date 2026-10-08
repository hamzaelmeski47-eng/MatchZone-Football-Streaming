import { logger } from "../lib/logger";
import { env } from "../config/env";
import type {
  LiveSource,
  LiveSourceType,
  LiveStreamProvider,
  MatchContext,
} from "./live-stream-provider.interface";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface SportSrcMatchItem {
  id: string | number;
  home_team?: string | { name?: string };
  away_team?: string | { name?: string };
  home?: string;
  away?: string;
  name?: string; // e.g. "Arsenal vs Chelsea"
  status?: string;
  date?: string;
  time?: string;
  timestamp?: number;
  sport?: string;
  has_stream?: boolean;
}

interface SportSrcDetailResponse {
  success?: boolean;
  message?: string;
  data?: any;
  streams?: any[];
  sources?: any[];
  player?: string | any;
  embed_url?: string;
  stream_url?: string;
}

// Arabic to English transliteration / team aliases mapping for reliable match resolution
const ARABIC_TO_ENGLISH_TEAMS: Record<string, string> = {
  "ريال مدريد": "real madrid",
  "برشلونة": "barcelona",
  "أتلتيكو مدريد": "atletico madrid",
  "مانشستر سيتي": "manchester city",
  "مانشستر يونايتد": "manchester united",
  "ليفربول": "liverpool",
  "أرسنال": "arsenal",
  "تشيلسي": "chelsea",
  "توتنهام": "tottenham",
  "نيوكاسل": "newcastle",
  "أستون فيلا": "aston villa",
  "بايرن ميونخ": "bayern munich",
  "بوروسيا دورتموند": "borussia dortmund",
  "باريس سان جيرمان": "paris saint germain",
  "يوفنتوس": "juventus",
  "إنتر ميلان": "inter milan",
  "ميلان": "ac milan",
  "نابولي": "napoli",
  "روما": "as roma",
  "الهلال": "al hilal",
  "النصر": "al nassr",
  "الاتحاد": "al ittihad",
  "الأهلي": "al ahly",
  "الزمالك": "zamalek",
  "الوداد": "wydad",
  "الرجاء": "raja",
  "الترجي": "esperance",
};

/**
 * Normalizes text for sports matching:
 * - Maps Arabic team names to English equivalents when known
 * - Removes accents / diacritics
 * - Converts to lower case
 * - Strips club suffixes (FC, CF, United, Club, SC, etc.)
 */
function normalizeTeamName(raw?: string): string {
  if (!raw) return "";
  let text = raw.trim().toLowerCase();

  // Check direct Arabic dictionary
  for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH_TEAMS)) {
    if (text.includes(ar.toLowerCase())) {
      text = en;
      break;
    }
  }

  // Remove diacritics / accents
  text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Remove common club prefixes / suffixes and punctuation
  text = text
    .replace(/[.\-_'’]/g, " ")
    .replace(/\b(fc|cf|sc|afc|club|de|united|city|hotspur|saint|st)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/**
 * Computes word-overlap similarity score between two team names (0 to 1)
 */
function teamSimilarity(a: string, b: string): number {
  const normA = normalizeTeamName(a);
  const normB = normalizeTeamName(b);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;

  const tokensA = new Set(normA.split(" ").filter((t) => t.length > 2));
  const tokensB = new Set(normB.split(" ").filter((t) => t.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

export class SportSrcProvider implements LiveStreamProvider {
  readonly name = "SportSRC V2";

  private baseUrl: string;
  private apiKey: string;

  // TTL Caches to strictly respect 1000 req/day limit
  private matchesCache: CacheEntry<SportSrcMatchItem[]> | null = null;
  private detailCache = new Map<string, CacheEntry<LiveSource[]>>();
  private inFlightRequests = new Map<string, Promise<LiveSource[]>>();

  // Cache TTL constants
  private static readonly MATCHES_CACHE_TTL_MS = 90 * 1000; // 90 seconds
  private static readonly DETAIL_CACHE_TTL_MS = 60 * 1000;  // 60 seconds
  private static readonly NEGATIVE_CACHE_TTL_MS = 60 * 1000; // 60s for no stream
  private static readonly REQUEST_TIMEOUT_MS = 6000;         // 6s timeout

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = (apiKey || env.liveStreamApiKey || "").trim();
    this.baseUrl = (baseUrl || env.liveStreamProviderUrl || "https://api.sportsrc.org/v2/").trim();
    if (!this.baseUrl.endsWith("/")) {
      this.baseUrl += "/";
    }
  }

  /**
   * Main entry point to retrieve legitimate live stream sources for a MatchZone match.
   */
  async getSources(match: MatchContext): Promise<LiveSource[]> {
    // If not configured with a valid API key, return empty safely
    if (!this.apiKey) {
      logger.debug(
        { fixtureId: match.fixtureId },
        "[SportSrcProvider] LIVE_STREAM_API_KEY is not configured on the server. Skipping external lookup."
      );
      return [];
    }

    const cacheKey = `fixture-${match.fixtureId}`;

    // 1. Check detail cache
    const cached = this.detailCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // 2. Prevent duplicate concurrent requests (stampede protection)
    if (this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey)!;
    }

    const fetchPromise = this.resolveAndFetchSources(match)
      .then((sources) => {
        const ttl = sources.length > 0
          ? SportSrcProvider.DETAIL_CACHE_TTL_MS
          : SportSrcProvider.NEGATIVE_CACHE_TTL_MS;
        this.detailCache.set(cacheKey, {
          data: sources,
          expiresAt: Date.now() + ttl,
        });
        return sources;
      })
      .catch((err) => {
        logger.warn(
          { fixtureId: match.fixtureId, err: err?.message || err },
          "[SportSrcProvider] Error resolving live streams"
        );
        return [];
      })
      .finally(() => {
        this.inFlightRequests.delete(cacheKey);
      });

    this.inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Internal lookup logic: matches API-Football fixture to SportSRC match ID and fetches streams.
   */
  private async resolveAndFetchSources(match: MatchContext): Promise<LiveSource[]> {
    // 1. Find SportSRC Match ID via safe metadata mapping
    const sportSrcMatchId = await this.findSportSrcMatchId(match);
    if (!sportSrcMatchId) {
      logger.debug(
        { fixtureId: match.fixtureId, home: match.homeTeam, away: match.awayTeam },
        "[SportSrcProvider] No reliable SportSRC match found for fixture. Returning no source."
      );
      return [];
    }

    // 2. Query SportSRC type=detail endpoint for authorized stream embeds
    return this.fetchDetailSources(sportSrcMatchId);
  }

  /**
   * Queries SportSRC matches list and safely maps using official metadata.
   * Never guesses or returns a random stream.
   */
  private async findSportSrcMatchId(match: MatchContext): Promise<string | number | null> {
    const matches = await this.fetchLiveMatchesList();
    if (!matches || matches.length === 0) {
      return null;
    }

    let bestMatchId: string | number | null = null;
    let highestScore = 0;

    const targetHome = match.homeTeam || "";
    const targetAway = match.awayTeam || "";

    for (const item of matches) {
      // Extract home and away names from SportSRC match item
      let itemHome = "";
      let itemAway = "";

      if (typeof item.home_team === "string") itemHome = item.home_team;
      else if (item.home_team && typeof item.home_team === "object") itemHome = item.home_team.name || "";
      else if (item.home) itemHome = item.home;

      if (typeof item.away_team === "string") itemAway = item.away_team;
      else if (item.away_team && typeof item.away_team === "object") itemAway = item.away_team.name || "";
      else if (item.away) itemAway = item.away;

      if (!itemHome && !itemAway && item.name) {
        const parts = item.name.split(/\s+vs\.?\s+|\s+-\s+/i);
        if (parts.length === 2) {
          itemHome = parts[0].trim();
          itemAway = parts[1].trim();
        }
      }

      // Check similarity
      const homeSim = teamSimilarity(targetHome, itemHome);
      const awaySim = teamSimilarity(targetAway, itemAway);

      // BOTH teams must match with high confidence (>= 0.70 each)
      if (homeSim >= 0.70 && awaySim >= 0.70) {
        const combinedScore = (homeSim + awaySim) / 2;
        if (combinedScore > highestScore) {
          highestScore = combinedScore;
          bestMatchId = item.id;
        }
      }
    }

    return bestMatchId;
  }

  /**
   * Fetches in-progress matches from SportSRC with caching.
   */
  private async fetchLiveMatchesList(): Promise<SportSrcMatchItem[]> {
    if (this.matchesCache && Date.now() < this.matchesCache.expiresAt) {
      return this.matchesCache.data;
    }

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set("type", "matches");
      url.searchParams.set("sport", "football");
      url.searchParams.set("status", "inprogress");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-KEY": this.apiKey,
        },
        signal: AbortSignal.timeout(SportSrcProvider.REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logHttpError(response.status, "fetchLiveMatchesList");
        return [];
      }

      const json = (await response.json()) as any;
      let rawList: any[] = [];

      if (Array.isArray(json)) {
        rawList = json;
      } else if (Array.isArray(json.data)) {
        if (json.data.length > 0 && Array.isArray(json.data[0]?.matches)) {
          rawList = json.data.flatMap((l: any) => l.matches || []);
        } else {
          rawList = json.data;
        }
      } else if (Array.isArray(json.matches)) {
        rawList = json.matches;
      } else if (json.data && Array.isArray(json.data.matches)) {
        rawList = json.data.matches;
      }

      const matches: SportSrcMatchItem[] = rawList.map((m: any) => ({
        id: m.id || m.match_id || m.fixture_id,
        home_team: m.teams?.home?.name || m.home_team || m.homeTeam || m.home,
        away_team: m.teams?.away?.name || m.away_team || m.awayTeam || m.away,
        home: typeof m.home === "string" ? m.home : (m.teams?.home?.name || undefined),
        away: typeof m.away === "string" ? m.away : (m.teams?.away?.name || undefined),
        name: m.title || m.name,
        status: m.status,
        date: m.date,
        time: m.time,
        timestamp: m.timestamp,
        sport: m.sport,
        has_stream: m.has_stream ?? true,
      }));

      this.matchesCache = {
        data: matches,
        expiresAt: Date.now() + SportSrcProvider.MATCHES_CACHE_TTL_MS,
      };

      return matches;
    } catch (err: any) {
      logger.warn({ error: err?.message || err }, "[SportSrcProvider] Failed to fetch live matches list");
      return [];
    }
  }

  /**
   * Fetches stream detail for a SportSRC match ID using type=detail&id={id}.
   */
  private async fetchDetailSources(sportSrcMatchId: string | number): Promise<LiveSource[]> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set("type", "detail");
      url.searchParams.set("id", String(sportSrcMatchId));

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-KEY": this.apiKey,
        },
        signal: AbortSignal.timeout(SportSrcProvider.REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logHttpError(response.status, `fetchDetailSources(id=${sportSrcMatchId})`);
        return [];
      }

      const json = (await response.json()) as SportSrcDetailResponse;
      return this.parseDetailResponse(json, sportSrcMatchId);
    } catch (err: any) {
      logger.warn(
        { sportSrcMatchId, error: err?.message || err },
        "[SportSrcProvider] Failed to fetch match detail from SportSRC"
      );
      return [];
    }
  }

  /**
   * Parses only documented stream/embed fields from the SportSRC response.
   * Does not extract hidden scripts or invent URLs.
   */
  private parseDetailResponse(
    json: SportSrcDetailResponse,
    sportSrcMatchId: string | number
  ): LiveSource[] {
    const sources: LiveSource[] = [];
    const seenUrls = new Set<string>();

    const rawStreams: any[] = [];

    // Collect stream definitions from documented response formats
    if (Array.isArray(json.streams)) {
      rawStreams.push(...json.streams);
    }
    if (json.data && Array.isArray(json.data.streams)) {
      rawStreams.push(...json.data.streams);
    }
    if (Array.isArray(json.sources)) {
      rawStreams.push(...json.sources);
    }
    if (json.data && Array.isArray(json.data.sources)) {
      rawStreams.push(...json.data.sources);
    }

    // Direct embed_url / player string in response
    const singleEmbed =
      json.embed_url ||
      json.stream_url ||
      json.data?.embed_url ||
      json.data?.stream_url ||
      (typeof json.player === "string" ? json.player : json.data?.player);

    if (typeof singleEmbed === "string" && this.isValidStreamUrl(singleEmbed)) {
      rawStreams.push({
        id: `sportsrc-${sportSrcMatchId}-1`,
        name: "المصدر 1",
        embedUrl: singleEmbed,
      });
    }

    // Parse extracted stream items
    for (let i = 0; i < rawStreams.length; i++) {
      const item = rawStreams[i];
      if (!item) continue;

      const rawUrl =
        item.embedUrl ||
        item.embed_url ||
        item.url ||
        item.stream_url ||
        item.player ||
        item.src;

      if (!rawUrl || typeof rawUrl !== "string") continue;
      const cleanUrl = rawUrl.trim();

      if (!this.isValidStreamUrl(cleanUrl) || seenUrls.has(cleanUrl)) {
        continue;
      }
      seenUrls.add(cleanUrl);

      const sourceType: LiveSourceType =
        item.type === "hls" || cleanUrl.includes(".m3u8")
          ? "hls"
          : item.type === "dash" || cleanUrl.includes(".mpd")
          ? "dash"
          : "embed";

      const sourceName =
        item.name ||
        item.label ||
        item.channel ||
        `المصدر ${sources.length + 1}`;

      sources.push({
        id: String(item.id || `sportsrc-${sportSrcMatchId}-${sources.length + 1}`),
        name: sourceName,
        type: sourceType,
        embedUrl: cleanUrl,
        status: "active",
        quality: item.quality || "HD",
        provider: "SportSRC",
      });
    }

    return sources;
  }

  /**
   * Validates that the URL returned is a legitimate web URL.
   */
  private isValidStreamUrl(url: string): boolean {
    if (!url || typeof url !== "string") return false;
    const lower = url.trim().toLowerCase();
    // Must be http/https or protocol-relative
    if (!lower.startsWith("https://") && !lower.startsWith("http://") && !lower.startsWith("//")) {
      return false;
    }
    // Block javascript/data URIs
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
      return false;
    }
    return true;
  }

  /**
   * Handles HTTP error codes with appropriate logging.
   */
  private logHttpError(status: number, context: string): void {
    if (status === 401 || status === 403) {
      logger.warn({ status, context }, "[SportSrcProvider] Authentication failed. Check LIVE_STREAM_API_KEY.");
    } else if (status === 429) {
      logger.warn({ status, context }, "[SportSrcProvider] Daily rate limit exceeded (1,000 req/day limit reached).");
    } else if (status === 404) {
      logger.debug({ status, context }, "[SportSrcProvider] Resource not found on SportSRC.");
    } else if (status >= 500) {
      logger.warn({ status, context }, "[SportSrcProvider] SportSRC server error.");
    } else {
      logger.warn({ status, context }, `[SportSrcProvider] SportSRC HTTP error ${status}.`);
    }
  }
}
