import type { Competition, Match, Team } from './mock-data';

const API_BASE = '/api';
const TOKEN_KEY = 'matchzone-token';
const USER_KEY = 'matchzone-user';

export type ApiUser = {
  id: number;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  avatarUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiMatch = {
  id: number;
  status: Match['status'];
  startTime: string;
  minute: string | null;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  competitionId: number;
  competitionName: string;
  competitionSlug: string;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamShortName: string;
  homeTeamLogoUrl: string | null;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamShortName: string;
  awayTeamLogoUrl: string | null;
};

type ApiTeam = {
  id: number;
  name: string;
  short_name: string;
  slug: string;
  country: string | null;
  logo_url: string | null;
};

type ApiCompetition = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  logo_url: string | null;
};

type ApiFavorite = {
  entity_type: 'match' | 'team' | 'competition';
  entity_id: number;
};

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): ApiUser | null {
  try {
    const value = window.localStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function clearStoredAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError('The MatchZone API is unavailable.');
  }

  const body = await response.json().catch(() => null) as
    | { message?: string; error?: string }
    | null;
  if (!response.ok) {
    throw new ApiRequestError(
      body?.message ?? body?.error ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body as T;
}

function colorForIndex(index: number) {
  return ['#dd274b', '#62b7e8', '#d7dbe5', '#e04563', '#d51f3f', '#4e8ed9', '#6e7dcc', '#d63e43', '#e5c82b', '#5b9bd7'][index % 10];
}

function formatMatchDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, tomorrow)) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

function formatMatchTime(value: string, status: Match['status']) {
  if (status === 'live') return 'Live';
  if (status === 'finished') return 'FT';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

function normalizeTeam(team: ApiTeam, index: number): Team {
  return {
    id: String(team.id),
    name: team.name,
    short: team.short_name,
    country: team.country ?? 'International',
    color: colorForIndex(index),
  };
}

function normalizeCompetition(competition: ApiCompetition, matches: ApiMatch[], index: number): Competition {
  return {
    id: String(competition.id),
    name: competition.name,
    short: competition.name.slice(0, 3).toUpperCase(),
    country: competition.country ?? 'International',
    matches: matches.filter((match) => match.competitionId === competition.id).length,
    accent: ['#b7ff4a', '#a888ff', '#ff815c', '#ff5571', '#50bde8', '#ffca57'][index % 6],
  };
}

function normalizeMatch(match: ApiMatch): Match {
  return {
    id: String(match.id),
    competitionId: String(match.competitionId),
    home: String(match.homeTeamId),
    away: String(match.awayTeamId),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    time: formatMatchTime(match.startTime, match.status),
    date: formatMatchDate(match.startTime),
    venue: match.venue ?? 'Venue to be confirmed',
    minute: match.minute ?? undefined,
  };
}

export async function loadRemoteData() {
  const [{ matches }, { teams }, { competitions }] = await Promise.all([
    request<{ matches: ApiMatch[] }>('/matches'),
    request<{ teams: ApiTeam[] }>('/teams'),
    request<{ competitions: ApiCompetition[] }>('/competitions'),
  ]);

  return {
    matches: matches.map(normalizeMatch),
    teams: teams.map(normalizeTeam),
    competitions: competitions.map((competition, index) => normalizeCompetition(competition, matches, index)),
  };
}

export async function login(email: string, password: string) {
  return request<{ user: ApiUser; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string, displayName: string) {
  return request<{ user: ApiUser; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function getCurrentUser() {
  return request<{ user: ApiUser }>('/auth/me');
}

export async function updateCurrentUser(displayName: string) {
  return request<{ user: ApiUser }>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
}

export async function loadFavoriteMatchIds() {
  const { favorites } = await request<{ favorites: ApiFavorite[] }>('/favorites?entityType=match');
  return favorites.map((favorite) => String(favorite.entity_id));
}

export async function addFavoriteMatch(matchId: string) {
  await request('/favorites', {
    method: 'POST',
    body: JSON.stringify({ entityType: 'match', entityId: Number(matchId) }),
  });
}

export async function removeFavoriteMatch(matchId: string) {
  await request(`/favorites/match/${Number(matchId)}`, { method: 'DELETE' });
}

export function saveAuth(token: string, user: ApiUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}