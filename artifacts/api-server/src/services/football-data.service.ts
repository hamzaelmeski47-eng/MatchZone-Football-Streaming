import { env } from "../config/env";
import { logger } from "../lib/logger";
import type { ApiFootballFixture } from "./api-football.service";

const BASE_URL = "https://api.football-data.org/v4";

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Cache TTLs to stay well under Football-Data.org free tier (10 req/min)
const TTL_LIVE_MS = 60 * 1000;         // 1 minute for live matches
const TTL_FIXTURES_MS = 15 * 60 * 1000; // 15 minutes for daily fixtures
const TTL_STANDINGS_MS = 60 * 60 * 1000; // 1 hour for standings
const TTL_MATCH_MS = 5 * 60 * 1000;     // 5 minutes for single match

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > entry.ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    cachedAt: Date.now(),
    ttlMs,
  });
}

export class FootballDataError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code: string = "INTERNAL"
  ) {
    super(message);
    this.name = "FootballDataError";
  }
}

export interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";
  matchday?: number;
  stage?: string;
  group?: string | null;
  lastUpdated?: string;
  area?: { id: number; name: string; code: string; flag: string | null };
  competition: { id: number; name: string; code: string; type?: string; emblem?: string };
  season?: { id: number; startDate: string; endDate: string; currentMatchday: number };
  homeTeam: { id: number; name: string; shortName?: string; tla?: string; crest?: string };
  awayTeam: { id: number; name: string; shortName?: string; tla?: string; crest?: string };
  score?: {
    winner?: string | null;
    duration?: string;
    fullTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
  referees?: Array<{ id: number; name: string; type: string; nationality: string }>;
}

async function footballDataFetch<T>(endpoint: string, ttlMs: number): Promise<T> {
  const token = env.footballDataToken || process.env.FOOTBALL_DATA_TOKEN || env.apiFootballKey;
  if (!token || token.trim() === "") {
    throw new FootballDataError(
      "FOOTBALL_DATA_TOKEN is not configured. Add your token from https://www.football-data.org/ to .env",
      401,
      "CONFIG_ERROR"
    );
  }

  const cacheKey = `fd:${endpoint}`;
  const cached = getFromCache<T>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": token.trim(),
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new FootballDataError(
        "Football-Data.org rate limit reached (10 requests/minute). Please wait a few moments.",
        429,
        "RATE_LIMIT"
      );
    }
    if (response.status === 400 || response.status === 403) {
      const errText = await response.text().catch(() => "");
      throw new FootballDataError(
        `Football-Data.org error (${response.status}): ${errText}`,
        response.status,
        "API_ERROR"
      );
    }
    throw new FootballDataError(
      `Football-Data.org request failed with status ${response.status}`,
      response.status,
      "REQUEST_FAILED"
    );
  }

  const data = (await response.json()) as T;
  setInCache(cacheKey, data, ttlMs);
  return data;
}

