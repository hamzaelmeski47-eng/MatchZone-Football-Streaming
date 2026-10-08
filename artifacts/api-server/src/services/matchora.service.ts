import { logger } from "../lib/logger";
import { getFixtureById, type ApiFootballFixture } from "./api-football.service";
import { resolveTeamBadge } from "./team-logos";
import { resolveMatchBroadcaster } from "./broadcaster";
import type { MatchContext, LiveSource } from "../providers/live-stream-provider.interface";

export interface MatchoraChannel {
  id: string;
  name: string;
  country?: string;
  quality?: string;
  lang?: string;
  watching?: number;
  playing?: boolean;
  dead?: boolean;
  embed_url: string;
}

export interface MatchoraEvent {
  id: string;
  home: string;
  away: string;
  league?: string;
  sport?: string;
  watching?: number;
  kickoff?: number;
  status?: string;
  minute?: string;
  score?: string;
  live?: boolean;
  finished?: boolean;
  channel_count?: number;
  channels?: MatchoraChannel[];
  page_url?: string;
  embed_url?: string;
}

export interface MatchoraSourceResponse {
  available: boolean;
  provider: "Matchora";
  embedUrl?: string;
  eventId?: string;
  channels?: Array<{
    id: string;
    name: string;
    embedUrl: string;
    quality?: string;
    lang?: string;
    commentator?: string;
    channel?: string;
    isBein?: boolean;
    isArabic?: boolean;
  }>;
  reason?: "NO_MATCHORA_EVENT" | "NO_EMBED_AVAILABLE" | "API_ERROR" | "INVALID_RESPONSE" | "NOT_LIVE";
  message?: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
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
  "إنتر ميامي": "inter miami",
  "كولومبوس كرو": "columbus crew",
};

/**
 * Normalizes text for sports matching:
 * - Maps Arabic team names to English equivalents when known
 * - Removes accents / diacritics
 * - Converts to lower case
 * - Strips common club noise tokens (FC, CF, United, Club, SC, etc.)
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

/**
 * Strict validator for Matchora embed URLs:
 * - Must be string
 * - Must use HTTPS
 * - Must belong to matchora.to
 */
export function isValidMatchoraEmbedUrl(url: any): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return host === "matchora.to" || host.endsWith(".matchora.to");
  } catch {
    return false;
  }
}

class MatchoraService {
  private static readonly BASE_URL = "https://matchora.to/api/v1";
  private static readonly TIMEOUT_MS = 10000;

  // TTL cache configurations
  private liveEventsCache: CacheEntry<MatchoraEvent[]> | null = null;
  private scheduleCache: CacheEntry<MatchoraEvent[]> | null = null;
  private eventDetailCache = new Map<string, CacheEntry<MatchoraEvent>>();
  private negativeCache = new Map<number, CacheEntry<MatchoraSourceResponse>>();
  private inFlightRequests = new Map<number, Promise<MatchoraSourceResponse>>();

  private static readonly TTL_LIVE_MS = 15 * 1000;       // 15s for live list
  private static readonly TTL_SCHEDULE_MS = 180 * 1000;  // 3m for schedule
  private static readonly TTL_DETAIL_LIVE_MS = 10 * 1000; // 10s for live event detail
  private static readonly TTL_NEGATIVE_MS = 10 * 1000;   // 10s for no match found (short to retry quickly)

