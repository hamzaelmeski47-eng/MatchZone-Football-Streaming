import type { Competition, Match, Team } from './mock-data';
import { SUPPORTED_COMPETITIONS } from './competitions.config';
import { getArabicTeamName } from './arabic-helpers';
import { formatCompetitionInfo, normalizeCompetitionName } from './competitions-map';
import { resolveMatchStadium, isBrazilianMatch } from './match-details-helpers';

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

export interface AuthorizedStream {
  id: number;
  match_id: number;
  provider: string;
  stream_url: string;
  stream_type: 'hls' | 'dash' | 'iframe';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ApiFavorite = {
  entity_type: 'match' | 'team' | 'competition';
  entity_id: number;
};

export interface ApiFootballFixtureRaw {
  fixture: {
    id: number;
    referee: string | null;
    date: string;
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: string; elapsed: number | null; extra?: number | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score?: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
  events?: ApiMatchEvent[];
  lineups?: ApiMatchLineup[];
  statistics?: ApiMatchStatistic[];
}

export interface ApiMatchEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string; // "Goal", "Card", "subst", "Var"
  detail: string;
  comments: string | null;
}

export interface ApiMatchLineup {
  team: { id: number; name: string; logo: string };
  coach: { id: number | null; name: string | null; photo: string | null };
  formation: string | null;
  startXI: Array<{
    player: { id: number; name: string; number: number; pos: string; grid: string | null };
  }>;
  substitutes: Array<{
    player: { id: number; name: string; number: number; pos: string; grid: string | null };
  }>;
}

export interface ApiMatchStatistic {
  team: { id: number; name: string; logo: string };
  statistics: Array<{ type: string; value: string | number | null }>;
}

export interface StandingEntry {
  position: number;
  teamId: number;
  teamName: string;
  teamLogo?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  groupName?: string;
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
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

export function saveAuth(token: string, user: ApiUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
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
    throw new ApiRequestError('The MatchZone API is unavailable. Please check backend connection.');
  }

  const body = (await response.json().catch(() => null)) as
    | { message?: string; error?: string; code?: string }
    | null;

  if (!response.ok) {
    throw new ApiRequestError(
      body?.message ?? body?.error ?? `Request failed with status ${response.status}`,
      response.status,
      body?.code
    );
  }