export function transformFootballDataToFixture(m: FootballDataMatch): ApiFootballFixture {
  const isFinished = m.status === "FINISHED" || m.status === "AWARDED";
  const isLive = m.status === "IN_PLAY" || m.status === "PAUSED";
  const shortStatus = isLive ? (m.status === "PAUSED" ? "HT" : "2H") : isFinished ? "FT" : "NS";
  const longStatus = isLive ? "In Play" : isFinished ? "Match Finished" : "Not Started";

  return {
    fixture: {
      id: m.id,
      referee: m.referees?.[0]?.name || null,
      timezone: "UTC",
      date: m.utcDate,
      timestamp: Math.floor(new Date(m.utcDate).getTime() / 1000),
      periods: { first: null, second: null },
      venue: { id: null, name: null, city: null },
      status: {
        long: longStatus,
        short: shortStatus,
        elapsed: isLive ? 60 : isFinished ? 90 : null,
      },
    },
    league: {
      id: m.competition.id,
      name: m.competition.name,
      country: m.area?.name || "International",
      logo: m.competition.emblem || "https://crests.football-data.org/PL.png",
      flag: m.area?.flag || null,
      season: m.season?.startDate ? parseInt(m.season.startDate.split("-")[0], 10) : 2026,
      round: m.stage || (m.matchday ? `Matchday ${m.matchday}` : "Regular Season"),
    },
    teams: {
      home: {
        id: m.homeTeam.id,
        name: m.homeTeam.name,
        logo: m.homeTeam.crest || "",
        winner: m.score?.winner === "HOME_TEAM" ? true : m.score?.winner === "AWAY_TEAM" ? false : null,
      },
      away: {
        id: m.awayTeam.id,
        name: m.awayTeam.name,
        logo: m.awayTeam.crest || "",
        winner: m.score?.winner === "AWAY_TEAM" ? true : m.score?.winner === "HOME_TEAM" ? false : null,
      },
    },
    goals: {
      home: m.score?.fullTime?.home ?? (isLive ? m.score?.halfTime?.home ?? 0 : null),
      away: m.score?.fullTime?.away ?? (isLive ? m.score?.halfTime?.away ?? 0 : null),
    },
    score: {
      halftime: {
        home: m.score?.halfTime?.home ?? null,
        away: m.score?.halfTime?.away ?? null,
      },
      fulltime: {
        home: m.score?.fullTime?.home ?? null,
        away: m.score?.fullTime?.away ?? null,
      },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

/**
 * Fetch live matches from Football-Data.org
 */
export async function getFootballDataLiveFixtures(): Promise<ApiFootballFixture[]> {
  try {
    const res = await footballDataFetch<{ matches: FootballDataMatch[] }>(
      "/matches?status=IN_PLAY,PAUSED",
      TTL_LIVE_MS
    );
    return (res.matches || []).map(transformFootballDataToFixture);
  } catch (err: any) {
    logger.warn({ error: err.message }, "Failed to fetch live matches from Football-Data.org");
    return [];
  }
}

/**
 * Fetch matches for a specific date (or window around it) from Football-Data.org
 */
export async function getFootballDataFixturesByDate(dateStr: string): Promise<ApiFootballFixture[]> {
  try {
    // Football-Data.org allows dateFrom and dateTo
    const res = await footballDataFetch<{ matches: FootballDataMatch[] }>(
      `/matches?dateFrom=${dateStr}&dateTo=${dateStr}`,
      TTL_FIXTURES_MS
    );
    return (res.matches || []).map(transformFootballDataToFixture);
  } catch (err: any) {
    logger.warn({ error: err.message, date: dateStr }, "Failed to fetch date fixtures from Football-Data.org");
    throw err;
  }
}

/**
 * Fetch a multi-day window (e.g. today +- 2 days) to guarantee a rich match dashboard
 */
export async function getFootballDataRecentMatches(): Promise<ApiFootballFixture[]> {
  try {
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - 2);
    const future = new Date(today);
    future.setDate(future.getDate() + 2);

    const dateFrom = past.toISOString().split("T")[0];
    const dateTo = future.toISOString().split("T")[0];

    const res = await footballDataFetch<{ matches: FootballDataMatch[] }>(
      `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      TTL_FIXTURES_MS
    );
    return (res.matches || []).map(transformFootballDataToFixture);
  } catch (err: any) {
    logger.warn({ error: err.message }, "Failed to fetch recent matches window from Football-Data.org");
    return [];
  }
}

/**
 * Fetch single match by ID
 */
export async function getFootballDataMatchById(id: number): Promise<ApiFootballFixture | null> {
  try {
    const res = await footballDataFetch<FootballDataMatch>(`/matches/${id}`, TTL_MATCH_MS);
    return res ? transformFootballDataToFixture(res) : null;
  } catch (err: any) {
    logger.warn({ error: err.message, id }, "Failed to fetch match from Football-Data.org");
    return null;
  }
}

/**
 * Fetch standings for competition
 */
export async function getFootballDataStandings(compId: string | number): Promise<any[]> {
  try {
    const res = await footballDataFetch<any>(`/competitions/${compId}/standings`, TTL_STANDINGS_MS);
    if (!res?.standings) return [];
    
    // Map to API-Football format expected by client
    return [
      {
        league: {
          id: res.competition?.id,
          name: res.competition?.name,
          country: res.area?.name,
          logo: res.competition?.emblem,
          season: res.season?.startDate?.split("-")[0] || 2026,
          standings: res.standings.map((group: any) =>
            (group.table || []).map((row: any) => ({
              rank: row.position,
              team: {
                id: row.team.id,
                name: row.team.name,
                logo: row.team.crest,
              },
              points: row.points,
              goalsDiff: row.goalDifference,
              form: row.form,
              all: {
                played: row.playedGames,
                win: row.won,
                draw: row.draw,
                lose: row.lost,
                goals: { for: row.goalsFor, against: row.goalsAgainst },
              },
            }))
          ),
        },
      },
    ];
  } catch (err: any) {
    logger.warn({ error: err.message, compId }, "Failed to fetch standings from Football-Data.org");
    return [];
  }
}