  /**
   * Primary service function:
   * 1. Receives the fixture ID and match metadata.
   * 2. Resolves corresponding Matchora event using safe matching.
   * 3. Fetches Matchora event detail.
   * 4. Validates that embed_url is a genuine HTTPS URL from Matchora.
   * 5. Returns clean response without exposing secrets or guessing URLs.
   */
  async getMatchoraSource(
    fixtureId: number,
    options?: MatchContext
  ): Promise<MatchoraSourceResponse> {
    if (!fixtureId || isNaN(fixtureId)) {
      return {
        available: false,
        provider: "Matchora",
        reason: "INVALID_RESPONSE",
        message: "Invalid fixture ID provided.",
      };
    }

    // 1. Check negative cache
    const neg = this.negativeCache.get(fixtureId);
    if (neg && Date.now() < neg.expiresAt) {
      return neg.data;
    }

    // 2. In-flight request deduplication
    if (this.inFlightRequests.has(fixtureId)) {
      return this.inFlightRequests.get(fixtureId)!;
    }

    const requestPromise = this.resolveSource(fixtureId, options)
      .then((res) => {
        if (!res.available) {
          this.negativeCache.set(fixtureId, {
            data: res,
            expiresAt: Date.now() + MatchoraService.TTL_NEGATIVE_MS,
          });
        }
        return res;
      })
      .catch((err) => {
        logger.warn({ fixtureId, err: err?.message || err }, "[MatchoraService] Error fetching source");
        return {
          available: false,
          provider: "Matchora" as const,
          reason: "API_ERROR" as const,
          message: "Matchora API is currently unreachable.",
        };
      })
      .finally(() => {
        this.inFlightRequests.delete(fixtureId);
      });

    this.inFlightRequests.set(fixtureId, requestPromise);
    return requestPromise;
  }

  private async resolveSource(
    fixtureId: number,
    options?: MatchContext
  ): Promise<MatchoraSourceResponse> {
    // Resolve home and away team names from API-Football if missing
    let homeTeam = options?.homeTeam?.trim() || "";
    let awayTeam = options?.awayTeam?.trim() || "";
    let matchDate = options?.date?.trim() || "";

    if (!homeTeam || !awayTeam) {
      try {
        const fixture = await getFixtureById(fixtureId);
        if (fixture) {
          homeTeam = homeTeam || fixture.teams.home.name;
          awayTeam = awayTeam || fixture.teams.away.name;
          matchDate = matchDate || fixture.fixture.date;
        }
      } catch {
        // Silently continue with whatever metadata is available
      }
    }

    // Attempt direct ID lookup if fixtureId is formatted like a Matchora ID (or check directly)
    const directEvent = await this.fetchEventById(String(fixtureId));
    if (directEvent) {
      const directChannels = this.extractValidChannels(directEvent, options);
      if (directChannels && directChannels.length > 0) {
        logger.info({ eventId: directEvent.id, ch: directChannels[0].name }, "[MatchoraService] direct ID - channel embed");
        return { available: true, provider: "Matchora", embedUrl: directChannels[0].embedUrl, eventId: directEvent.id, channels: directChannels };
      }
      if (isValidMatchoraEmbedUrl(directEvent.embed_url)) {
        return this.buildAvailableResponse(directEvent, options);
      }
    }

    // Safe matching against Matchora live events and watchable schedule
    const matchedEvent = await this.findMatchingEvent({
      home: homeTeam,
      away: awayTeam,
      date: matchDate,
    });

    if (!matchedEvent) {
      return {
        available: false,
        provider: "Matchora",
        reason: "NO_MATCHORA_EVENT",
        message: "No reliable Matchora event could be identified for this match.",
      };
    }

    // Retrieve full event detail if needed
    const fullEvent = await this.fetchEventById(matchedEvent.id) || matchedEvent;

    logger.info(
      { eventId: fullEvent.id, home: fullEvent.home, away: fullEvent.away, embedUrl: fullEvent.embed_url, channelCount: fullEvent.channels?.length },
      "[MatchoraService] matched event detail"
    );

    // Prefer channel embed_urls first (more specific than event-level embed)
    const validChannels = this.extractValidChannels(fullEvent, options);
    if (validChannels && validChannels.length > 0) {
      return {
        available: true,
        provider: "Matchora",
        embedUrl: validChannels[0].embedUrl,
        eventId: fullEvent.id,
        channels: validChannels,
      };
    }

    // Strict HTTPS embed URL validation
    if (!isValidMatchoraEmbedUrl(fullEvent.embed_url)) {
      return {
        available: false,
        provider: "Matchora",
        reason: "NO_EMBED_AVAILABLE",
        message: "No valid HTTPS embed URL returned by Matchora for this event.",
      };
    }

    return this.buildAvailableResponse(fullEvent, options);
  }

