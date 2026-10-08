import { env } from "../config/env";
import { logger } from "../lib/logger";

const BASE_URL = "https://v3.football.api-sports.io";

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Cache TTL configurations — increased to protect 100 req/day free plan quota
const TTL_LIVE_MS = 2 * 60 * 1000;         // 2m  for live matches
const TTL_FIXTURES_MS = 60 * 60 * 1000;    // 1h  for daily fixtures
const TTL_EVENTS_MS = 3 * 60 * 1000;       // 3m  for live events
const TTL_LINEUPS_MS = 30 * 60 * 1000;     // 30m for lineups
const TTL_STATS_MS = 5 * 60 * 1000;        // 5m  for live stats
const TTL_STANDINGS_MS = 6 * 60 * 60 * 1000; // 6h for standings

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

/**
 * Execute API-Football request with secure server-side header and caching
 */
async function apiFootballFetch<T>(endpoint: string, ttlMs: number): Promise<T> {
  const apiKey = env.apiFootballKey || process.env.API_FOOTBALL_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_api_football_key_here") {
    throw new ApiFootballError(
      "API_FOOTBALL_KEY is not configured on the server. Please add your API key from https://dashboard.api-football.com to artifacts/api-server/.env",
      401,
      "CONFIG_ERROR"
    );
  }

  const cacheKey = endpoint;
  const cached = getFromCache<T>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey.trim(),
      Accept: "application/json",
    },
  });

  const remaining = response.headers.get("x-ratelimit-requests-remaining");
  if (remaining && parseInt(remaining, 10) < 15) {
    logger.warn({ remaining }, "API-Football daily requests running low");
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new ApiFootballError(
        "API-Football rate limit exceeded. Please try again shortly.",
        429,
        "RATE_LIMIT"
      );
    }
    throw new ApiFootballError(
      `API-Football request failed with HTTP ${response.status}`,
      response.status,
      "API_ERROR"
    );
  }

  const json = (await response.json()) as any;

  // Check API-Football response error envelope
  if (json.errors) {
    const errorMessages = Array.isArray(json.errors)
      ? json.errors
      : Object.values(json.errors);
    if (errorMessages.length > 0) {
      const errStr = errorMessages.join(", ");
      if (
        errStr.includes("token") ||
        errStr.includes("key") ||
        errStr.includes("API key") ||
        errStr.includes("suspended") ||
        errStr.includes("access") ||
        errStr.includes("account") ||
        errStr.includes("Account")
      ) {
        throw new ApiFootballError(
          `API-Football account or key error: ${errStr}`,
          401,
          "AUTH_ERROR"
        );
      }
      if (errStr.includes("rate") || errStr.includes("Requests")) {
        throw new ApiFootballError(
          `API-Football limit reached: ${errStr}`,
          429,
          "RATE_LIMIT"
        );
      }
      throw new ApiFootballError(
        `API-Football error: ${errStr}`,
        400,
        "API_ERROR"
      );
    }
  }

  const data = json.response as T;
  setInCache(cacheKey, data, ttlMs);
  return data;
}

export class ApiFootballError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code: string = "INTERNAL"
  ) {
    super(message);
    this.name = "ApiFootballError";
  }
}

export interface ApiFootballFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: { first: number | null; second: number | null };
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: string; elapsed: number | null; extra?: number | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  events?: ApiFootballEvent[];
  lineups?: any[];
  statistics?: any[];
}

export interface ApiFootballEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string; // "Goal" | "Card" | "subst" | "Var"
  detail: string; // "Normal Goal" | "Yellow Card" | "Substitution 1" | etc.
  comments: string | null;
}

export interface ApiFootballLineup {
  team: {
    id: number;
    name: string;
    logo: string;
    colors?: any;
  };
  coach: { id: number | null; name: string | null; photo: string | null };
  formation: string | null;
  startXI: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      pos: string;
      grid: string | null;
    };
  }>;
  substitutes: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      pos: string;
      grid: string | null;
    };
  }>;
}

export interface ApiFootballStatistic {
  team: { id: number; name: string; logo: string };
  statistics: Array<{ type: string; value: string | number | null }>;
}

export interface ApiFootballStanding {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season: number;
    standings: Array<
      Array<{
        rank: number;
        team: { id: number; name: string; logo: string };
        points: number;
        goalsDiff: number;
        group?: string;
        form?: string;
        status?: string;
        all: {
          played: number;
          win: number;
          draw: number;
          lose: number;
          goals: { for: number; against: number };
        };
      }>
    >;
  };
}

/**
 * TASK 3: Real currently live matches from API-Football
 */
export async function getLiveFixtures(): Promise<ApiFootballFixture[]> {
  return apiFootballFetch<ApiFootballFixture[]>("/fixtures?live=all", TTL_LIVE_MS);
}

/**
 * TASK 2: Real fixtures for a specific date (YYYY-MM-DD)
 */
export async function getFixturesByDate(date: string): Promise<ApiFootballFixture[]> {
  return apiFootballFetch<ApiFootballFixture[]>(`/fixtures?date=${date}`, TTL_FIXTURES_MS);
}

/**
 * Real fixtures for a specific competition and season (e.g. GET /fixtures?league=39&season=2026)
 */
export async function getFixturesByLeagueAndSeason(
  leagueId: number,
  season: number = new Date().getFullYear()
): Promise<ApiFootballFixture[]> {
  return apiFootballFetch<ApiFootballFixture[]>(
    `/fixtures?league=${leagueId}&season=${season}`,
    TTL_FIXTURES_MS
  );
}

/**
 * TASK 4: Real fixture by ID with detailed info
 */
export async function getFixtureById(id: number): Promise<ApiFootballFixture | null> {
  const results = await apiFootballFetch<ApiFootballFixture[]>(
    `/fixtures?id=${id}`,
    TTL_STATS_MS
  );
  return results && results.length > 0 ? results[0] : null;
}

/**
 * Real match events (goals, cards, substitutions)
 */
export async function getFixtureEvents(fixtureId: number): Promise<ApiFootballEvent[]> {
  return apiFootballFetch<ApiFootballEvent[]>(
    `/fixtures/events?fixture=${fixtureId}`,
    TTL_EVENTS_MS
  );
}

/**
 * Real match lineups
 */
export async function getFixtureLineups(fixtureId: number): Promise<ApiFootballLineup[]> {
  return apiFootballFetch<ApiFootballLineup[]>(
    `/fixtures/lineups?fixture=${fixtureId}`,
    TTL_LINEUPS_MS
  );
}

/**
 * Real match statistics (possession, shots, passes, corners, fouls)
 */
export async function getFixtureStatistics(fixtureId: number): Promise<ApiFootballStatistic[]> {
  return apiFootballFetch<ApiFootballStatistic[]>(
    `/fixtures/statistics?fixture=${fixtureId}`,
    TTL_STATS_MS
  );
}

/**
 * Real standings for a competition
 */
export async function getLeagueStandings(
  leagueId: number,
  season: number = new Date().getFullYear()
): Promise<ApiFootballStanding[]> {
  return apiFootballFetch<ApiFootballStanding[]>(
    `/standings?league=${leagueId}&season=${season}`,
    TTL_STANDINGS_MS
  );
}