  return body as T;
}

function colorForIndex(index: number) {
  return ['#dd274b', '#62b7e8', '#d7dbe5', '#e04563', '#d51f3f', '#4e8ed9', '#6e7dcc', '#d63e43', '#e5c82b', '#5b9bd7'][
    index % 10
  ];
}

export {
  formatMoroccoMatchDate as formatMatchDate,
  formatMoroccoTime as formatMatchTime,
  formatMoroccoKickoffExact as formatKickoffExact,
  getMoroccoDateOnly,
  getMoroccoLocalDate,
  getMoroccoDaysList,
  isMatchToday,
} from './morocco-time';

import {
  formatMoroccoMatchDate as formatMatchDate,
  formatMoroccoTime as formatMatchTime,
  formatMoroccoKickoffExact as formatKickoffExact,
  getMoroccoDateOnly,
  isMatchToday,
} from './morocco-time';

/**
 * Safely format match minute, handling stoppage time like 90 + 1', 45 + 2',
 * fixing erroneous concatenated strings like "901" -> "90 + 1'",
 * and ensuring clean presentation without inverted RTL issues.
 */
export function formatMatchMinute(minuteOrElapsed?: string | number | null, extra?: number | null): string {
  if (minuteOrElapsed === null || minuteOrElapsed === undefined || minuteOrElapsed === '') {
    return '';
  }

  // If extra is provided explicitly
  if (extra !== null && extra !== undefined && extra > 0) {
    const base = String(minuteOrElapsed).replace(/\D/g, '') || String(minuteOrElapsed);
    return `${base} + ${extra}'`;
  }

  const str = String(minuteOrElapsed).trim();

  // If already like 90+1, 90 + 1, 90'+1', 45+3, etc.
  const plusMatch = str.match(/^(\d+)['’]?\s*\+\s*(\d+)['’]?/);
  if (plusMatch) {
    return `${plusMatch[1]} + ${plusMatch[2]}'`;
  }

  // Strip quotes and punctuation
  const clean = str.replace(/['’‘]/g, '').trim();

  // Fix concatenated stoppage time:
  // e.g. 901 -> 90 + 1', 902 -> 90 + 2', 9010 -> 90 + 10'
  const match90 = clean.match(/^90([1-9]\d?)$/);
  if (match90) {
    return `90 + ${match90[1]}'`;
  }

  // 451 -> 45 + 1', 452 -> 45 + 2'
  const match45 = clean.match(/^45([1-9]\d?)$/);
  if (match45) {
    return `45 + ${match45[1]}'`;
  }

  // 1051 -> 105 + 1', 1201 -> 120 + 1'
  const match105 = clean.match(/^105([1-9]\d?)$/);
  if (match105) {
    return `105 + ${match105[1]}'`;
  }
  const match120 = clean.match(/^120([1-9]\d?)$/);
  if (match120) {
    return `120 + ${match120[1]}'`;
  }

  // Pure digits: 15 -> 15'
  if (/^\d+$/.test(clean)) {
    return `${clean}'`;
  }

  // Non-minute statuses
  if (clean === 'HT' || clean === 'INT' || clean === 'إستراحة' || clean.toLowerCase() === 'half time' || clean.toLowerCase() === 'halftime') {
    return 'إستراحة';
  }

  if (['FT', 'ET', 'PST', 'انتهت'].includes(clean)) {
    return clean === 'FT' ? 'انتهت' : clean;
  }

  if (clean === '1H') {
    return "0'";
  }
  if (clean === '2H') {
    return "46'";
  }
  if (clean === 'LIVE' || clean === 'مباشر' || clean === 'جارية') {
    return "0'";
  }

  return clean.endsWith("'") ? clean : `${clean}'`;
}

export function normalizeApiFootballFixture(f: ApiFootballFixtureRaw): Match {
  let status: Match['status'] = 'upcoming';
  let short = f.fixture.status.short;

  // Auto-detect finished match if normal match duration has passed
  const kickoffMs = f.fixture.date ? new Date(f.fixture.date).getTime() : 0;
  const isFutureKickoff = kickoffMs > 0 && kickoffMs > Date.now();
  const elapsedMinutes = kickoffMs > 0 ? (Date.now() - kickoffMs) / 60000 : 0;
  const elapsedNum = f.fixture.status.elapsed ?? 0;
  if (short !== 'FT' && short !== 'AET' && short !== 'PEN' && short !== 'PST') {
    if (elapsedMinutes >= 140 || (elapsedMinutes >= 118 && elapsedNum >= 90)) {
      short = 'FT';
    }
  }

  // If kickoff is in the future, the starting whistle has NOT blown yet! Strictly upcoming.
  if (isFutureKickoff) {
    status = 'upcoming';
  } else if (['FT', 'AET', 'PEN', 'PST'].includes(short)) {
    status = 'finished';
  } else if (['1H', '2H', 'HT', 'INT', 'ET', 'P', 'LIVE', 'BT'].includes(short)) {
    status = 'live';
  }

  let minuteText: string | undefined = undefined;
  if (status === 'live') {
    const elapsed = f.fixture.status.elapsed;
    const extra = (f.fixture.status as any)?.extra;
    
    if (short === 'HT' || short === 'INT') {
      minuteText = 'إستراحة';
    } else if (elapsed !== null && elapsed !== undefined) {
      minuteText = formatMatchMinute(elapsed, extra);
    } else if (kickoffMs > 0) {
      // Calculate exact live minute from kickoff time starting from minute 0
      const diffMins = Math.max(0, Math.floor(elapsedMinutes));
      if (diffMins <= 45) {
        minuteText = `${diffMins}'`;
      } else if (diffMins <= 60) {
        minuteText = 'إستراحة';
      } else if (diffMins <= 105) {
        const calcMin = Math.min(90, Math.max(46, diffMins - 15));
        minuteText = `${calcMin}'`;
      } else if (diffMins < 125) {
        const calcExtra = Math.max(1, diffMins - 105);
        minuteText = `90 + ${calcExtra}'`;
      } else {
        minuteText = '90 + 5\'';
      }
    } else {
      minuteText = '0\'';
    }
  } else if (status === 'finished') {
    minuteText = 'انتهت';
  }

  let compId = String(f.league.id);
  let compName = f.league.name;
  let compCountry = f.league.country;
  let compLogo = f.league.logo;

  const isBr = isBrazilianMatch(f.teams.home.name, f.teams.away.name);
  if (
    isBr &&
    (compName.toLowerCase().includes('serie a') ||
      compId === '135' ||
      compId === '4' ||
      (compCountry || '').toLowerCase().includes('italy'))
  ) {
    compId = '71';
    compName = 'Campeonato Brasileiro Série A';
    compCountry = 'Brazil';
    compLogo = 'https://media.api-sports.io/football/leagues/71.png';
  }

  const resolvedVenue = resolveMatchStadium({
    venue: f.fixture.venue?.name,
    homeName: f.teams.home.name,
    awayName: f.teams.away.name,
    country: compCountry,
    competitionName: compName,
  });

  return {
    id: String(f.fixture.id),
    competitionId: compId,
    competitionName: compName,
    competitionLogo: compLogo,
    competitionCountry: compCountry,
    round: f.league.round,
    home: String(f.teams.home.id),
    homeName: f.teams.home.name,
    homeLogo: f.teams.home.logo,
    away: String(f.teams.away.id),
    awayName: f.teams.away.name,
    awayLogo: f.teams.away.logo,
    homeScore: f.goals.home ?? 0,
    awayScore: f.goals.away ?? 0,
    status,
    time: formatMatchTime(f.fixture.date, status),
    kickoffTime: formatKickoffExact(f.fixture.date),
    rawDate: f.fixture.date,
    date: formatMatchDate(f.fixture.date),
    venue: resolvedVenue,
    minute: minuteText,
  };
}

const MAJOR_LEAGUE_IDS = new Set([
  39, 140, 135, 78, 61, 2, 3, 848, 531, 1, 29, 30, 31, 32, 33, 34, 35, 4, 5, 7, 6, 36, 9, 10, 667, 15, 16, 17, 18, 20, 12, 22, 400, 28,
  200, 201, 307, 308, 309, 233, 234, 305, 306, 301, 302, 202, 186, 533,
  2021, 2014, 2019, 2002, 2015, 2001, 2146, 2000, 2018,
]);

export function isMajorCompetitionRaw(f: ApiFootballFixtureRaw): boolean {
  if (!f || !f.league) return false;

  const name = (f.league.name || '').toLowerCase().trim();
  const country = (f.league.country || '').toLowerCase().trim();
  const home = (f.teams?.home?.name || '').toLowerCase().trim();
  const away = (f.teams?.away?.name || '').toLowerCase().trim();

  // 1. Strictly reject Women, Youth, U-teams, Club Friendlies, Lower divisions
  const isYouthOrLower =
    name.includes('women') || name.includes('féminin') || name.includes('femme') ||
    home.endsWith(' w') || away.endsWith(' w') || home.includes('women') || away.includes('women') ||
    name.includes('club') || // Rejects "Friendlies Clubs"
    /\bu-?1[5-9]\b/i.test(name) || /\bu-?2[0-3]\b/i.test(name) ||
    /\bu-?1[5-9]\b/i.test(home) || /\bu-?2[0-3]\b/i.test(home) ||
    /\bu-?1[5-9]\b/i.test(away) || /\bu-?2[0-3]\b/i.test(away) ||
    name.includes('youth') || name.includes('reserve') || name.includes('2nd') || name.includes('division 2') ||
    name.includes('serie b') || name.includes('serie c') || name.includes('segunda') || name.includes('championship') ||
    name.includes('league one') || name.includes('league two') || name.includes('ligue 2') || name.includes('2. bundesliga');

  if (isYouthOrLower) return false;

  const leagueId = Number(f.league.id);

  // Big 5 exact IDs & strict countries (rejection of Ghana, Bhutan, Peru, etc.)
  if ([39, 2021].includes(leagueId)) return country === 'england' || country === '';
  if ([140, 2014].includes(leagueId)) return country === 'spain' || country === '';
  if ([135, 2019].includes(leagueId)) return country === 'italy' || country === '';
  if ([78, 2002].includes(leagueId)) return country === 'germany' || country === '';
  if ([61, 2015].includes(leagueId)) return country === 'france' || country === '';

  // Big 5 by country AND name
  if (country === 'england' && (name === 'premier league' || name.includes('premier league'))) return true;
  if (country === 'spain' && (name === 'la liga' || name === 'primera división' || name.includes('la liga'))) return true;
  if (country === 'italy' && (name === 'serie a' || name.includes('serie a'))) return true;
  if (country === 'germany' && (name === 'bundesliga' || name.includes('bundesliga'))) return true;
  if (country === 'france' && (name === 'ligue 1' || name.includes('ligue 1'))) return true;

  // Major Arab Leagues & Tournaments
  // Moroccan Botola Pro & Throne Cup
  if (
    leagueId === 200 || leagueId === 201 ||
    country === 'morocco' || country === 'المغرب' ||
    name.includes('botola') || name.includes('المغربي') || name.includes('throne cup') || name.includes('كأس العرش')
  ) return true;

  // Saudi Pro League (Roshn) & King's Cup
  if (
    leagueId === 307 || leagueId === 308 || leagueId === 309 ||
    country === 'saudi arabia' || country === 'السعودية' ||
    name.includes('saudi') || name.includes('roshn') || name.includes('سعودي')
  ) return true;

  // Egyptian Premier League & Egypt Cup
  if (
    leagueId === 233 || leagueId === 234 ||
    country === 'egypt' || country === 'مصر' ||
    name.includes('egypt') || name.includes('الدوري المصري')
  ) return true;

  // UAE Pro League (ADNOC) & President Cup
  if (
    leagueId === 301 || leagueId === 302 ||
    country === 'united arab emirates' || country === 'الإمارات' ||
    name.includes('uae') || name.includes('adnoc') || name.includes('الإمارات')
  ) return true;

  // Qatar Stars League & Emir Cup
  if (
    leagueId === 305 || leagueId === 306 ||
    country === 'qatar' || country === 'قطر' ||
    name.includes('qatar') || name.includes('نجوم قطر')
  ) return true;

  // Tunisian Ligue 1
  if (
    leagueId === 202 ||
    country === 'tunisia' || country === 'تونس' ||
    name.includes('tunis') || name.includes('التونسي')
  ) return true;

  // Algerian Ligue 1
  if (
    leagueId === 186 ||
    country === 'algeria' || country === 'الجزائر' ||
    name.includes('algeria') || name.includes('الجزائري')
  ) return true;

  // Champions League & European Cups
  if ([2, 2001].includes(leagueId) || name.includes('uefa champions league') || name.includes('champions league')) return true;
  if ([3, 2146].includes(leagueId) || name.includes('uefa europa league') || name.includes('europa league')) return true;
  if (leagueId === 848 || name.includes('uefa conference league') || name.includes('conference league')) return true;
  if (leagueId === 531 || name.includes('uefa super cup')) return true;

  // Continental Club Tournaments (Africa & Asia)
  if (
    leagueId === 12 || leagueId === 20 || leagueId === 533 ||
    name.includes('caf champions') || name.includes('caf confederation') || name.includes('دوري أبطال إفريقيا') || name.includes('الكونفدرالية')
  ) return true;

  if (
    leagueId === 17 || leagueId === 18 ||
    name.includes('afc champions') || name.includes('دوري أبطال آسيا')
  ) return true;

  // National Teams / International
  // World Cup & Qualifiers
  if (leagueId === 1 || leagueId === 2000 || name.includes('world cup') || name.includes('fifa')) return true;
  // Euro & Qualifiers
  if (leagueId === 4 || leagueId === 5 || leagueId === 2018 || (name.includes('euro') && (name.includes('championship') || name.includes('qualification')))) return true;
  // UEFA Nations League
  if (leagueId === 7 || (name.includes('nations league') && !name.includes('concacaf'))) return true;
  // CONCACAF Nations League & Gold Cup
  if (leagueId === 400 || leagueId === 22 || name.includes('concacaf nations league') || name.includes('concacaf gold cup') || name.includes('concacaf')) return true;
  // AFCON / CAN
  if (leagueId === 6 || leagueId === 36 || name.includes('africa cup') || name.includes('afcon') || name.includes('coupe d\'afrique') || name.includes('can ') || name.startsWith('can')) return true;
  // Copa America
  if (leagueId === 9 || name.includes('copa america') || name.includes('copa américa')) return true;
  // Asian Cup
  if ([15, 16, 17].includes(leagueId) || name.includes('asian cup')) return true;
  // Senior International Friendlies
  if ((leagueId === 10 || leagueId === 667 || name.includes('friend')) && (country === 'world' || country === 'international')) {
    return true;
  }

  return false;
}

export function normTeam(s: string): string {
  let str = (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\u0600-\u06FF]/g, '')
    .replace(/^(fc|cf|sc|ac|fk|sk|cd|ca|as)/g, '')
    .replace(/(fc|cf|sc|ac|fk|sk|cd|ca|as)$/g, '')
    .trim();

  if (
    str === 'usa' ||
    str === 'unitedstates' ||
    str === 'usmnt' ||
    str === 'الولاياتالمتحدة' ||
    str === 'الولاياتالمتحدةالامريكية' ||
    str === 'امريكا'
  ) {
    return 'usa';
  }
  if (str.includes('papuanewguinea') || str.includes('بابوا')) return 'papuanewguinea';
  if (str.includes('solomonislands') || str.includes('جزرسليمان')) return 'solomonislands';
  if (str.includes('southkorea') || str.includes('korearepublic') || str.includes('كوريالجنوبية')) return 'southkorea';
  if (str.includes('northkorea') || str.includes('koreadpr') || str.includes('كوريالشمالية')) return 'northkorea';
  if (str.includes('ivorycoast') || str.includes('cotedivoire') || str.includes('ساحلالعاج')) return 'ivorycoast';
  if (str.includes('drcongo') || str.includes('congodr') || str.includes('جمهوريةالكونغو')) return 'drcongo';
  if (str.includes('capeverde') || str.includes('caboverde') || str.includes('الراسالاخضر')) return 'capeverde';
  if (str.includes('czech') || str.includes('التشيك')) return 'czechia';
  if (str.includes('uae') || str.includes('unitedarabemirates') || str.includes('الامارات')) return 'uae';
  if (str.includes('saudi') || str.includes('السعودية')) return 'saudiarabia';
  if (str.includes('chile') || str.includes('تشيلي')) return 'chile';
  if (str.includes('mexico') || str.includes('المكسيك')) return 'mexico';
  if (str.includes('peru') || str.includes('بيرو')) return 'peru';
  if (str.includes('argentina') || str.includes('الارجنتين')) return 'argentina';
  if (str.includes('brazil') || str.includes('البرازيل')) return 'brazil';
  if (str.includes('colombia') || str.includes('كولومبيا')) return 'colombia';
  if (str.includes('uruguay') || str.includes('اوروغواي')) return 'uruguay';
  if (str.includes('paraguay') || str.includes('باراغواي')) return 'paraguay';
  if (str.includes('bolivia') || str.includes('بوليفيا')) return 'bolivia';
  if (str.includes('venezuela') || str.includes('فنزويلا')) return 'venezuela';
  if (str.includes('ecuador') || str.includes('الاكوادور')) return 'ecuador';
  if (str.includes('morocco') || str.includes('المغرب')) return 'morocco';
  if (str.includes('egypt') || str.includes('مصر')) return 'egypt';
  if (str.includes('algeria') || str.includes('الجزائر')) return 'algeria';
  if (str.includes('tunisia') || str.includes('تونس')) return 'tunisia';
  if (str.includes('spain') || str.includes('اسبانيا')) return 'spain';
  if (str.includes('france') || str.includes('فرنسا')) return 'france';
  if (str.includes('germany') || str.includes('المانيا')) return 'germany';
  if (str.includes('italy') || str.includes('ايطاليا')) return 'italy';
  if (str.includes('england') || str.includes('انجلترا')) return 'england';
  if (str.includes('portugal') || str.includes('البرتغال')) return 'portugal';
  if (str.includes('netherlands') || str.includes('holland') || str.includes('هولندا')) return 'netherlands';
  if (str.includes('belgium') || str.includes('بلجيكا')) return 'belgium';
  if (str.includes('croatia') || str.includes('كرواتيا')) return 'croatia';
  if (str.includes('turkey') || str.includes('turkiye') || str.includes('türkiye') || str.includes('تركيا')) return 'turkey';
  if (str.includes('bosnia') || str.includes('البوسنة')) return 'bosnia';
  if (str.includes('ireland') || str.includes('ايرلندا') || str.includes('أيرلندا')) {
    if (str.includes('northern') || str.includes('الشمالية')) return 'northernireland';
    return 'ireland';
  }
  if (str.includes('slovakia') || str.includes('سلوفاكيا')) return 'slovakia';
  if (str.includes('slovenia') || str.includes('سلوفينيا')) return 'slovenia';
  if (str.includes('sweden') || str.includes('السويد')) return 'sweden';
  if (str.includes('poland') || str.includes('بولندا')) return 'poland';
  if (str.includes('ukraine') || str.includes('اوكرانيا') || str.includes('أوكرانيا')) return 'ukraine';
  if (str.includes('romania') || str.includes('رومانيا')) return 'romania';
  if (str.includes('moldova') || str.includes('مولدوفا')) return 'moldova';
  if (str.includes('kazakhstan') || str.includes('كازاخستان')) return 'kazakhstan';
  if (str.includes('cyprus') || str.includes('قبرص')) return 'cyprus';
  if (str.includes('armenia') || str.includes('ارمينيا') || str.includes('أرمينيا')) return 'armenia';
  if (str.includes('latvia') || str.includes('لاتفيا')) return 'latvia';
  if (str.includes('montenegro') || str.includes('الجبلالاسود') || str.includes('الجبلالأسود')) return 'montenegro';
  if (str.includes('faroe') || str.includes('فارو')) return 'faroe';
  if (str.includes('georgia') || str.includes('جورجيا')) return 'georgia';
  if (str.includes('azerbaijan') || str.includes('اذربيجان') || str.includes('أذربيجان')) return 'azerbaijan';
  if (str.includes('hungary') || str.includes('المجر')) return 'hungary';
  if (str.includes('bulgaria') || str.includes('بلغاريا')) return 'bulgaria';
  if (str.includes('finland') || str.includes('فنلندا')) return 'finland';
  if (str.includes('iceland') || str.includes('ايسلندا') || str.includes('آيسلندا')) return 'iceland';
  if (str.includes('albania') || str.includes('البانيا') || str.includes('ألبانيا')) return 'albania';
  if (str.includes('macedonia') || str.includes('مقدونيا')) return 'northmacedonia';
  if (str.includes('greece') || str.includes('اليونان')) return 'greece';
  if (str.includes('norway') || str.includes('النرويج')) return 'norway';
  if (str.includes('austria') || str.includes('النمسا')) return 'austria';
  if (str.includes('denmark') || str.includes('الدانمارك') || str.includes('الدنمارك')) return 'denmark';
  if (str.includes('scotland') || str.includes('اسكتلندا') || str.includes('إسكتلندا')) return 'scotland';
  if (str.includes('wales') || str.includes('ويلز')) return 'wales';
  if (str.includes('serbia') || str.includes('صربيا')) return 'serbia';
  if (str.includes('luxembourg') || str.includes('لوكسمبورغ') || str.includes('لوكسمبورج')) return 'luxembourg';
  if (str.includes('belarus') || str.includes('بيلاروسيا')) return 'belarus';
  if (str.includes('lithuania') || str.includes('ليتوانيا')) return 'lithuania';
  if (str.includes('estonia') || str.includes('استونيا') || str.includes('إستونيا')) return 'estonia';
  if (str.includes('kosovo') || str.includes('كوسوفو')) return 'kosovo';
  if (str.includes('malta') || str.includes('مالطا')) return 'malta';
  if (str.includes('andorra') || str.includes('اندورا') || str.includes('أندورا')) return 'andorra';
  if (str.includes('sanmarino') || str.includes('سانمارينو')) return 'sanmarino';
  if (str.includes('gibraltar') || str.includes('جبلطارق')) return 'gibraltar';
  return str;
}

/**
 * TASK 1, 2, 3: Load real data exclusively from API-Football backend
 */
export async function loadRemoteData(): Promise<{
  matches: Match[];
  teams: Team[];
  competitions: Competition[];
}> {
  // 1. Fetch live matches and today's fixtures from API-Football
  let liveFixtures: ApiFootballFixtureRaw[] = [];
  let todayFixtures: ApiFootballFixtureRaw[] = [];
  let lastError: Error | null = null;

  try {
    const liveRes = await request<{ fixtures: ApiFootballFixtureRaw[] }>('/football/live');
    if (liveRes && Array.isArray(liveRes.fixtures)) {
      liveFixtures = liveRes.fixtures;
    }
  } catch (err: any) {
    lastError = err;
    // If API key is unconfigured, unauthorized, or rate limited, re-throw immediately
    if (err.status === 401 || err.status === 429) {
      throw err;
    }
  }

  try {
    const todayStr = getMoroccoDateOnly(new Date());
    const fixturesRes = await request<{ fixtures: ApiFootballFixtureRaw[] }>(`/football/fixtures?date=${todayStr}`);
    if (fixturesRes && Array.isArray(fixturesRes.fixtures)) {
      // Strictly keep only matches whose Moroccan kickoff date is today (before 00:00 midnight)
      todayFixtures = fixturesRes.fixtures.filter((f) => {
        if (!f.fixture?.date) return true;
        const fDateStr = getMoroccoDateOnly(f.fixture.date);
        return fDateStr === todayStr;
      });
    }
  } catch (err: any) {
    lastError = err;
    if (err.status === 401 || err.status === 429) {
      throw err;
    }
  }

  // If no fixtures could be loaded and an error occurred, surface it clearly
  if (liveFixtures.length === 0 && todayFixtures.length === 0 && lastError) {
    throw lastError;
  }

  // Combine fixtures with no duplicates by team names and ID

  const combinedRaw: ApiFootballFixtureRaw[] = [];
  const rawList = [...liveFixtures, ...todayFixtures];

  for (const f of rawList) {
    const h = normTeam(f.teams?.home?.name || '');
    const a = normTeam(f.teams?.away?.name || '');
    const fId = f.fixture?.id;

    const existingIdx = combinedRaw.findIndex((ex) => {
      if (ex.fixture?.id === fId) return true;
      const exH = normTeam(ex.teams?.home?.name || '');
      const exA = normTeam(ex.teams?.away?.name || '');
      if (!h || !a || !exH || !exA) return false;
      const direct = (h === exH || h.includes(exH) || exH.includes(h)) && (a === exA || a.includes(exA) || exA.includes(a));
      const reversed = (h === exA || h.includes(exA) || exA.includes(h)) && (a === exH || a.includes(exH) || exH.includes(a));
      return direct || reversed;
    });

    if (existingIdx === -1) {
      combinedRaw.push(f);
    } else {
      const ex = combinedRaw[existingIdx];
      const isExLive =
        ex.fixture?.status?.short === '1H' ||
        ex.fixture?.status?.short === '2H' ||
        ex.fixture?.status?.short === 'HT' ||
        ex.fixture?.status?.short === 'LIVE';
      const isFLive =
        f.fixture?.status?.short === '1H' ||
        f.fixture?.status?.short === '2H' ||
        f.fixture?.status?.short === 'HT' ||
        f.fixture?.status?.short === 'LIVE';

      // Always prefer live match over scheduled
      if (isFLive && !isExLive) {
        if (!f.teams.home.logo && ex.teams.home.logo) f.teams.home.logo = ex.teams.home.logo;
        if (!f.teams.away.logo && ex.teams.away.logo) f.teams.away.logo = ex.teams.away.logo;
        combinedRaw[existingIdx] = f;
        continue;
      } else if (!isFLive && isExLive) {
        if (!ex.teams.home.logo && f.teams.home.logo) ex.teams.home.logo = f.teams.home.logo;
        if (!ex.teams.away.logo && f.teams.away.logo) ex.teams.away.logo = f.teams.away.logo;
        continue;
      }

      const isFMatchora = Number(f.fixture.id) < 10000000;
      const isExMatchora = Number(ex.fixture.id) < 10000000;
      if (isFMatchora && !isExMatchora) {
        if (!f.teams.home.logo && ex.teams.home.logo) f.teams.home.logo = ex.teams.home.logo;
        if (!f.teams.away.logo && ex.teams.away.logo) f.teams.away.logo = ex.teams.away.logo;
        combinedRaw[existingIdx] = f;
      } else if (!isFMatchora && isExMatchora) {
        if (!ex.teams.home.logo && f.teams.home.logo) ex.teams.home.logo = f.teams.home.logo;
        if (!ex.teams.away.logo && f.teams.away.logo) ex.teams.away.logo = f.teams.away.logo;
        if (isFLive && (!isExLive || f.fixture?.status?.elapsed)) {
          ex.fixture.status = f.fixture.status;
          ex.goals = f.goals;
        }
      } else if (isFLive && (!isExLive || f.fixture?.status?.elapsed)) {
        combinedRaw[existingIdx] = f;
      }
    }
  }

  let allFixtures = combinedRaw.filter(isMajorCompetitionRaw);
  if (allFixtures.length === 0 && combinedRaw.length > 0) {
    allFixtures = combinedRaw;
  }

  // 2. Fetch matches that have active authorized streams / iframes
  let activeMatchIds = new Set<string>();
  let hasGlobalServers = false;

  try {
    const meta = await request<{ activeMatchIds: (string | number)[]; hasGlobalServers?: boolean; hasExternalProvider?: boolean }>('/streams/active-matches');
    if (meta) {
      activeMatchIds = new Set((meta.activeMatchIds || []).map(String));
      hasGlobalServers = Boolean(meta.hasGlobalServers) || Boolean(meta.hasExternalProvider);
    }
  } catch {
    try {
      const { streams } = await request<{ streams: AuthorizedStream[] }>('/streams');
      activeMatchIds = new Set((streams || []).filter((s) => s.is_active).map((s) => String(s.match_id)));
    } catch {}
  }

  // Display all valid fixtures so users can browse all football matches from API-Football
  const streamFixtures = (hasGlobalServers || activeMatchIds.size === 0 || allFixtures.length > 0)
    ? allFixtures
    : allFixtures.filter((f) => activeMatchIds.has(String(f.fixture.id)));

  // Also include any matches registered in admin/streams that are not in today's fixture list
  if (!hasGlobalServers && activeMatchIds.size > 0) {
    for (const matchIdStr of Array.from(activeMatchIds)) {
      const numId = parseInt(matchIdStr, 10);
      if (!isNaN(numId) && !streamFixtures.some((f) => f.fixture.id === numId)) {
        try {
          const extra = await loadRealMatchDetails(numId);
          if (extra) {
            streamFixtures.push(extra);
          }
        } catch {}
      }
    }
  }

  const normalizedMatches: Match[] = streamFixtures.map(normalizeApiFootballFixture);

  // Extract unique teams
  const teamsMap = new Map<string, Team>();
  streamFixtures.forEach((f, idx) => {
    const homeId = String(f.teams.home.id);
    if (!teamsMap.has(homeId)) {
      teamsMap.set(homeId, {
        id: homeId,
        name: f.teams.home.name,
        short: f.teams.home.name.slice(0, 3).toUpperCase(),
        country: f.league.country || 'International',
        color: colorForIndex(idx * 2),
        logoUrl: f.teams.home.logo,
      });
    }
    const awayId = String(f.teams.away.id);
    if (!teamsMap.has(awayId)) {
      teamsMap.set(awayId, {
        id: awayId,
        name: f.teams.away.name,
        short: f.teams.away.name.slice(0, 3).toUpperCase(),
        country: f.league.country || 'International',
        color: colorForIndex(idx * 2 + 1),
        logoUrl: f.teams.away.logo,
      });
    }
  });

  // Extract unique competitions - seeded from centralized supported competitions
  const compsMap = new Map<string, Competition>();
  SUPPORTED_COMPETITIONS.forEach((sc) => {
    compsMap.set(String(sc.id), {
      id: String(sc.id),
      name: sc.arabicName || sc.name,
      short: sc.name.slice(0, 3).toUpperCase(),
      country: sc.country,
      matches: allFixtures.filter((item) => Number(item.league.id) === sc.id).length,
      accent: '#10b981',
      logoUrl: `https://media.api-sports.io/football/leagues/${sc.id}.png`,
    });
  });

  allFixtures.forEach((f) => {
    const compId = String(f.league.id);
    const existing = compsMap.get(compId);
    if (existing) {
      if (f.league.logo) existing.logoUrl = f.league.logo;
      existing.matches = allFixtures.filter((item) => String(item.league.id) === compId).length;
    } else {
      compsMap.set(compId, {
        id: compId,
        name: f.league.name,
        short: f.league.name.slice(0, 3).toUpperCase(),
        country: f.league.country || 'International',
        matches: allFixtures.filter((item) => String(item.league.id) === compId).length,
        accent: '#10b981',
        logoUrl: f.league.logo,
      });
    }
  });

  // Deduplicate competitions by normalized Arabic name so no duplicates appear
  const uniqueCompsMap = new Map<string, Competition>();
  for (const comp of compsMap.values()) {
    const info = formatCompetitionInfo({
      id: comp.id,
      name: comp.name,
      country: comp.country,
      logo: comp.logoUrl,
    });
    const key = normalizeCompetitionName(info.competitionName);
    const existing = uniqueCompsMap.get(key);
    if (!existing) {
      uniqueCompsMap.set(key, {
        ...comp,
        name: info.competitionName,
        country: info.competitionCountry,
        logoUrl: info.competitionLogo || comp.logoUrl,
      });
    } else {
      existing.matches += comp.matches;
      if (!isNaN(Number(comp.id)) && isNaN(Number(existing.id))) {
        existing.id = comp.id;
      }
      if (info.competitionLogo && (!existing.logoUrl || existing.logoUrl.includes('placeholder'))) {
        existing.logoUrl = info.competitionLogo;
      }
    }
  }

  const priorityMap = new Map<number, number>();
  SUPPORTED_COMPETITIONS.forEach((sc, idx) => {
    priorityMap.set(sc.id, idx);
  });
  const sortedCompetitions = Array.from(uniqueCompsMap.values()).sort((a, b) => {
    const pA = priorityMap.has(Number(a.id)) ? priorityMap.get(Number(a.id))! : 999;
    const pB = priorityMap.has(Number(b.id)) ? priorityMap.get(Number(b.id))! : 999;
    return pA - pB;
  });

  return {
    matches: normalizedMatches,
    teams: Array.from(teamsMap.values()),
    competitions: sortedCompetitions,
  };
}

export async function loadFixturesByDate(date: string): Promise<Match[]> {
  try {
    const { fixtures } = await request<{ fixtures: ApiFootballFixtureRaw[] }>(`/football/fixtures?date=${date}`);
    if (fixtures && Array.isArray(fixtures)) {
      let filtered = fixtures.filter(isMajorCompetitionRaw);
      if (filtered.length === 0 && fixtures.length > 0) {
        filtered = fixtures;
      }
      const uniqueFixtures: ApiFootballFixtureRaw[] = [];
      for (const f of filtered) {
        const h = normTeam(f.teams?.home?.name || '');
        const a = normTeam(f.teams?.away?.name || '');
        const fId = f.fixture?.id;
        const exists = uniqueFixtures.some((ex) => {
          if (ex.fixture?.id === fId) return true;
          const exH = normTeam(ex.teams?.home?.name || '');
          const exA = normTeam(ex.teams?.away?.name || '');
          if (!h || !a || !exH || !exA) return false;
          return (h === exH && a === exA) || (h === exA && a === exH);
        });
        if (!exists) {
          uniqueFixtures.push(f);
        }
      }
      return uniqueFixtures.map(normalizeApiFootballFixture);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * TASK 4: Real match details, events, lineups, and statistics
 */
export async function loadRealMatchDetails(matchId: string | number): Promise<ApiFootballFixtureRaw | null> {
  try {
    const { match } = await request<{ match: ApiFootballFixtureRaw }>(`/football/matches/${matchId}`);
    return match;
  } catch {
    return null;
  }
}

export async function loadRealMatchEvents(matchId: string | number): Promise<ApiMatchEvent[]> {
  try {
    const { events } = await request<{ events: ApiMatchEvent[] }>(`/football/matches/${matchId}/events`);
    return events || [];
  } catch {
    return [];
  }
}

export async function loadRealMatchLineups(matchId: string | number): Promise<ApiMatchLineup[]> {
  try {
    const { lineups } = await request<{ lineups: ApiMatchLineup[] }>(`/football/matches/${matchId}/lineups`);
    return lineups || [];
  } catch {
    return [];
  }
}

export async function loadRealMatchStatistics(matchId: string | number): Promise<ApiMatchStatistic[]> {
  try {
    const { statistics } = await request<{ statistics: ApiMatchStatistic[] }>(`/football/matches/${matchId}/statistics`);
    return statistics || [];
  } catch {
    return [];
  }
}

export async function loadCompetitionStandings(
  competitionId: string | number,
  competitionName?: string
): Promise<StandingEntry[]> {
  try {
    let targetId = String(competitionId).trim();
    let targetName = competitionName || '';
    if (
      targetId === '1006093784' ||
      targetName.includes('الدرجة الثانية') ||
      targetName.toLowerCase().includes('la liga 2') ||
      targetName.toLowerCase().includes('laliga 2')
    ) {
      targetId = '141';
      targetName = 'Spanish La Liga 2';
    }
    const qName = targetName ? `?name=${encodeURIComponent(targetName)}` : '';
    const res = await request<{ standings: any[] }>(`/football/standings/${targetId}${qName}`);
    const raw = res?.standings;
    if (!raw || !Array.isArray(raw)) return [];

    // Format 1: Already an array of StandingEntry (ESPN or normalized)
    if (raw.length > 0 && typeof raw[0] === 'object' && ('position' in raw[0] || 'teamName' in raw[0])) {
      return raw.map((entry: any) => ({
        position: Number(entry.position || entry.rank || 1),
        teamId: Number(entry.teamId || entry.team?.id || 0),
        teamName: getArabicTeamName(entry.teamName || entry.team?.name || 'فريق'),
        teamLogo: entry.teamLogo || entry.team?.logo || entry.team?.logos?.[0]?.href || '',
        played: Number(entry.played ?? entry.all?.played ?? 0),
        wins: Number(entry.wins ?? entry.all?.win ?? 0),
        draws: Number(entry.draws ?? entry.all?.draw ?? 0),
        losses: Number(entry.losses ?? entry.all?.lose ?? 0),
        goalsFor: Number(entry.goalsFor ?? entry.all?.goals?.for ?? 0),
        goalsAgainst: Number(entry.goalsAgainst ?? entry.all?.goals?.against ?? 0),
        goalDifference: Number(entry.goalDifference ?? entry.goalsDiff ?? 0),
        points: Number(entry.points ?? 0),
        groupName: entry.groupName,
      }));
    }

    // Format 2: API-Football nested league.standings
    if (raw.length > 0 && raw[0].league?.standings) {
      const table = raw[0].league.standings[0] || [];
      return table.map((entry: any) => ({
        position: Number(entry.rank || 1),
        teamId: Number(entry.team?.id || 0),
        teamName: getArabicTeamName(entry.team?.name),
        teamLogo: entry.team?.logo || '',
        played: Number(entry.all?.played ?? 0),
        wins: Number(entry.all?.win ?? 0),
        draws: Number(entry.all?.draw ?? 0),
        losses: Number(entry.all?.lose ?? 0),
        goalsFor: Number(entry.all?.goals?.for ?? 0),
        goalsAgainst: Number(entry.all?.goals?.against ?? 0),
        goalDifference: Number(entry.goalsDiff ?? 0),
        points: Number(entry.points ?? 0),
        groupName: entry.group,
      }));
    }

    return [];
  } catch (err) {
    console.warn('[MatchZone] Failed to load standings for competition:', competitionId, err);
    return [];
  }
}

export type LiveSourceType = 'embed' | 'hls' | 'dash';

export interface StreamServer {
  id: string;
  name: string;
  url: string;
  type: 'hls' | 'dash' | 'iframe' | string;
}

export interface LiveSource {
  id: string;
  name: string;
  type: LiveSourceType;
  embedUrl: string;
  status?: string;
  provider?: string;
  quality?: string;
  channel?: string;
  lang?: string;
  commentator?: string;
  isBein?: boolean;
  isArabic?: boolean;
}

export interface MatchChannelItem {
  id: string;
  name: string;
  lang?: string;
  quality?: string;
  embedUrl: string;
}

export interface LiveSourcesResponse {
  matchId: number | string;
  sources: LiveSource[];
  hasSources?: boolean;
  matchChannels?: MatchChannelItem[];
  stream?: AuthorizedStream | null;
  servers?: StreamServer[];
  message?: string | null;
}

/**
 * Loads canonical Live Sources for a match from the backend Live Sources service.
 * Supports provider-agnostic permitted embeds, HLS, or DASH streams.
 * If no source is permitted or available, sources will be empty.
 */
export async function loadLiveSources(
  matchId: string | number,
  opts?: {
    home?: string;
    away?: string;
    league?: string;
    status?: string;
    date?: string;
    kickoff?: string;
  }
): Promise<LiveSourcesResponse> {
  try {
    const params = new URLSearchParams();
    if (opts?.home) params.set('home', opts.home);
    if (opts?.away) params.set('away', opts.away);
    if (opts?.league) params.set('league', opts.league);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.date) params.set('date', opts.date);
    if (opts?.kickoff) params.set('kickoff', opts.kickoff);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request<LiveSourcesResponse>(`/streams/${matchId}${qs}`);

    const rawSources = (res.sources || []).filter(
      (s) =>
        s.embedUrl &&
        s.embedUrl.startsWith('https://') &&
        !s.embedUrl.includes('[') &&
        !String(s.id).startsWith('server-') &&
        !String(s.name).toLowerCase().includes('server 1') &&
        !String(s.name).toLowerCase().includes('server 2') &&
        !String(s.name).toLowerCase().includes('server 3')
    );
    const normalizedSources: LiveSource[] = rawSources.map((s) => ({
      id: String(s.id),
      name: s.name,
      type: s.type === ('iframe' as any) ? 'embed' : s.type,
      embedUrl: s.embedUrl,
      status: s.status || 'active',
      provider: s.provider,
      quality: s.quality,
      channel: s.channel || (s.name.toLowerCase().includes('bein') ? 'beIN Sports' : undefined),
      lang: s.lang,
      commentator: s.commentator,
      isBein: s.isBein ?? s.name.toLowerCase().includes('bein'),
      isArabic: s.isArabic ?? (s.name.includes('عربي') || s.lang?.toLowerCase() === 'arabic'),
    }));

    // Prioritize beIN Sports with Arabic commentary
    normalizedSources.sort((a, b) => {
      const isBeinA = a.isBein || a.name.toLowerCase().includes('bein');
      const isBeinB = b.isBein || b.name.toLowerCase().includes('bein');
      const isArA = a.isArabic || a.name.includes('عربي') || a.commentator?.includes('عربي') || a.lang?.toLowerCase() === 'arabic';
      const isArB = b.isArabic || b.name.includes('عربي') || b.commentator?.includes('عربي') || b.lang?.toLowerCase() === 'arabic';

      const aScore = (isBeinA && isArA ? 5000 : 0) + (isArA ? 3000 : 0) + (isBeinA ? 1500 : 0);
      const bScore = (isBeinB && isArB ? 5000 : 0) + (isArB ? 3000 : 0) + (isBeinB ? 1500 : 0);

      return bScore - aScore;
    });

    // User requested: "khali ghir wahda li na9la lmatch bel arbiya w tkoun HD"
    const arabicSources = normalizedSources.filter(
      (s) => s.isArabic || s.name.includes('عربي') || s.commentator?.includes('عربي') || s.lang?.toLowerCase() === 'arabic'
    );

    let finalSources: LiveSource[] = [];
    if (arabicSources.length > 0) {
      const best = { ...arabicSources[0], quality: 'HD' };
      finalSources = [best];
    } else if (normalizedSources.length > 0) {
      finalSources = [{ ...normalizedSources[0], quality: normalizedSources[0].quality || 'HD' }];
    }

    return {
      matchId,
      sources: finalSources,
      hasSources: finalSources.length > 0,
      matchChannels: res.matchChannels || [],
      stream: res.stream || null,
      servers: res.servers || [],
      message: finalSources.length === 0 ? 'البث المباشر غير متوفر حالياً' : null,
    };
  } catch {
    return {
      matchId,
      sources: [],
      hasSources: false,
      stream: null,
      servers: [],
      message: 'البث المباشر غير متوفر حالياً',
    };
  }
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
  }>;
  reason?: string;
  message?: string;
}

/**
 * GET /api/streams/:matchId/matchora
 * Loads live embed source directly from official Matchora public API.
 */
export async function loadMatchoraSource(
  matchId: string | number,
  opts?: {
    home?: string;
    away?: string;
    league?: string;
    status?: string;
    date?: string;
    kickoff?: string;
  }
): Promise<MatchoraSourceResponse> {
  try {
    const params = new URLSearchParams();
    if (opts?.home) params.set('home', opts.home);
    if (opts?.away) params.set('away', opts.away);
    if (opts?.league) params.set('league', opts.league);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.date) params.set('date', opts.date);
    if (opts?.kickoff) params.set('kickoff', opts.kickoff);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await request<MatchoraSourceResponse>(`/streams/${matchId}/matchora${qs}`);
  } catch {
    return {
      available: false,
      provider: "Matchora",
      reason: "API_ERROR",
      message: "Le direct n'est pas disponible pour ce match.",
    };
  }
}

/**
 * GET /api/streams/:matchId
 * Returns authorized stream configuration and available servers.
 */
export async function loadAuthorizedStream(
  matchId: string | number,
  opts?: { home?: string; away?: string; league?: string }
): Promise<{
  stream: AuthorizedStream | null;
  servers?: StreamServer[];
  sources?: LiveSource[];
  message?: string | null;
}> {
  const result = await loadLiveSources(matchId, opts);
  return {
    stream: result.stream ?? null,
    servers: result.servers,
    sources: result.sources,
    message: result.message,
  };
}

/**
 * TASK 7: Admin stream management client API
 */
export async function listAllStreams(): Promise<AuthorizedStream[]> {
  const { streams } = await request<{ streams: AuthorizedStream[] }>('/streams');
  return streams || [];
}

export async function createAuthorizedStream(input: {
  match_id: number;
  provider: string;
  stream_url: string;
  stream_type: 'hls' | 'dash' | 'iframe';
  is_active?: boolean;
}): Promise<AuthorizedStream> {
  const { stream } = await request<{ stream: AuthorizedStream }>('/streams', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return stream;
}

export async function updateAuthorizedStream(
  id: number,
  input: {
    provider?: string;
    stream_url?: string;
    stream_type?: 'hls' | 'dash' | 'iframe';
    is_active?: boolean;
    match_id?: number;
  }
): Promise<AuthorizedStream> {
  const { stream } = await request<{ stream: AuthorizedStream }>(`/streams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return stream;
}

export async function deleteAuthorizedStream(id: number): Promise<void> {
  await request(`/streams/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Loads all today's fixtures and live matches to populate the match picker in Admin Streams,
 * regardless of whether they already have an iframe stream assigned.
 */
export async function loadAvailableFixturesForAdmin(): Promise<Match[]> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const [liveRes, fixturesRes] = await Promise.allSettled([
      request<{ fixtures: ApiFootballFixtureRaw[] }>('/football/live'),
      request<{ fixtures: ApiFootballFixtureRaw[] }>(`/football/fixtures?date=${todayStr}`),
    ]);

    const fixtureMap = new Map<number, ApiFootballFixtureRaw>();
    if (liveRes.status === 'fulfilled' && Array.isArray(liveRes.value?.fixtures)) {
      liveRes.value.fixtures.forEach((f) => fixtureMap.set(f.fixture.id, f));
    }
    if (fixturesRes.status === 'fulfilled' && Array.isArray(fixturesRes.value?.fixtures)) {
      fixturesRes.value.fixtures.forEach((f) => {
        if (!fixtureMap.has(f.fixture.id)) {
          fixtureMap.set(f.fixture.id, f);
        }
      });
    }

    return Array.from(fixtureMap.values())
      .filter(isMajorCompetitionRaw)
      .map(normalizeApiFootballFixture);
  } catch {
    return [];
  }
}

// Authentication requests
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

export async function sendVerificationCode(email: string, displayName?: string) {
  return request<{ success: boolean; message: string; devCode?: string }>('/auth/send-verification', {
    method: 'POST',
    body: JSON.stringify({ email, displayName }),
  });
}

export async function verifyAndRegister(email: string, code: string, password: string, displayName: string) {
  return request<{ user: ApiUser; token: string }>('/auth/verify-and-register', {
    method: 'POST',
    body: JSON.stringify({ email, code, password, displayName }),
  });
}

export async function forgotPasswordRequest(email: string) {
  return request<{ success: boolean; message: string; devCode?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordWithCode(payload: { email: string; code: string; newPassword: string }) {
  return request<{ success: boolean; message: string; user?: ApiUser; token?: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function googleLogin(input: { credential?: string; email?: string; displayName?: string; avatarUrl?: string } | string, displayName?: string, avatarUrl?: string) {
  const payload = typeof input === 'string'
    ? { email: input, displayName, avatarUrl }
    : input;
  return request<{ user: ApiUser; token: string }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser() {
  return request<{ user: ApiUser }>('/auth/me');
}

export async function updateCurrentUser(data: { displayName?: string; avatarUrl?: string | null } | string) {
  const body = typeof data === 'string' ? { displayName: data } : data;
  return request<{ user: ApiUser }>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
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
  await request('/favorites', {
    method: 'DELETE',
    body: JSON.stringify({ entityType: 'match', entityId: Number(matchId) }),
  });
}

export interface LiveNewsArticle {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  excerpt: string;
  content: string[];
  imageUrl: string;
  source: string;
  sourceUrl: string;
  pubDate: string;
  timeAgo: string;
  readTime: string;
  tags: string[];
  isFeatured?: boolean;
}

export async function loadLiveFootballNews(category = 'all'): Promise<LiveNewsArticle[]> {
  try {
    const res = await request<{ success: boolean; data: LiveNewsArticle[] }>(
      `/news?category=${encodeURIComponent(category)}`
    );
    return res.data || [];
  } catch (err) {
    console.error('Failed to load live football news:', err);
    return [];
  }
}

export async function loadSingleNewsArticle(id: string): Promise<LiveNewsArticle | null> {
  try {
    const res = await request<{ success: boolean; data: LiveNewsArticle }>(
      `/news/${encodeURIComponent(id)}`
    );
    return res.data || null;
  } catch (err) {
    console.error('Failed to load news article by id:', err);
    return null;
  }
}