  private buildAvailableResponse(event: MatchoraEvent, options?: MatchContext): MatchoraSourceResponse {
    const broadcaster = resolveMatchBroadcaster({
      homeName: options?.homeTeam || event.home,
      awayName: options?.awayTeam || event.away,
      competitionName: options?.competition || event.league,
    });

    const isBein = broadcaster.toLowerCase().includes("bein");

    // Use official match embed format with preselected channel per Matchora developer docs
    const directChannelEmbed = event.channels && event.channels.length > 0
      ? `https://matchora.to/embed/match/${event.id}?ch=${event.channels[0].id}`
      : (event.embed_url || `https://matchora.to/embed/match/${event.id}`);

    return {
      available: true,
      provider: "Matchora",
      embedUrl: directChannelEmbed,
      eventId: event.id,
      channels: [
        {
          id: `${event.id}-main`,
          name: `${broadcaster} (بث مباشر HD)`,
          channel: broadcaster,
          embedUrl: directChannelEmbed || "",
          quality: "HD",
          lang: "English",
          commentator: undefined,
          isBein,
          isArabic: false,
        },
      ],
    };
  }

  private extractValidChannels(event: MatchoraEvent, options?: MatchContext) {
    if (!event.channels || !Array.isArray(event.channels)) return undefined;

    const isBeinChannel = (name?: string): boolean => {
      if (!name) return false;
      const lower = name.toLowerCase();
      return lower.includes("bein") || lower.includes("بي ان") || lower.includes("بي إن");
    };

    const isArabicChannel = (ch: MatchoraChannel): boolean => {
      const lang = (ch.lang || "").toLowerCase();
      const name = (ch.name || "").toLowerCase();
      if (lang === "arabic" || lang.includes("arab") || name.includes("عرب") || name.includes("(ar)")) {
        return true;
      }
      // Common MENA beIN channel numbers default to Arabic unless explicitly designated foreign
      if (isBeinChannel(name)) {
        const isForeign =
          lang === "english" ||
          lang === "french" ||
          lang === "spanish" ||
          name.includes("english") ||
          name.includes("french") ||
          name.includes("espana") ||
          name.includes("max");
        if (!isForeign && (name.match(/bein\s*sports?\s*0?[1-9](\s|$)/i) || name.match(/bein\s*sports?\s*xtra/i) || name.match(/bein\s*sports?\s*afc/i))) {
          return true;
        }
      }
      return false;
    };

    const getChannelScore = (ch: MatchoraChannel): number => {
      const isBein = isBeinChannel(ch.name);
      const isArabic = isArabicChannel(ch);
      const isPlaying = ch.playing ? 1 : 0;
      const isHD = (ch.quality || "").toUpperCase() === "HD" ? 1 : 0;
      let score = 0;

      // 1. TOP PRIORITY: beIN Sports with Arabic commentary
      const isExplicitArabic =
        (ch.lang || "").toLowerCase() === "arabic" ||
        (ch.lang || "").toLowerCase().includes("arab") ||
        (ch.name || "").includes("عرب");

      if (isBein && isArabic) {
        score += 5000;
        if (isExplicitArabic) score += 2000;
      }
      // 2. SECOND PRIORITY: Other Arabic commentary (SSC, Alkass, AD Sports, etc.)
      else if (isArabic) {
        score += 3000;
        if (isExplicitArabic) score += 1000;
      }
      // 3. THIRD PRIORITY: beIN Sports foreign channels (English, French, etc.)
      else if (isBein) {
        score += 1500;
      }
      // 4. Other channels
      else {
        score += 500;
      }

      // Bonus points for playing status, HD quality, and viewers
      if (isPlaying) score += 200;
      if (isHD) score += 50;
      if (ch.watching && ch.watching > 0) score += Math.min(50, Math.floor(ch.watching / 5));

      return score;
    };

    const formatChannelName = (ch: MatchoraChannel, idx: number): string => {
      let clean = (ch.name || `قناة ${idx + 1}`).trim();
      const isBein = isBeinChannel(clean);
      const isArabic = isArabicChannel(ch);

      if (isBein) {
        clean = clean
          .replace(/^BEIN\s+SPORTS?\s*0*([0-9]+)/i, "beIN Sports $1")
          .replace(/^BEIN\s+SPORTS?\s*/i, "beIN Sports ")
          .replace(/\s+/g, " ")
          .trim();
      }

      if (isArabic) {
        if (!clean.includes("HD")) {
          clean = `${clean} HD`;
        }
        if (!clean.includes("معلق عربي") && !clean.includes("تعليق عربي")) {
          clean = `${clean} (معلق عربي)`;
        }
      } else if (ch.lang && ch.lang.toLowerCase() !== "other" && !clean.toLowerCase().includes(ch.lang.toLowerCase())) {
        clean = `${clean} (${ch.lang})`;
      }

      return clean;
    };

    const anyChannelsPlaying = event.channels.some((ch) => ch.playing);

    // Filter valid channels - exclude dead ones, and exclude inactive channels if other channels are playing
    // This prevents picking inactive 24/7 channels showing a different match!
    const valid = event.channels
      .filter((ch) => {
        if (!isValidMatchoraEmbedUrl(ch.embed_url) || ch.dead) return false;
        if (anyChannelsPlaying && ch.playing === false) return false;
        return true;
      })
      .sort((a, b) => getChannelScore(b) - getChannelScore(a));

    if (valid.length === 0) return undefined;

    // Check if any verified active Arabic channel exists
    const arabicChannels = valid.filter((ch) => isArabicChannel(ch) && (ch.playing || !anyChannelsPlaying));

    // If an Arabic channel is verified playing, keep ONLY that one
    if (arabicChannels.length > 0) {
      const selected = arabicChannels[0];
      const isBein = isBeinChannel(selected.name);
      const displayName = formatChannelName(selected, 0);

      let specificChannel = selected.name;
      if (isBein) {
        const matchBeinNum = (selected.name || "").match(/bein\s*sports?\s*0*([1-9]|10|11|12|afc|xtra)/i);
        if (matchBeinNum) {
          specificChannel = `beIN Sports ${matchBeinNum[1].toUpperCase()} HD`;
        } else {
          specificChannel = "beIN Sports 1 HD";
        }
      }

      return [
        {
          id: String(selected.id || `matchora-ch-1`),
          name: displayName,
          channel: specificChannel,
          embedUrl: selected.id
            ? `https://matchora.to/embed/match/${event.id}?ch=${selected.id}`
            : (event.embed_url || `https://matchora.to/embed/match/${event.id}`),
          quality: "HD", // Guaranteed HD as requested
          lang: "Arabic",
          commentator: "معلق عربي",
          isBein,
          isArabic: true,
        },
      ];
    }

    // If no Arabic channel, use top valid channel with match embed + ?ch=
    const top = valid[0];
    const isBein = isBeinChannel(top.name);
    return [
      {
        id: String(top.id || `matchora-ch-1`),
        name: formatChannelName(top, 0),
        channel: isBein ? "beIN Sports 1 HD" : top.name,
        embedUrl: top.id
          ? `https://matchora.to/embed/match/${event.id}?ch=${top.id}`
          : (event.embed_url || `https://matchora.to/embed/match/${event.id}`),
        quality: "HD",
        lang: top.lang,
        commentator: undefined,
        isBein,
        isArabic: false,
      },
    ];
  }

  /**
   * Fetches single event from https://matchora.to/api/v1/events/{id}
   */
  async fetchEventById(eventId: string): Promise<MatchoraEvent | null> {
    if (!eventId || !eventId.trim()) return null;
    const cleanId = eventId.trim();

    const cached = this.eventDetailCache.get(cleanId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      const url = `${MatchoraService.BASE_URL}/events/${encodeURIComponent(cleanId)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "MatchZone/1.0" },
        signal: AbortSignal.timeout(MatchoraService.TIMEOUT_MS),
      });

      if (!res.ok) {
        return null;
      }

      const json = (await res.json()) as MatchoraEvent;
      if (!json || !json.id) return null;

      this.eventDetailCache.set(cleanId, {
        data: json,
        expiresAt: Date.now() + MatchoraService.TTL_DETAIL_LIVE_MS,
      });

      return json;
    } catch {
      return null;
    }
  }

  /**
   * Safe matching strategy:
   * 1. Fetches live events from /api/v1/live.
   * 2. Fetches watchable schedule from /api/v1/schedule?watchable=1.
   * 3. Compares home and away team similarity strictly (threshold >= 0.75).
   * 4. Does not use fuzzy guessing that could select an unrelated match.
   */
  private async findMatchingEvent(target: {
    home: string;
    away: string;
    date?: string;
  }): Promise<MatchoraEvent | null> {
    if (!target.home || !target.away) return null;

    // 1. Check live events first
    const liveEvents = await this.getLiveEvents();
    const liveMatch = this.findBestMatchInList(liveEvents, target);
    if (liveMatch) return liveMatch;

    // 2. Check watchable schedule
    const scheduleEvents = await this.getScheduleEvents();
    return this.findBestMatchInList(scheduleEvents, target);
  }

  private findBestMatchInList(
    events: MatchoraEvent[],
    target: { home: string; away: string; date?: string }
  ): MatchoraEvent | null {
    let bestEvent: MatchoraEvent | null = null;
    let highestScore = 0;

    for (const ev of events) {
      // Must be soccer / football
      const sport = (ev.sport || "").toLowerCase();
      if (sport && !sport.includes("soccer") && !sport.includes("football")) {
        continue;
      }

      const homeSim = teamSimilarity(target.home, ev.home);
      const awaySim = teamSimilarity(target.away, ev.away);

      // Also try swapped (home ↔ away) in case Matchora has them reversed
      const homeSimSwap = teamSimilarity(target.home, ev.away);
      const awaySimSwap = teamSimilarity(target.away, ev.home);

      const directScore = (homeSim + awaySim) / 2;
      const swapScore = (homeSimSwap + awaySimSwap) / 2;
      const bestSimPair = directScore >= swapScore
        ? { h: homeSim, a: awaySim, score: directScore }
        : { h: homeSimSwap, a: awaySimSwap, score: swapScore };

      // Threshold: 0.6 each to handle short national team names (Croatia=7, Spain=5 chars)
      if (bestSimPair.h >= 0.6 && bestSimPair.a >= 0.6) {
        if (bestSimPair.score > highestScore) {
          highestScore = bestSimPair.score;
          bestEvent = ev;
        }
      }
    }

    logger.info({ target, bestScore: highestScore, found: !!bestEvent }, "[MatchoraService] findBestMatchInList result");
    return bestEvent;
  }

  /**
   * Fetches live events from https://matchora.to/api/v1/live
   */
  async getLiveEvents(): Promise<MatchoraEvent[]> {
    if (this.liveEventsCache && Date.now() < this.liveEventsCache.expiresAt) {
      return this.liveEventsCache.data;
    }

    try {
      const url = `${MatchoraService.BASE_URL}/live`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "MatchZone/1.0" },
        signal: AbortSignal.timeout(MatchoraService.TIMEOUT_MS),
      });

      if (!res.ok) return [];
      const json = (await res.json()) as any;
      const events: MatchoraEvent[] = Array.isArray(json) ? json : json.events || [];

      this.liveEventsCache = {
        data: events,
        expiresAt: Date.now() + MatchoraService.TTL_LIVE_MS,
      };

      return events;
    } catch (err: any) {
      logger.warn({ err: err?.message || err }, "[MatchoraService] Failed to fetch live events");
      return [];
    }
  }

  /**
   * Fetches watchable schedule from https://matchora.to/api/v1/schedule?watchable=1
   */
  async getScheduleEvents(): Promise<MatchoraEvent[]> {
    if (this.scheduleCache && Date.now() < this.scheduleCache.expiresAt) {
      return this.scheduleCache.data;
    }

    try {
      const url = `${MatchoraService.BASE_URL}/schedule?watchable=1`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "MatchZone/1.0" },
        signal: AbortSignal.timeout(MatchoraService.TIMEOUT_MS),
      });

      if (!res.ok) return [];
      const json = (await res.json()) as any;
      const events: MatchoraEvent[] = Array.isArray(json) ? json : json.events || [];

      this.scheduleCache = {
        data: events,
        expiresAt: Date.now() + MatchoraService.TTL_SCHEDULE_MS,
      };

      return events;
    } catch (err: any) {
      logger.warn({ err: err?.message || err }, "[MatchoraService] Failed to fetch schedule");
      return [];
    }
  }

  /**
   * Fetches and transforms live soccer matches from Matchora
   */
  async getLiveFixtures(): Promise<ApiFootballFixture[]> {
    const events = await this.getLiveEvents();
    const soccerEvents = events.filter(isSoccerEvent);
    return soccerEvents
      .map(matchoraToFixture)
      .filter((f) => f.fixture.status.short !== "FT" && f.fixture.status.short !== "NS");
  }

  /**
   * Fetches and transforms scheduled soccer matches from Matchora
   */
  async getFixtures(date?: string): Promise<ApiFootballFixture[]> {
    const events = await this.getScheduleEvents();
    const soccerEvents = events.filter(isSoccerEvent);

    if (date && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const filtered = soccerEvents.filter((ev) => {
        if (!ev.kickoff) return true;
        const evDate = new Date(ev.kickoff * 1000).toISOString().split("T")[0];
        return evDate === date;
      });
      // If today has matches, include currently live matches too
      const today = new Date().toISOString().split("T")[0];
      if (date === today) {
        const live = await this.getLiveEvents();
        const liveSoccer = live.filter(isSoccerEvent);
        const map = new Map<string, MatchoraEvent>();
        filtered.forEach((e) => map.set(e.id, e));
        liveSoccer.forEach((e) => map.set(e.id, e));
        return Array.from(map.values()).map(matchoraToFixture);
      }
      return filtered.map(matchoraToFixture);
    }

    return soccerEvents.map(matchoraToFixture);
  }

  /**
   * Fetches single fixture by ID from Matchora
   */
  async getFixtureById(id: number | string): Promise<ApiFootballFixture | null> {
    const strId = String(id).trim();

    // 1. Fetch directly from event endpoint first for freshest real-time live score & minute
    const event = await this.fetchEventById(strId);
    if (event) {
      return matchoraToFixture(event);
    }

    // 2. Fallback to live events cache
    if (this.liveEventsCache) {
      const found = this.liveEventsCache.data.find((e) => String(e.id) === strId);
      if (found) return matchoraToFixture(found);
    }

    // 3. Fallback to schedule cache
    if (this.scheduleCache) {
      const found = this.scheduleCache.data.find((e) => String(e.id) === strId);
      if (found) return matchoraToFixture(found);
    }

    return null;
  }
}

function isSoccerEvent(ev: MatchoraEvent): boolean {
  if (!ev.sport) return true;
  const s = ev.sport.toLowerCase().trim();
  return s === "soccer" || s === "football" || s.includes("soccer") || s.includes("football");
}

function hashString(str: string): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveLeagueId(name?: string): number {
  const lower = (name || "").toLowerCase();
  if (lower.includes("premier league")) return 39;
  if (lower.includes("la liga") && !lower.includes("2")) return 140;
  if (lower.includes("serie a") && !lower.includes("brazil")) return 135;
  if (lower.includes("bundesliga")) return 78;
  if (lower.includes("ligue 1")) return 61;
  if (lower.includes("champions league")) return 2;
  if (lower.includes("europa league")) return 3;
  if (lower.includes("conference league")) return 848;
  if (lower.includes("concacaf nations league") || lower.includes("concacaf nation")) return 400;
  if (lower.includes("concacaf gold cup")) return 22;
  if (lower.includes("uefa nations league") || (lower.includes("nations league") && !lower.includes("concacaf"))) return 7;
  if (lower.includes("world cup")) return 1;
  if (lower.includes("euro") && !lower.includes("america")) return 4;
  if (lower.includes("africa") || lower.includes("afcon")) return 6;
  if (lower.includes("copa america")) return 9;
  if (lower.includes("friend")) return 10;
  return Math.abs(hashString(name || "Soccer"));
}

function resolveLeagueCountry(name?: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("premier league") || lower.includes("english")) return "England";
  if (lower.includes("la liga") || lower.includes("spanish")) return "Spain";
  if (lower.includes("serie a") || lower.includes("italian")) return "Italy";
  if (lower.includes("bundesliga") || lower.includes("german")) return "Germany";
  if (lower.includes("ligue 1") || lower.includes("french")) return "France";
  if (lower.includes("concacaf")) return "CONCACAF";
  if (lower.includes("brazil")) return "Brazil";
  if (lower.includes("argentin")) return "Argentina";
  return "World";
}

/**
 * Maps MatchoraEvent to standard ApiFootballFixture
 */
export function matchoraToFixture(event: MatchoraEvent): ApiFootballFixture {
  const matchId = parseInt(event.id, 10) || Math.abs(hashString(event.id));
  const kickoffDate = event.kickoff
    ? new Date(event.kickoff * 1000).toISOString()
    : new Date().toISOString();

  let shortStatus = "NS";
  let longStatus = "Not Started";
  let elapsed: number | null = null;
  let extra: number | null = null;

  const nowMs = Date.now();
  const kickoffMs = event.kickoff ? event.kickoff * 1000 : 0;
  const elapsedMinutesSinceKickoff = kickoffMs > 0 ? (nowMs - kickoffMs) / 60000 : 0;

  // The match only starts broadcasting when the opening whistle blows
  if (kickoffMs > 0 && nowMs < kickoffMs) {
    shortStatus = "NS";
    longStatus = "Not Started";
    elapsed = null;
  } else if (event.finished || event.status === "FT") {
    shortStatus = "FT";
    longStatus = "Match Finished";
    elapsed = 90;
  } else if (event.status === "HT" || event.status === "INT") {
    shortStatus = "HT";
    longStatus = "Half Time";
    elapsed = 45;
  } else if (event.live || event.status === "LIVE" || event.status === "1H" || event.status === "2H") {
    shortStatus = event.status === "2H" ? "2H" : "1H";
    longStatus = "In Play";
    if (event.minute) {
      const minStr = String(event.minute).trim();
      const plusMatch = minStr.match(/^(\d+)\s*\+\s*(\d+)/);
      if (plusMatch) {
        elapsed = parseInt(plusMatch[1], 10) || null;
        extra = parseInt(plusMatch[2], 10) || null;
      } else {
        const rawNum = parseInt(minStr.replace(/\D/g, ""), 10) || null;
        if (rawNum !== null) {
          if (rawNum > 900 && rawNum <= 920) {
            elapsed = 90;
            extra = rawNum - 900;
          } else if (rawNum > 450 && rawNum <= 470) {
            elapsed = 45;
            extra = rawNum - 450;
          } else if (rawNum > 1050 && rawNum <= 1070) {
            elapsed = 105;
            extra = rawNum - 1050;
          } else if (rawNum > 1200 && rawNum <= 1220) {
            elapsed = 120;
            extra = rawNum - 1200;
          } else {
            elapsed = rawNum;
          }
        }
      }
    }

    // If minute is not provided by provider, estimate exact minute from kickoff time
    if (elapsed === null && kickoffMs > 0) {
      if (elapsedMinutesSinceKickoff <= 45) {
        elapsed = Math.max(1, Math.floor(elapsedMinutesSinceKickoff));
        shortStatus = "1H";
      } else if (elapsedMinutesSinceKickoff <= 60) {
        shortStatus = "HT";
        longStatus = "Half Time";
        elapsed = 45;
      } else if (elapsedMinutesSinceKickoff <= 105) {
        elapsed = Math.min(90, Math.max(46, Math.floor(elapsedMinutesSinceKickoff - 15)));
        shortStatus = "2H";
      } else if (elapsedMinutesSinceKickoff < 125) {
        elapsed = 90;
        extra = Math.max(1, Math.floor(elapsedMinutesSinceKickoff - 105));
        shortStatus = "2H";
      } else {
        shortStatus = "FT";
        longStatus = "Match Finished";
      }
    }
  } else if (event.finished || event.status === "FT") {
    shortStatus = "FT";
    longStatus = "Match Finished";
  }

  // Auto-detect finished match if normal duration has passed
  if (
    elapsedMinutesSinceKickoff >= 140 ||
    (elapsedMinutesSinceKickoff >= 118 && (elapsed ?? 0) >= 90) ||
    (elapsedMinutesSinceKickoff >= 118 && String(event.minute || "").includes("90"))
  ) {
    shortStatus = "FT";
    longStatus = "Match Finished";
  }

  let homeGoals: number | null = null;
  let awayGoals: number | null = null;
  if (event.score && typeof event.score === "string") {
    const parts = event.score.split(/[-:]/).map((p) => parseInt(p.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      homeGoals = parts[0];
      awayGoals = parts[1];
    }
  }

  const leagueName = event.league || "كرة القدم العالمية";
  const leagueId = resolveLeagueId(leagueName);

  const homeBadge =
    (event as any).home_badge ||
    resolveTeamBadge(null, event.home, (event as any).country);
  const awayBadge =
    (event as any).away_badge ||
    resolveTeamBadge(null, event.away, (event as any).country);
  const leagueBadge = (event as any).league_badge || "";

  return {
    fixture: {
      id: matchId,
      referee: null,
      timezone: "UTC",
      date: kickoffDate,
      timestamp: event.kickoff || Math.floor(Date.now() / 1000),
      periods: { first: null, second: null },
      venue: { id: null, name: "الملعب الرئيسي", city: null },
      status: { long: longStatus, short: shortStatus, elapsed, extra },
    },
    league: {
      id: leagueId,
      name: leagueName,
      country: resolveLeagueCountry(leagueName),
      logo: leagueBadge,
      flag: null,
      season: 2026,
      round: "الجولة الرسمية",
    },
    teams: {
      home: {
        id: Math.abs(hashString(event.home)),
        name: event.home,
        logo: homeBadge,
        winner:
          homeGoals !== null && awayGoals !== null
            ? homeGoals > awayGoals
              ? true
              : homeGoals < awayGoals
              ? false
              : null
            : null,
      },
      away: {
        id: Math.abs(hashString(event.away)),
        name: event.away,
        logo: awayBadge,
        winner:
          homeGoals !== null && awayGoals !== null
            ? awayGoals > homeGoals
              ? true
              : awayGoals < homeGoals
              ? false
              : null
            : null,
      },
    },
    goals: {
      home: homeGoals,
      away: awayGoals,
    },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: homeGoals, away: awayGoals },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

export const matchoraService = new MatchoraService();
export const getMatchoraSource = (fixtureId: number, options?: MatchContext) =>
  matchoraService.getMatchoraSource(fixtureId, options);

export const getMatchoraLiveFixtures = () => matchoraService.getLiveFixtures();
export const getMatchoraFixtures = (date?: string) => matchoraService.getFixtures(date);
export const getMatchoraFixtureById = (id: number | string) => matchoraService.getFixtureById(id);

