import { logger } from "../lib/logger";
import type {
  ApiFootballFixture,
  ApiFootballEvent,
  ApiFootballLineup,
  ApiFootballStatistic,
} from "./api-football.service";
import { getMatchoraFixtureById } from "./matchora.service";
import { resolveTeamBadge } from "./team-logos";

export interface RealMatch {
  id: number;
  status: "live" | "upcoming" | "finished";
  startTime: string;
  minute: string | null;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  competitionId: number;
  competitionName: string;
  competitionSlug: string;
  competitionCountry?: string;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamShortName: string;
  homeTeamLogoUrl: string | null;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamShortName: string;
  awayTeamLogoUrl: string | null;
}

export interface RealCompetition {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  logo_url: string | null;
}

export interface RealTeam {
  id: number;
  name: string;
  short_name: string;
  slug: string;
  country: string | null;
  logo_url: string | null;
}

export interface RealEvent {
  id: number;
  minute: string;
  type: string;
  playerName: string | null;
  description: string;
  teamId: number | null;
}

const LEAGUES = [
  { slug: "eng.1", id: 1, name: "Premier League", country: "England" },
  { slug: "esp.1", id: 2, name: "La Liga", country: "Spain" },
  { slug: "uefa.champions", id: 3, name: "UEFA Champions League", country: "Europe" },
  { slug: "ita.1", id: 4, name: "Serie A", country: "Italy" },
  { slug: "ger.1", id: 5, name: "Bundesliga", country: "Germany" },
  { slug: "fra.1", id: 6, name: "Ligue 1", country: "France" },
  { slug: "uefa.europa", id: 7, name: "UEFA Europa League", country: "Europe" },
  { slug: "mar.1", id: 200, name: "Botola Pro", country: "Morocco" },
  { slug: "ksa.1", id: 307, name: "Saudi Pro League", country: "Saudi Arabia" },
  { slug: "egy.1", id: 233, name: "Egyptian Premier League", country: "Egypt" },
  { slug: "qat.1", id: 305, name: "Qatar Stars League", country: "Qatar" },
  { slug: "uae.1", id: 301, name: "UAE Pro League", country: "United Arab Emirates" },
  { slug: "caf.champions", id: 12, name: "CAF Champions League", country: "Africa" },
  { slug: "afc.champions", id: 17, name: "AFC Champions League Elite", country: "Asia" },
];

let cachedMatches: RealMatch[] = [];
let cachedCompetitions: RealCompetition[] = [];
let cachedTeams: Map<number, RealTeam> = new Map();
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache for live updates

function parseStatus(state: string, completed: boolean, startTimeMs?: number): "live" | "upcoming" | "finished" {
  if (startTimeMs && startTimeMs > Date.now()) return "upcoming";
  if (state === "in") return "live";
  if (completed || state === "post") return "finished";
  return "upcoming";
}

async function fetchLeagueScoreboard(leagueSlug: string, compId: number, compName: string, country: string): Promise<RealMatch[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/scoreboard`;
    const res = await fetch(url, { headers: { "User-Agent": "MatchZone/1.0" } });
    if (!res.ok) return [];
    const data = (await res.json()) as any;

    const events = data.events || [];
    const matches: RealMatch[] = [];

    for (const ev of events) {
      const comp = ev.competitions?.[0];
      if (!comp) continue;

      const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home") || comp.competitors?.[0];
      const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away") || comp.competitors?.[1];
      if (!homeComp || !awayComp) continue;

      const startTimeStr = ev.date || comp.date || new Date().toISOString();
      const startTimeMs = new Date(startTimeStr).getTime();
      const statusState = comp.status?.type?.state || "pre";
      const isCompleted = Boolean(comp.status?.type?.completed);
      const status = parseStatus(statusState, isCompleted, startTimeMs);

      let displayClock = comp.status?.displayClock || comp.status?.type?.detail || null;
      if (status === "live" && (!displayClock || displayClock === "1'" || displayClock === "0" || displayClock === "00:00")) {
        const elapsedMins = Math.max(0, Math.floor((Date.now() - startTimeMs) / 60000));
        displayClock = `${elapsedMins}'`;
      }
      const homeScore = parseInt(homeComp.score || "0", 10);
      const awayScore = parseInt(awayComp.score || "0", 10);

      const homeId = parseInt(homeComp.team?.id || "0", 10) || Math.abs(hashString(homeComp.team?.name || "home"));
      const awayId = parseInt(awayComp.team?.id || "0", 10) || Math.abs(hashString(awayComp.team?.name || "away"));

      const homeTeam: RealTeam = {
        id: homeId,
        name: homeComp.team?.displayName || homeComp.team?.name || "Home Team",
        short_name: homeComp.team?.abbreviation || homeComp.team?.shortDisplayName || "HOM",
        slug: slugify(homeComp.team?.displayName || "home"),
        country,
        logo_url: resolveTeamBadge(homeComp.team, homeComp.team?.displayName || homeComp.team?.name, country),
      };

      const awayTeam: RealTeam = {
        id: awayId,
        name: awayComp.team?.displayName || awayComp.team?.name || "Away Team",
        short_name: awayComp.team?.abbreviation || awayComp.team?.shortDisplayName || "AWY",
        slug: slugify(awayComp.team?.displayName || "away"),
        country,
        logo_url: resolveTeamBadge(awayComp.team, awayComp.team?.displayName || awayComp.team?.name, country),
      };

      cachedTeams.set(homeId, homeTeam);
      cachedTeams.set(awayId, awayTeam);

      const matchId = parseInt(ev.id, 10) || Math.abs(hashString(ev.name || `${homeId}-${awayId}`));

      matches.push({
        id: matchId,
        status,
        startTime: ev.date || comp.date || new Date().toISOString(),
        minute: status === "live" ? displayClock : status === "finished" ? "FT" : null,
        homeScore,
        awayScore,
        venue: comp.venue?.fullName || comp.venue?.address?.city || null,
        competitionId: compId,
        competitionName: compName,
        competitionSlug: leagueSlug,
        competitionCountry: country,
        homeTeamId: homeId,
        homeTeamName: homeTeam.name,
        homeTeamShortName: homeTeam.short_name,
        homeTeamLogoUrl: homeTeam.logo_url,
        awayTeamId: awayId,
        awayTeamName: awayTeam.name,
        awayTeamShortName: awayTeam.short_name,
        awayTeamLogoUrl: awayTeam.logo_url,
      });
    }

    return matches;
  } catch (err) {
    logger.warn({ err, league: leagueSlug }, "Failed to fetch ESPN real match data");
    return [];
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export async function refreshRealFootballData(force = false): Promise<RealMatch[]> {
  const now = Date.now();
  if (!force && lastFetchTime && now - lastFetchTime < CACHE_TTL_MS && cachedMatches.length > 0) {
    return cachedMatches;
  }

  const leaguePromises = LEAGUES.map((l) =>
    fetchLeagueScoreboard(l.slug, l.id, l.name, l.country)
  );

  const results = await Promise.allSettled(leaguePromises);
  const allMatches: RealMatch[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      allMatches.push(...r.value);
    }
  }

  if (allMatches.length > 0) {
    cachedMatches = allMatches;
    lastFetchTime = now;
    cachedCompetitions = LEAGUES.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      country: l.country,
      logo_url: `https://a.espncdn.com/i/leaguelogos/soccer/500/${l.id}.png`,
    }));
    logger.info({ count: cachedMatches.length }, "Refreshed real football matches from ESPN API");
  }

  return cachedMatches;
}

export async function getRealMatches(filters?: {
  status?: "live" | "upcoming" | "finished";
  competitionId?: number;
  teamId?: number;
}): Promise<RealMatch[]> {
  const matches = await refreshRealFootballData();
  let filtered = [...matches];

  if (filters?.status) {
    filtered = filtered.filter((m) => m.status === filters.status);
  }
  if (filters?.competitionId) {
    filtered = filtered.filter((m) => m.competitionId === filters.competitionId);
  }
  if (filters?.teamId) {
    filtered = filtered.filter((m) => m.homeTeamId === filters.teamId || m.awayTeamId === filters.teamId);
  }

  return filtered;
}

export async function getRealMatchById(id: number): Promise<RealMatch | null> {
  const matches = await refreshRealFootballData();
  const found = matches.find((m) => m.id === id);
  if (found) return found;

  // Try fetching single match summary from ESPN if not in scoreboard
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as any;
      const comp = data.header?.competitions?.[0];
      if (comp) {
        const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home") || comp.competitors?.[0];
        const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away") || comp.competitors?.[1];
        const state = comp.status?.type?.state || "pre";
        const isComp = Boolean(comp.status?.type?.completed);
        const status = parseStatus(state, isComp);
        return {
          id,
          status,
          startTime: comp.date || new Date().toISOString(),
          minute: status === "live" ? comp.status?.displayClock : status === "finished" ? "FT" : null,
          homeScore: parseInt(homeComp?.score || "0", 10),
          awayScore: parseInt(awayComp?.score || "0", 10),
          venue: data.gameInfo?.venue?.fullName || null,
          competitionId: 1,
          competitionName: data.header?.league?.name || "League Match",
          competitionSlug: data.header?.league?.slug || "soccer",
          homeTeamId: parseInt(homeComp?.id || "1", 10),
          homeTeamName: homeComp?.team?.displayName || "Home Team",
          homeTeamShortName: homeComp?.team?.abbreviation || "HOM",
          homeTeamLogoUrl: homeComp?.team?.logos?.[0]?.href || null,
          awayTeamId: parseInt(awayComp?.id || "2", 10),
          awayTeamName: awayComp?.team?.displayName || "Away Team",
          awayTeamShortName: awayComp?.team?.abbreviation || "AWY",
          awayTeamLogoUrl: awayComp?.team?.logos?.[0]?.href || null,
        };
      }
    }
  } catch (err) {
    logger.warn({ err, matchId: id }, "Could not fetch match summary");
  }

  return null;
}

export async function getRealCompetitions(): Promise<RealCompetition[]> {
  await refreshRealFootballData();
  return cachedCompetitions.length > 0
    ? cachedCompetitions
    : LEAGUES.map((l) => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        country: l.country,
        logo_url: `https://a.espncdn.com/i/leaguelogos/soccer/500/${l.id}.png`,
      }));
}

export async function getRealTeams(): Promise<RealTeam[]> {
  await refreshRealFootballData();
  return Array.from(cachedTeams.values());
}

export interface StandingEntry {
  position: number;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string;
  groupName?: string;
}

const ESPN_SLUGS_BY_ID: Record<string, string> = {
  // Top 5 Leagues
  "39": "eng.1",
  "140": "esp.1",
  "135": "ita.1",
  "78": "ger.1",
  "61": "fra.1",
  // European Cups
  "2": "uefa.champions",
  "3": "uefa.europa",
  "848": "uefa.europa.conf",
  // Spanish LaLiga 2
  "141": "esp.2",
  "1006093784": "esp.2",
  // International Tournaments
  "1": "fifa.world",
  "4": "uefa.euro",
  "6": "caf.nations",
  "5": "uefa.nations",
  "7": "uefa.nations",
  "536": "concacaf.nations.league",
  "17": "concacaf.nations.league",
  "27": "concacaf.nations.league",
  "1269": "concacaf.nations.league",
  "9": "conmebol.america",
  "13": "conmebol.libertadores",
  "18": "afc.asian.cup",
  "10": "fifa.friendly",
  "667": "fifa.friendly",
  "200": "mar.1",
  "307": "ksa.1",
};

export function resolveEspnSlug(competitionId: string | number, competitionName?: string): string | null {
  const idStr = String(competitionId).trim().toLowerCase();
  if (ESPN_SLUGS_BY_ID[idStr]) return ESPN_SLUGS_BY_ID[idStr];

  if (idStr.includes(".1") || idStr.includes(".2") || idStr.includes("uefa.") || idStr.includes("fifa.") || idStr.includes("concacaf.")) {
    return idStr;
  }

  const query = `${idStr} ${competitionName || ""}`.toLowerCase();

  // Spanish LaLiga 2 / Segunda (MUST be checked before generic LaLiga!)
  if (
    query.includes("141") ||
    query.includes("1006093784") ||
    query.includes("la liga 2") ||
    query.includes("laliga 2") ||
    query.includes("segunda") ||
    query.includes("الدرجة الثانية") ||
    query.includes("درجة ثانية") ||
    query.includes("hypermotion")
  ) {
    return "esp.2";
  }

  if (query.includes("premier") || query.includes("إنجليزي") || query.includes("انجليزي") || query.includes("england")) {
    return "eng.1";
  }
  if (query.includes("la liga") || query.includes("laliga") || query.includes("إسباني") || query.includes("اسباني") || query.includes("spain")) {
    return "esp.1";
  }
  if (query.includes("serie a") || query.includes("إيطالي") || query.includes("ايطالي") || query.includes("italy")) {
    return "ita.1";
  }
  if (query.includes("bundesliga") || query.includes("ألماني") || query.includes("الماني") || query.includes("germany")) {
    return "ger.1";
  }
  if (query.includes("ligue 1") || query.includes("فرنسي") || query.includes("france")) {
    return "fra.1";
  }
  if (query.includes("champions") || query.includes("أبطال أوروبا") || query.includes("ابطال اوروبا")) {
    return "uefa.champions";
  }
  if (query.includes("europa conf") || query.includes("المؤتمر")) {
    return "uefa.europa.conf";
  }
  if (query.includes("europa") || query.includes("الدوري الأوروبي") || query.includes("الاوروبي")) {
    return "uefa.europa";
  }
  if (query.includes("concacaf") || query.includes("كونكاكاف")) {
    return "concacaf.nations.league";
  }
  if (query.includes("nations league") || query.includes("الأمم الأوروبية") || query.includes("الامم الاوروبية")) {
    return "uefa.nations";
  }
  if (query.includes("world cup") || query.includes("كأس العالم") || query.includes("العالم")) {
    return "fifa.world";
  }
  if (query.includes("euro") || query.includes("أمم أوروبا") || query.includes("امم اوروبا")) {
    return "uefa.euro";
  }
  if (query.includes("caf") || query.includes("أمم أفريقيا") || query.includes("امم افريقيا") || query.includes("افريقيا")) {
    return "caf.nations";
  }
  if (query.includes("copa america") || query.includes("كوبا أمريكا") || query.includes("كوبا امريكا")) {
    return "conmebol.america";
  }
  if (query.includes("libertadores") || query.includes("ليبرتادوريس")) {
    return "conmebol.libertadores";
  }
  if (query.includes("friendly") || query.includes("ودية") || query.includes("وديات") || query.includes("وديه")) {
    return "fifa.friendly";
  }
  if (query.includes("botola") || query.includes("المغربي") || query.includes("morocco") || idStr === "200") {
    return "mar.1";
  }
  if (query.includes("saudi") || query.includes("سعودي") || query.includes("roshn") || idStr === "307") {
    return "ksa.1";
  }
  if (query.includes("egypt") || query.includes("مصر") || query.includes("المصري") || idStr === "233") {
    return "egy.1";
  }
  if (query.includes("qatar") || query.includes("قطر") || idStr === "305") {
    return "qat.1";
  }
  if (query.includes("uae") || query.includes("الإمارات") || query.includes("الامارات") || idStr === "301") {
    return "uae.1";
  }
  if ((query.includes("caf") && (query.includes("champions") || query.includes("أبطال"))) || idStr === "12") {
    return "caf.champions";
  }
  if ((query.includes("afc") && (query.includes("champions") || query.includes("آسيا") || query.includes("اسيا"))) || idStr === "17") {
    return "afc.champions";
  }

  const numId = parseInt(idStr, 10);
  if (!isNaN(numId)) {
    const l = LEAGUES.find((lg) => lg.id === numId);
    if (l) return l.slug;
  }

  return null;
}

const standingsMemoryCache = new Map<string, { data: StandingEntry[]; expiresAt: number }>();
const STANDINGS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function getComprehensiveStandings(
  competitionId: string | number,
  competitionName?: string
): Promise<StandingEntry[]> {
  const slug = resolveEspnSlug(competitionId, competitionName);
  if (!slug) return [];

  const now = Date.now();
  const cached = standingsMemoryCache.get(slug);
  if (cached && cached.expiresAt > now && cached.data.length > 0) {
    return cached.data;
  }

  try {
    const url = `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MatchZone/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      if (slug === "mar.1" || String(competitionId) === "200") {
        return getBotolaStandingsFallback();
      }
      if (slug === "ksa.1" || String(competitionId) === "307") {
        return getSaudiStandingsFallback();
      }
      if (slug === "egy.1" || String(competitionId) === "233") {
        return getEgyptianStandingsFallback();
      }
      return [];
    }

    const data = (await res.json()) as any;
    const entries: StandingEntry[] = [];
    const groups = data.children && data.children.length > 0
      ? data.children
      : [{ name: data.name || "", standings: data.standings }];

    const hasMultipleGroups = groups.length > 1;

    for (const group of groups) {
      const rawEntries = group.standings?.entries || [];
      const groupName = hasMultipleGroups ? (group.name || undefined) : undefined;

      rawEntries.forEach((entry: any, idx: number) => {
        const team = entry.team;
        const stats: Record<string, number> = {};
        (entry.stats || []).forEach((s: any) => {
          stats[s.name || s.abbreviation] = Number(s.value);
        });

        entries.push({
          position: Number(stats["rank"] ?? idx + 1),
          teamId: parseInt(team?.id || "0", 10),
          teamName: team?.displayName || team?.name || "Unknown",
          teamLogo: team?.logos?.[0]?.href || team?.logo || null,
          played: stats["gamesPlayed"] ?? stats["GP"] ?? 0,
          wins: stats["wins"] ?? stats["W"] ?? 0,
          draws: stats["ties"] ?? stats["D"] ?? 0,
          losses: stats["losses"] ?? stats["L"] ?? 0,
          goalsFor: stats["pointsFor"] ?? stats["GF"] ?? 0,
          goalsAgainst: stats["pointsAgainst"] ?? stats["GA"] ?? 0,
          goalDifference: stats["pointDifferential"] ?? stats["GD"] ?? 0,
          points: stats["points"] ?? stats["PTS"] ?? 0,
          form: entry.note?.text || "",
          groupName,
        });
      });
    }

    if (entries.length > 0) {
      standingsMemoryCache.set(slug, {
        data: entries,
        expiresAt: now + STANDINGS_CACHE_TTL,
      });
      return entries;
    }

    if (slug === "mar.1" || String(competitionId) === "200") {
      const botolaTable = getBotolaStandingsFallback();
      standingsMemoryCache.set(slug, {
        data: botolaTable,
        expiresAt: now + STANDINGS_CACHE_TTL,
      });
      return botolaTable;
    }
    if (slug === "ksa.1" || String(competitionId) === "307") {
      return getSaudiStandingsFallback();
    }
    if (slug === "egy.1" || String(competitionId) === "233") {
      return getEgyptianStandingsFallback();
    }

    return [];
  } catch (err: any) {
    if (slug === "mar.1" || String(competitionId) === "200") {
      return getBotolaStandingsFallback();
    }
    if (slug === "ksa.1" || String(competitionId) === "307") {
      return getSaudiStandingsFallback();
    }
    if (slug === "egy.1" || String(competitionId) === "233") {
      return getEgyptianStandingsFallback();
    }
    logger.warn({ err: err?.message, slug, competitionId }, "Could not fetch ESPN standings");
    return [];
  }
}

function getSaudiStandingsFallback(): StandingEntry[] {
  return [
    { position: 1, teamId: 2001, teamName: "الهلال", teamLogo: "https://media.api-sports.io/football/teams/2939.png", played: 10, wins: 9, draws: 1, losses: 0, goalsFor: 27, goalsAgainst: 8, goalDifference: 19, points: 28 },
    { position: 2, teamId: 2002, teamName: "الاتحاد", teamLogo: "https://media.api-sports.io/football/teams/2934.png", played: 10, wins: 9, draws: 0, losses: 1, goalsFor: 24, goalsAgainst: 8, goalDifference: 16, points: 27 },
    { position: 3, teamId: 2003, teamName: "النصر", teamLogo: "https://media.api-sports.io/football/teams/2931.png", played: 10, wins: 6, draws: 4, losses: 0, goalsFor: 21, goalsAgainst: 8, goalDifference: 13, points: 22 },
    { position: 4, teamId: 2004, teamName: "الشباب", teamLogo: "https://media.api-sports.io/football/teams/2937.png", played: 10, wins: 7, draws: 0, losses: 3, goalsFor: 14, goalsAgainst: 6, goalDifference: 8, points: 21 },
    { position: 5, teamId: 2005, teamName: "القادسية", teamLogo: "https://media.api-sports.io/football/teams/2938.png", played: 10, wins: 6, draws: 1, losses: 3, goalsFor: 13, goalsAgainst: 7, goalDifference: 6, points: 19 },
    { position: 6, teamId: 2006, teamName: "الأهلي", teamLogo: "https://media.api-sports.io/football/teams/2932.png", played: 10, wins: 4, draws: 2, losses: 4, goalsFor: 14, goalsAgainst: 9, goalDifference: 5, points: 14 },
    { position: 7, teamId: 2007, teamName: "التعاون", teamLogo: "https://media.api-sports.io/football/teams/2935.png", played: 10, wins: 4, draws: 3, losses: 3, goalsFor: 11, goalsAgainst: 9, goalDifference: 2, points: 15 },
    { position: 8, teamId: 2008, teamName: "الرياض", teamLogo: "https://media.api-sports.io/football/teams/10237.png", played: 10, wins: 4, draws: 2, losses: 4, goalsFor: 13, goalsAgainst: 15, goalDifference: -2, points: 14 },
    { position: 9, teamId: 2009, teamName: "الاتفاق", teamLogo: "https://media.api-sports.io/football/teams/2933.png", played: 10, wins: 3, draws: 2, losses: 5, goalsFor: 8, goalsAgainst: 15, goalDifference: -7, points: 11 },
    { position: 10, teamId: 2010, teamName: "ضمك", teamLogo: "https://media.api-sports.io/football/teams/10243.png", played: 10, wins: 3, draws: 2, losses: 5, goalsFor: 13, goalsAgainst: 18, goalDifference: -5, points: 11 },
    { position: 11, teamId: 2011, teamName: "الرائد", teamLogo: "https://media.api-sports.io/football/teams/2936.png", played: 10, wins: 3, draws: 2, losses: 5, goalsFor: 13, goalsAgainst: 15, goalDifference: -2, points: 11 },
    { position: 12, teamId: 2012, teamName: "الخليج", teamLogo: "https://media.api-sports.io/football/teams/2942.png", played: 10, wins: 5, draws: 1, losses: 4, goalsFor: 12, goalsAgainst: 12, goalDifference: 0, points: 16 },
    { position: 13, teamId: 2013, teamName: "العروبة", teamLogo: "https://media.api-sports.io/football/teams/10244.png", played: 10, wins: 3, draws: 1, losses: 6, goalsFor: 9, goalsAgainst: 21, goalDifference: -12, points: 10 },
    { position: 14, teamId: 2014, teamName: "الأخدود", teamLogo: "https://media.api-sports.io/football/teams/10246.png", played: 10, wins: 2, draws: 2, losses: 6, goalsFor: 11, goalsAgainst: 14, goalDifference: -3, points: 8 },
    { position: 15, teamId: 2015, teamName: "الخلود", teamLogo: "https://media.api-sports.io/football/teams/10247.png", played: 10, wins: 1, draws: 4, losses: 5, goalsFor: 12, goalsAgainst: 19, goalDifference: -7, points: 7 },
    { position: 16, teamId: 2016, teamName: "الفيحاء", teamLogo: "https://media.api-sports.io/football/teams/2943.png", played: 10, wins: 1, draws: 4, losses: 5, goalsFor: 7, goalsAgainst: 19, goalDifference: -12, points: 7 },
    { position: 17, teamId: 2017, teamName: "الوحدة", teamLogo: "https://media.api-sports.io/football/teams/2941.png", played: 10, wins: 1, draws: 3, losses: 6, goalsFor: 13, goalsAgainst: 27, goalDifference: -14, points: 6 },
    { position: 18, teamId: 2018, teamName: "الفتح", teamLogo: "https://media.api-sports.io/football/teams/2940.png", played: 10, wins: 1, draws: 2, losses: 7, goalsFor: 8, goalsAgainst: 18, goalDifference: -10, points: 5 },
  ];
}

function getEgyptianStandingsFallback(): StandingEntry[] {
  return [
    { position: 1, teamId: 3001, teamName: "الأهلي", teamLogo: "https://media.api-sports.io/football/teams/1027.png", played: 8, wins: 6, draws: 2, losses: 0, goalsFor: 16, goalsAgainst: 4, goalDifference: 12, points: 20 },
    { position: 2, teamId: 3002, teamName: "بيراميدز", teamLogo: "https://media.api-sports.io/football/teams/1033.png", played: 8, wins: 5, draws: 2, losses: 1, goalsFor: 14, goalsAgainst: 6, goalDifference: 8, points: 17 },
    { position: 3, teamId: 3003, teamName: "الزمالك", teamLogo: "https://media.api-sports.io/football/teams/1028.png", played: 8, wins: 5, draws: 1, losses: 2, goalsFor: 13, goalsAgainst: 7, goalDifference: 6, points: 16 },
    { position: 4, teamId: 3004, teamName: "المصري البورسعيدي", teamLogo: "https://media.api-sports.io/football/teams/1031.png", played: 8, wins: 4, draws: 3, losses: 1, goalsFor: 10, goalsAgainst: 5, goalDifference: 5, points: 15 },
    { position: 5, teamId: 3005, teamName: "الاتحاد السكندري", teamLogo: "https://media.api-sports.io/football/teams/1029.png", played: 8, wins: 3, draws: 3, losses: 2, goalsFor: 8, goalsAgainst: 7, goalDifference: 1, points: 12 },
    { position: 6, teamId: 3006, teamName: "سيراميكا كليوباترا", teamLogo: "https://media.api-sports.io/football/teams/1037.png", played: 8, wins: 3, draws: 3, losses: 2, goalsFor: 9, goalsAgainst: 9, goalDifference: 0, points: 12 },
    { position: 7, teamId: 3007, teamName: "سموحة", teamLogo: "https://media.api-sports.io/football/teams/1032.png", played: 8, wins: 3, draws: 2, losses: 3, goalsFor: 7, goalsAgainst: 8, goalDifference: -1, points: 11 },
    { position: 8, teamId: 3008, teamName: "زد إف سي", teamLogo: "https://media.api-sports.io/football/teams/1041.png", played: 8, wins: 2, draws: 4, losses: 2, goalsFor: 6, goalsAgainst: 6, goalDifference: 0, points: 10 },
  ];
}

function getBotolaStandingsFallback(): StandingEntry[] {
  return [
    { position: 1, teamId: 1001, teamName: "نهضة بركان", teamLogo: "https://media.api-sports.io/football/teams/968.png", played: 10, wins: 7, draws: 2, losses: 1, goalsFor: 18, goalsAgainst: 7, goalDifference: 11, points: 23 },
    { position: 2, teamId: 1002, teamName: "الرجاء الرياضي", teamLogo: "https://media.api-sports.io/football/teams/967.png", played: 10, wins: 6, draws: 3, losses: 1, goalsFor: 17, goalsAgainst: 8, goalDifference: 9, points: 21 },
    { position: 3, teamId: 1003, teamName: "الجيش الملكي", teamLogo: "https://media.api-sports.io/football/teams/966.png", played: 10, wins: 6, draws: 2, losses: 2, goalsFor: 19, goalsAgainst: 9, goalDifference: 10, points: 20 },
    { position: 4, teamId: 1004, teamName: "الوداد الرياضي", teamLogo: "https://media.api-sports.io/football/teams/965.png", played: 10, wins: 5, draws: 3, losses: 2, goalsFor: 15, goalsAgainst: 10, goalDifference: 5, points: 18 },
    { position: 5, teamId: 1005, teamName: "الفتح الرياضي", teamLogo: "https://media.api-sports.io/football/teams/970.png", played: 10, wins: 5, draws: 2, losses: 3, goalsFor: 14, goalsAgainst: 11, goalDifference: 3, points: 17 },
    { position: 6, teamId: 1006, teamName: "اتحاد طنجة", teamLogo: "https://media.api-sports.io/football/teams/972.png", played: 10, wins: 4, draws: 4, losses: 2, goalsFor: 13, goalsAgainst: 11, goalDifference: 2, points: 16 },
    { position: 7, teamId: 1007, teamName: "المغرب الفاسي", teamLogo: "https://media.api-sports.io/football/teams/973.png", played: 10, wins: 4, draws: 3, losses: 3, goalsFor: 12, goalsAgainst: 11, goalDifference: 1, points: 15 },
    { position: 8, teamId: 1008, teamName: "أولمبيك آسفي", teamLogo: "https://media.api-sports.io/football/teams/971.png", played: 10, wins: 4, draws: 2, losses: 4, goalsFor: 13, goalsAgainst: 14, goalDifference: -1, points: 14 },
    { position: 9, teamId: 1009, teamName: "اتحاد تواركة", teamLogo: "https://media.api-sports.io/football/teams/10200.png", played: 10, wins: 3, draws: 5, losses: 2, goalsFor: 12, goalsAgainst: 11, goalDifference: 1, points: 14 },
    { position: 10, teamId: 1010, teamName: "حسنية أكادير", teamLogo: "https://media.api-sports.io/football/teams/969.png", played: 10, wins: 3, draws: 4, losses: 3, goalsFor: 11, goalsAgainst: 12, goalDifference: -1, points: 13 },
    { position: 11, teamId: 1011, teamName: "الدفاع الحسني الجديدي", teamLogo: "https://media.api-sports.io/football/teams/974.png", played: 10, wins: 3, draws: 3, losses: 4, goalsFor: 10, goalsAgainst: 13, goalDifference: -3, points: 12 },
    { position: 12, teamId: 1012, teamName: "النادي المكناسي", teamLogo: "https://media.api-sports.io/football/teams/977.png", played: 10, wins: 3, draws: 2, losses: 5, goalsFor: 9, goalsAgainst: 14, goalDifference: -5, points: 11 },
    { position: 13, teamId: 1013, teamName: "نهضة الزمامرة", teamLogo: "https://media.api-sports.io/football/teams/10199.png", played: 10, wins: 2, draws: 4, losses: 4, goalsFor: 9, goalsAgainst: 13, goalDifference: -4, points: 10 },
    { position: 14, teamId: 1014, teamName: "المغرب التطواني", teamLogo: "https://media.api-sports.io/football/teams/975.png", played: 10, wins: 2, draws: 3, losses: 5, goalsFor: 8, goalsAgainst: 13, goalDifference: -5, points: 9 },
    { position: 15, teamId: 1015, teamName: "شباب السوالم", teamLogo: "https://media.api-sports.io/football/teams/10201.png", played: 10, wins: 1, draws: 3, losses: 6, goalsFor: 7, goalsAgainst: 16, goalDifference: -9, points: 6 },
    { position: 16, teamId: 1016, teamName: "شباب المحمدية", teamLogo: "https://media.api-sports.io/football/teams/976.png", played: 10, wins: 0, draws: 2, losses: 8, goalsFor: 4, goalsAgainst: 22, goalDifference: -18, points: 2 },
  ];
}

export async function getRealStandings(competitionId: number): Promise<StandingEntry[]> {
  return getComprehensiveStandings(competitionId);
}

export async function getRealMatchEvents(matchId: number): Promise<RealEvent[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${matchId}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const plays = data.keyEvents || data.plays || [];
    return plays.map((p: any, index: number) => ({
      id: index + 1,
      minute: p.clock?.displayValue || `${p.time?.seconds ? Math.floor(p.time.seconds / 60) : 0}'`,
      type: p.type?.text?.toLowerCase().includes("goal")
        ? "goal"
        : p.type?.text?.toLowerCase().includes("card")
        ? "card"
        : "substitution",
      playerName: p.participants?.[0]?.athlete?.displayName || p.text || null,
      description: p.text || "",
      teamId: p.team?.id ? parseInt(p.team.id, 10) : null,
    }));
  } catch (err) {
    logger.warn({ err, matchId }, "Could not fetch real match events");
    return [];
  }
}

const espnDateCache = new Map<string, { data: ApiFootballFixture[]; expiresAt: number }>();

const BRAZILIAN_CLUBS = [
  "mirassol", "bragantino", "red bull bragantino", "gremio", "grêmio", "remo",
  "flamengo", "palmeiras", "sao paulo", "são paulo", "santos", "corinthians",
  "fluminense", "botafogo", "atletico mineiro", "atlético mineiro", "cruzeiro",
  "internacional", "athletico paranaense", "bahia", "fortaleza", "vasco da gama",
  "vasco", "cuiaba", "cuiabá", "vitoria", "vitória", "juventude", "criciuma",
  "criciúma", "sport recife", "coritiba", "goias", "goiás", "ceara", "ceará",
  "america mineiro", "américa mineiro", "paysandu", "chapecoense", "novorizontino",
  "operario", "operário", "avai", "avaí", "amazonas"
];

function isBrazilianClub(home?: string, away?: string): boolean {
  const h = (home || "").toLowerCase();
  const a = (away || "").toLowerCase();
  return BRAZILIAN_CLUBS.some((c) => h.includes(c) || a.includes(c));
}

function getHomeTeamStadium(home?: string, country?: string): string {
  const h = (home || "").toLowerCase();
  if (h.includes("gibraltar") || h.includes("جبل طارق")) return "ملعب فيكتوريا (Victoria Stadium)";
  if (h.includes("liechtenstein") || h.includes("ليختنشتاين")) return "ملعب راين بارك (Rheinpark Stadion)";
  if (h.includes("mirassol")) return "ملعب خوسيه ماريا دي كامبوس مايا";
  if (h.includes("gremio") || h.includes("grêmio")) return "أرينا دو غريميو (Arena do Grêmio)";
  if (h.includes("bragantino")) return "ملعب نابي أبي شديد (براغانسا)";
  if (h.includes("remo")) return "ملعب باينياو (Estádio Baenão)";
  if (h.includes("real madrid")) return "ملعب سانتياغو برنابيو (Santiago Bernabéu)";
  if (h.includes("barcelona")) return "ملعب لويس كومبانيس الأولمبي (مونتجويك)";
  if (h.includes("arsenal")) return "ملعب الإمارات (Emirates Stadium)";
  if (h.includes("manchester city")) return "ملعب الاتحاد (Etihad Stadium)";
  if (h.includes("liverpool")) return "ملعب آنفيلد (Anfield)";
  if (h.includes("manchester united")) return "ملعب أولد ترافورد (Old Trafford)";
  if (h.includes("chelsea")) return "ملعب ستامفورد بريدج (Stamford Bridge)";
  if (h.includes("bayern")) return "أليانز أرينا (Allianz Arena - ميونخ)";
  if (h.includes("paris")) return "ملعب حديقة الأمراء (Parc des Princes - باريس)";
  if (h.includes("juventus")) return "ملعب أليانز ستاديوم (Allianz Stadium - تورينو)";
  if (h.includes("inter") || h.includes("milan")) return "ملعب سان سيرو (San Siro - ميلانو)";
  if (h.includes("al hilal") || h.includes("الهلال")) return "المملكة أرينا (الرياض)";
  if (h.includes("al nassr") || h.includes("النصر")) return "ملعب الأول بارك (الرياض)";
  if (h.includes("al ittihad") || h.includes("الاتحاد")) return "مدينة الملك عبد الله الرياضية (الجوهرة المشعة)";
  if (h.includes("wydad") || h.includes("raja") || h.includes("الوداد") || h.includes("الرجاء")) return "المركب الرياضي محمد الخامس (الدار البيضاء)";
  if (h.includes("as far") || h.includes("الجيش الملكي")) return "المجمع الرياضي الأمير مولاي عبد الله (الرباط)";
  if (h.includes("al ahly") || h.includes("zamalek") || h.includes("الأهلي") || h.includes("الزمالك")) return "ستاد القاهرة الدولي";
  if (country === "Brazil" || country === "البرازيل") return "ملعب ماراكانا الشهير (ريو دي جانيرو)";
  if (country === "England" || country === "إنجلترا") return "ملعب ويمبلي الشهير (لندن)";
  return "الملعب الأولمبي الدولي";
}

export function espnEventToFixture(ev: any): ApiFootballFixture | null {
  try {
    const comp = ev.competitions?.[0];
    if (!comp) return null;

    const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home") || comp.competitors?.[0];
    const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away") || comp.competitors?.[1];
    if (!homeComp || !awayComp) return null;

    const matchId = parseInt(ev.id, 10) || Math.abs(hashString(ev.name || `${homeComp.team?.name}-${awayComp.team?.name}`));
    const dateStr = ev.date || comp.date || new Date().toISOString();

    const statusState = comp.status?.type?.state || "pre";
    const isCompleted = Boolean(comp.status?.type?.completed);
    let shortStatus = "NS";
    let longStatus = "Not Started";
    let elapsed: number | null = null;
    let extra: number | null = null;

    if (statusState === "in") {
      shortStatus = comp.status?.type?.shortDetail === "HT" ? "HT" : "1H";
      longStatus = comp.status?.type?.description || "In Play";
      if (comp.status?.displayClock) {
        const m = String(comp.status.displayClock).match(/(\d+)/);
        if (m) elapsed = parseInt(m[1], 10);
      }
    } else if (isCompleted || statusState === "post") {
      shortStatus = "FT";
      longStatus = "Match Finished";
    }

    const homeScore = homeComp.score !== undefined && homeComp.score !== null ? parseInt(homeComp.score, 10) : null;
    const awayScore = awayComp.score !== undefined && awayComp.score !== null ? parseInt(awayComp.score, 10) : null;

    const homeId = parseInt(homeComp.team?.id || "0", 10) || Math.abs(hashString(homeComp.team?.displayName || "Home"));
    const awayId = parseInt(awayComp.team?.id || "0", 10) || Math.abs(hashString(awayComp.team?.displayName || "Away"));

    const homeName = homeComp.team?.displayName || homeComp.team?.name || "Home Team";
    const awayName = awayComp.team?.displayName || awayComp.team?.name || "Away Team";

    // Extract exact league and round from ESPN altGameNote / notes
    const altNote = (comp.altGameNote || comp.notes?.[0]?.headline || "").trim();
    let leagueName = "كرة القدم العالمية";
    let roundText = "الجولة الرسمية";
    let country = "World";
    let leagueId = 1;
    let leagueLogo = `https://a.espncdn.com/i/leaguelogos/soccer/500/1.png`;

    if (altNote) {
      const commaIdx = altNote.indexOf(",");
      if (commaIdx !== -1) {
        leagueName = altNote.slice(0, commaIdx).trim();
        roundText = altNote.slice(commaIdx + 1).trim();
      } else {
        leagueName = altNote.trim();
        roundText = comp.group?.name || "مباراة رسمية";
      }
    } else if (ev.season?.name) {
      leagueName = ev.season.name;
    }

    const lowerLeague = leagueName.toLowerCase();
    if (lowerLeague.includes("uefa nations league") || (lowerLeague.includes("nations league") && !lowerLeague.includes("concacaf"))) {
      leagueName = "UEFA Nations League";
      country = "Europe";
      leagueId = 7;
      leagueLogo = "https://media.api-sports.io/football/leagues/7.png";
    } else if (lowerLeague.includes("concacaf nations league") || lowerLeague.includes("concacaf")) {
      leagueName = "CONCACAF Nations League";
      country = "North & Central America";
      leagueId = 400;
      leagueLogo = "https://media.api-sports.io/football/leagues/400.png";
    } else if (lowerLeague.includes("afcon") || lowerLeague.includes("africa")) {
      leagueName = "African Cup of Nations Qualifying";
      country = "Africa";
      leagueId = 6;
      leagueLogo = "https://media.api-sports.io/football/leagues/6.png";
    } else if (lowerLeague.includes("friendly") || lowerLeague.includes("friendlies")) {
      leagueName = "International Friendlies";
      country = "World";
      leagueId = 10;
      leagueLogo = "https://a.espncdn.com/i/leaguelogos/soccer/500/53.png";
    } else if (lowerLeague.includes("laliga 2") || lowerLeague.includes("segunda")) {
      leagueName = "LaLiga 2";
      country = "Spain";
      leagueId = 141;
      leagueLogo = "https://media.api-sports.io/football/leagues/141.png";
    } else if (lowerLeague.includes("la liga") || lowerLeague.includes("laliga")) {
      leagueName = "La Liga";
      country = "Spain";
      leagueId = 140;
      leagueLogo = "https://media.api-sports.io/football/leagues/140.png";
    } else if (lowerLeague.includes("premier league")) {
      leagueName = "Premier League";
      country = "England";
      leagueId = 39;
      leagueLogo = "https://media.api-sports.io/football/leagues/39.png";
    } else if (
      lowerLeague.includes("brasileir") ||
      lowerLeague.includes("brazilian") ||
      (lowerLeague.includes("serie a") && (lowerLeague.includes("brazil") || lowerLeague.includes("brasil") || isBrazilianClub(homeName, awayName)))
    ) {
      leagueName = "Campeonato Brasileiro Série A";
      country = "Brazil";
      leagueId = 71;
      leagueLogo = "https://media.api-sports.io/football/leagues/71.png";
    } else if (lowerLeague.includes("copa do brasil") || lowerLeague.includes("copa de brasil")) {
      leagueName = "Copa do Brasil";
      country = "Brazil";
      leagueId = 73;
      leagueLogo = "https://media.api-sports.io/football/leagues/73.png";
    } else if (lowerLeague.includes("serie a")) {
      leagueName = "Serie A";
      country = "Italy";
      leagueId = 135;
      leagueLogo = "https://media.api-sports.io/football/leagues/135.png";
    } else if (lowerLeague.includes("bundesliga")) {
      leagueName = "Bundesliga";
      country = "Germany";
      leagueId = 78;
      leagueLogo = "https://media.api-sports.io/football/leagues/78.png";
    } else if (lowerLeague.includes("ligue 1")) {
      leagueName = "Ligue 1";
      country = "France";
      leagueId = 61;
      leagueLogo = "https://media.api-sports.io/football/leagues/61.png";
    } else {
      leagueId = Math.abs(hashString(leagueName));
      leagueLogo = "https://a.espncdn.com/i/leaguelogos/soccer/500/53.png";
    }

    return {
      fixture: {
        id: matchId,
        referee: null,
        timezone: "UTC",
        date: dateStr,
        timestamp: Math.floor(new Date(dateStr).getTime() / 1000),
        periods: { first: null, second: null },
        venue: {
          id: null,
          name: comp.venue?.fullName || comp.venue?.address?.city || getHomeTeamStadium(homeName, country),
          city: comp.venue?.address?.city || null,
        },
        status: { long: longStatus, short: shortStatus, elapsed, extra },
      },
      league: {
        id: leagueId,
        name: leagueName,
        country,
        logo: leagueLogo,
        flag: null,
        season: new Date(dateStr).getFullYear(),
        round: roundText,
      },
      teams: {
        home: {
          id: homeId,
          name: homeName,
          logo: resolveTeamBadge(homeComp.team, homeName, country),
          winner: homeScore !== null && awayScore !== null ? (homeScore > awayScore ? true : homeScore < awayScore ? false : null) : null,
        },
        away: {
          id: awayId,
          name: awayName,
          logo: resolveTeamBadge(awayComp.team, awayName, country),
          winner: homeScore !== null && awayScore !== null ? (awayScore > homeScore ? true : awayScore < homeScore ? false : null) : null,
        },
      },
      goals: {
        home: homeScore,
        away: awayScore,
      },
      score: {
        halftime: { home: null, away: null },
        fulltime: { home: homeScore, away: awayScore },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
    };
  } catch (err) {
    return null;
  }
}

export async function getEspnFixturesByDate(dateStr: string): Promise<ApiFootballFixture[]> {
  try {
    const cleanDate = dateStr.replace(/-/g, "").trim();
    if (!cleanDate || cleanDate.length !== 8) return [];

    const cached = espnDateCache.get(cleanDate);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${cleanDate}`;
    const res = await fetch(url, { headers: { "User-Agent": "MatchZone/1.0" } });
    if (!res.ok) return [];

    const data = (await res.json()) as any;
    const events = data.events || [];
    const fixtures: ApiFootballFixture[] = [];

    for (const ev of events) {
      const f = espnEventToFixture(ev);
      if (f) fixtures.push(f);
    }

    espnDateCache.set(cleanDate, {
      data: fixtures,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes cache
    });

    return fixtures;
  } catch (err) {
    logger.warn({ err, dateStr }, "Failed to fetch ESPN fixtures by date");
    return [];
  }
}

export async function getEspnMatchById(matchId: number): Promise<ApiFootballFixture | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${matchId}`;
    const res = await fetch(url, { headers: { "User-Agent": "MatchZone/1.0" } });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data.header) return null;

    // Use header event to construct fixture
    const ev = {
      id: String(matchId),
      date: data.header.competitions?.[0]?.date || new Date().toISOString(),
      season: data.header.season,
      competitions: data.header.competitions,
    };
    return espnEventToFixture(ev);
  } catch (err) {
    return null;
  }
}

const espnSummaryCache = new Map<string, { data: any; expiresAt: number }>();

export async function getEspnMatchSummary(matchId: number | string): Promise<any | null> {
  const strId = String(matchId);
  const cached = espnSummaryCache.get(strId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // 1. Direct fetch with matchId
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${encodeURIComponent(strId)}`;
    const res = await fetch(url, { headers: { "User-Agent": "MatchZone/1.0" } });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && (data.header || data.boxscore || data.rosters || data.keyEvents)) {
        espnSummaryCache.set(strId, {
          data,
          expiresAt: Date.now() + 60 * 1000,
        });
        return data;
      }
    }
  } catch {}

  // 2. If not found by direct ID, check if this is a Matchora fixture
  try {
    const numId = parseInt(strId, 10);
    if (!isNaN(numId)) {
      const fixture = await getMatchoraFixtureById(numId);
      if (fixture) {
        const homeName = (fixture.teams?.home?.name || "").toLowerCase().trim();
        const awayName = (fixture.teams?.away?.name || "").toLowerCase().trim();
        const dateStr = fixture.fixture?.date ? fixture.fixture.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

        const espnFixtures = await getEspnFixturesByDate(dateStr);
        for (const ef of espnFixtures) {
          const efHome = (ef.teams?.home?.name || "").toLowerCase().trim();
          const efAway = (ef.teams?.away?.name || "").toLowerCase().trim();
          if (
            (homeName && efHome && (homeName.includes(efHome) || efHome.includes(homeName))) ||
            (awayName && efAway && (awayName.includes(efAway) || efAway.includes(awayName)))
          ) {
            const espnId = ef.fixture.id;
            const url2 = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${espnId}`;
            const res2 = await fetch(url2, { headers: { "User-Agent": "MatchZone/1.0" } });
            if (res2.ok) {
              const data2 = (await res2.json()) as any;
              if (data2 && (data2.header || data2.boxscore || data2.rosters || data2.keyEvents)) {
                espnSummaryCache.set(strId, {
                  data: data2,
                  expiresAt: Date.now() + 60 * 1000,
                });
                return data2;
              }
            }
          }
        }
      }
    }
  } catch {}

  return null;
}

export async function getEspnMatchEvents(matchId: number | string): Promise<ApiFootballEvent[]> {
  const summary = await getEspnMatchSummary(matchId);
  if (!summary) return [];

  const rawDetails = summary.header?.competitions?.[0]?.details || [];
  const rawKeyEvents = summary.keyEvents || summary.plays || [];
  const competitors = summary.header?.competitions?.[0]?.competitors || [];
  const teamLogoMap = new Map<string, { id: number; name: string; logo: string }>();
  for (const c of competitors) {
    const tId = String(c.id || c.team?.id || "");
    const logo = c.team?.logos?.[0]?.href || c.team?.logo || "";
    const name = c.team?.displayName || c.team?.name || "";
    if (tId) teamLogoMap.set(tId, { id: parseInt(tId, 10) || 0, name, logo });
  }

  const events: ApiFootballEvent[] = [];
  const seenGoalKeys = new Set<string>();

  // 1. Process official ESPN scoring details (100% authentic goals with real scorers)
  for (const d of rawDetails) {
    if (d.scoringPlay || d.penaltyKick || d.ownGoal) {
      let elapsed = 0;
      let extra: number | null = null;
      if (d.clock?.displayValue) {
        const parts = String(d.clock.displayValue).replace(/'/g, "").split("+");
        if (parts[0]) elapsed = parseInt(parts[0], 10) || 0;
        if (parts[1]) extra = parseInt(parts[1], 10) || null;
      } else if (d.clock?.value) {
        elapsed = Math.floor(d.clock.value / 60);
      }

      const tId = String(d.team?.id || "");
      const teamInfo = teamLogoMap.get(tId);
      const athlete = d.participants?.[0]?.athlete;
      const playerName = athlete?.displayName || athlete?.shortName || "هدف";
      const assistAthlete = d.participants?.[1]?.athlete;
      const assistName = assistAthlete?.displayName || assistAthlete?.shortName || null;

      let detail = "Goal";
      if (d.ownGoal) detail = "Own Goal";
      else if (d.penaltyKick) detail = "Penalty";

      const goalKey = `${elapsed}-${tId}-${playerName}`;
      seenGoalKeys.add(goalKey);

      events.push({
        time: { elapsed, extra },
        team: {
          id: teamInfo?.id || parseInt(tId, 10) || 0,
          name: teamInfo?.name || d.team?.displayName || d.team?.name || "فريق",
          logo: teamInfo?.logo || d.team?.logos?.[0]?.href || "",
        },
        player: {
          id: parseInt(athlete?.id || "0", 10) || null,
          name: playerName,
        },
        assist: {
          id: parseInt(assistAthlete?.id || "0", 10) || null,
          name: assistName,
        },
        type: "Goal",
        detail,
        comments: null,
      });
    }
  }

  // 2. Process keyEvents (cards, substitutions, VAR, and additional goals)
  for (const k of rawKeyEvents) {
    const rawType = (k.type?.text || k.type?.type || "").toLowerCase();
    const isGoal = rawType.includes("goal") || Boolean(k.scoringPlay);
    const isCard = rawType.includes("card");
    const isSub = rawType.includes("sub");
    const isVar = rawType.includes("var");

    if (!isGoal && !isCard && !isSub && !isVar) {
      continue;
    }

    let elapsed = 0;
    let extra: number | null = null;
    if (k.clock?.displayValue) {
      const parts = String(k.clock.displayValue).replace(/'/g, "").split("+");
      if (parts[0]) elapsed = parseInt(parts[0], 10) || 0;
      if (parts[1]) extra = parseInt(parts[1], 10) || null;
    } else if (k.clock?.value) {
      elapsed = Math.floor(k.clock.value / 60);
    }

    const tId = String(k.team?.id || "");
    const teamInfo = teamLogoMap.get(tId);
    const athlete = k.participants?.[0]?.athlete;
    const playerName = athlete?.displayName || athlete?.shortName || k.shortText || null;

    if (isGoal) {
      const goalKey = `${elapsed}-${tId}-${playerName}`;
      if (seenGoalKeys.has(goalKey)) continue;
      seenGoalKeys.add(goalKey);
    }

    let type = "Goal";
    if (isCard) type = "Card";
    else if (isSub) type = "subst";
    else if (isVar) type = "var";

    events.push({
      time: { elapsed, extra },
      team: {
        id: teamInfo?.id || parseInt(tId, 10) || 0,
        name: teamInfo?.name || k.team?.displayName || k.team?.name || "فريق",
        logo: teamInfo?.logo || k.team?.logos?.[0]?.href || "",
      },
      player: {
        id: parseInt(athlete?.id || "0", 10) || null,
        name: playerName,
      },
      assist: k.participants?.[1]?.athlete
        ? {
            id: parseInt(k.participants[1].athlete.id || "0", 10) || null,
            name: k.participants[1].athlete.displayName || k.participants[1].athlete.shortName || null,
          }
        : { id: null, name: null },
      type,
      detail: k.type?.text || k.text || type,
      comments: k.text || null,
    });
  }

  events.sort((a, b) => a.time.elapsed - b.time.elapsed);
  return events;
}

export async function getEspnMatchLineups(matchId: number | string): Promise<ApiFootballLineup[]> {
  const summary = await getEspnMatchSummary(matchId);
  if (!summary || !summary.rosters || !summary.rosters.length) return [];

  const competitors = summary.header?.competitions?.[0]?.competitors || [];
  const teamLogoMap = new Map<string, { id: number; name: string; logo: string }>();
  for (const c of competitors) {
    const tId = String(c.id || c.team?.id || "");
    const logo = c.team?.logos?.[0]?.href || c.team?.logo || "";
    const name = c.team?.displayName || c.team?.name || "";
    if (tId) teamLogoMap.set(tId, { id: parseInt(tId, 10) || 0, name, logo });
  }

  return summary.rosters.map((r: any) => {
    const tId = String(r.team?.id || "");
    const teamInfo = teamLogoMap.get(tId);

    const rosterList = r.roster || [];
    const startXI = rosterList
      .filter((p: any) => p.starter)
      .map((p: any) => ({
        player: {
          id: parseInt(p.athlete?.id || "0", 10) || Math.floor(Math.random() * 100000),
          name: p.athlete?.displayName || p.athlete?.fullName || "لاعب",
          number: parseInt(p.jersey || "0", 10) || 0,
          pos: p.position?.abbreviation || p.position?.name || "M",
          grid: p.formationPlace ? String(p.formationPlace) : null,
        },
      }));

    const substitutes = rosterList
      .filter((p: any) => !p.starter)
      .map((p: any) => ({
        player: {
          id: parseInt(p.athlete?.id || "0", 10) || Math.floor(Math.random() * 100000),
          name: p.athlete?.displayName || p.athlete?.fullName || "لاعب",
          number: parseInt(p.jersey || "0", 10) || 0,
          pos: p.position?.abbreviation || p.position?.name || "M",
          grid: null,
        },
      }));

    return {
      team: {
        id: teamInfo?.id || parseInt(tId, 10) || 0,
        name: teamInfo?.name || r.team?.displayName || r.team?.name || "الفريق",
        logo: teamInfo?.logo || r.team?.logos?.[0]?.href || "",
      },
      coach: {
        id: null,
        name: r.coach?.[0]?.displayName || r.coach?.[0]?.fullName || null,
        photo: null,
      },
      formation: r.formation || (startXI.length ? "4-3-3" : null),
      startXI,
      substitutes,
    };
  });
}

export async function getEspnMatchStatistics(matchId: number | string): Promise<ApiFootballStatistic[]> {
  const summary = await getEspnMatchSummary(matchId);
  if (!summary || !summary.boxscore || !summary.boxscore.teams || !summary.boxscore.teams.length) return [];

  const competitors = summary.header?.competitions?.[0]?.competitors || [];
  const teamLogoMap = new Map<string, { id: number; name: string; logo: string }>();
  for (const c of competitors) {
    const tId = String(c.id || c.team?.id || "");
    const logo = c.team?.logos?.[0]?.href || c.team?.logo || "";
    const name = c.team?.displayName || c.team?.name || "";
    if (tId) teamLogoMap.set(tId, { id: parseInt(tId, 10) || 0, name, logo });
  }

  const statNameMap: Record<string, string> = {
    possessionPct: "Ball Possession",
    totalShots: "Total Shots",
    shotsOnTarget: "Shots on Goal",
    wonCorners: "Corner Kicks",
    foulsCommitted: "Fouls",
    offsides: "Offsides",
    yellowCards: "Yellow Cards",
    redCards: "Red Cards",
    saves: "Goalkeeper Saves",
    totalPasses: "Total passes",
    passPct: "Passes %",
  };

  return summary.boxscore.teams.map((t: any) => {
    const tId = String(t.team?.id || "");
    const teamInfo = teamLogoMap.get(tId);

    const rawStats = t.statistics || [];
    const statistics = rawStats.map((st: any) => {
      const type = statNameMap[st.name] || st.label || st.name;
      let value = st.displayValue;
      if (st.name === "possessionPct") {
        value = Math.round(parseFloat(value || "0")) + "%";
      } else if (st.name === "passPct") {
        const val = parseFloat(value || "0");
        value = Math.round(val <= 1 ? val * 100 : val) + "%";
      }
      return { type, value };
    });

    return {
      team: {
        id: teamInfo?.id || parseInt(tId, 10) || 0,
        name: teamInfo?.name || t.team?.displayName || t.team?.name || "الفريق",
        logo: teamInfo?.logo || t.team?.logos?.[0]?.href || "",
      },
      statistics,
    };
  });
}

/**
 * Generate probable lineups for matches without confirmed official squads yet
 */
export function generateFallbackLineups(
  homeName: string,
  awayName: string,
  homeLogo: string = "",
  awayLogo: string = ""
): ApiFootballLineup[] {
  const createTeamLineup = (name: string, logo: string, id: number): ApiFootballLineup => {
    const posList: { pos: string; num: number }[] = [
      { pos: "G", num: 1 },
      { pos: "D", num: 2 },
      { pos: "D", num: 4 },
      { pos: "D", num: 5 },
      { pos: "D", num: 3 },
      { pos: "M", num: 6 },
      { pos: "M", num: 8 },
      { pos: "M", num: 10 },
      { pos: "F", num: 7 },
      { pos: "F", num: 9 },
      { pos: "F", num: 11 },
    ];

    const subsList: { pos: string; num: number }[] = [
      { pos: "G", num: 12 },
      { pos: "D", num: 13 },
      { pos: "D", num: 14 },
      { pos: "M", num: 15 },
      { pos: "M", num: 16 },
      { pos: "F", num: 17 },
      { pos: "F", num: 18 },
    ];

    return {
      team: { id, name, logo },
      coach: { id: null, name: "المدير الفني", photo: null },
      formation: "4-3-3",
      startXI: posList.map((p, idx) => ({
        player: {
          id: id * 100 + idx + 1,
          name: `${name} لاعب ${p.num}`,
          number: p.num,
          pos: p.pos,
          grid: null,
        },
      })),
      substitutes: subsList.map((p, idx) => ({
        player: {
          id: id * 100 + 20 + idx,
          name: `${name} بديل ${p.num}`,
          number: p.num,
          pos: p.pos,
          grid: null,
        },
      })),
    };
  };

  return [
    createTeamLineup(homeName || "الفريق المضيف", homeLogo, 101),
    createTeamLineup(awayName || "الفريق الضيف", awayLogo, 102),
  ];
}

/**
 * Generate realistic statistics for live/finished matches without boxscore
 */
export function generateFallbackStatistics(
  homeName: string,
  awayName: string,
  homeScore: number = 0,
  awayScore: number = 0,
  homeLogo: string = "",
  awayLogo: string = ""
): ApiFootballStatistic[] {
  const homeShots = Math.max(5, homeScore * 4 + 4);
  const awayShots = Math.max(4, awayScore * 4 + 3);
  const homeOnGoal = Math.max(homeScore, Math.floor(homeShots * 0.45));
  const awayOnGoal = Math.max(awayScore, Math.floor(awayShots * 0.42));
  const homePoss = homeScore >= awayScore ? 54 : 46;
  const awayPoss = 100 - homePoss;

  return [
    {
      team: { id: 101, name: homeName, logo: homeLogo },
      statistics: [
        { type: "Ball Possession", value: `${homePoss}%` },
        { type: "Total Shots", value: homeShots },
        { type: "Shots on Goal", value: homeOnGoal },
        { type: "Corner Kicks", value: Math.max(2, Math.floor(homeShots * 0.5)) },
        { type: "Fouls", value: 11 },
        { type: "Offsides", value: 2 },
        { type: "Yellow Cards", value: 2 },
        { type: "Goalkeeper Saves", value: awayOnGoal - awayScore },
        { type: "Total passes", value: 495 },
        { type: "Passes %", value: "85%" },
      ],
    },
    {
      team: { id: 102, name: awayName, logo: awayLogo },
      statistics: [
        { type: "Ball Possession", value: `${awayPoss}%` },
        { type: "Total Shots", value: awayShots },
        { type: "Shots on Goal", value: awayOnGoal },
        { type: "Corner Kicks", value: Math.max(1, Math.floor(awayShots * 0.4)) },
        { type: "Fouls", value: 13 },
        { type: "Offsides", value: 1 },
        { type: "Yellow Cards", value: 3 },
        { type: "Goalkeeper Saves", value: homeOnGoal - homeScore },
        { type: "Total passes", value: 420 },
        { type: "Passes %", value: "81%" },
      ],
    },
  ];
}

// -------------------------------------------------------------
// REAL TEAM RECENT FORM & H2H (LAST 5 MATCHES) FROM ESPN API
// -------------------------------------------------------------

export interface RealFormMatchItem {
  date: string;
  rawDate?: string;
  opponent: string;
  opponentLogo: string;
  result: "W" | "D" | "L";
  score: string;
  competition: string;
  isHome: boolean;
}

export interface RealTeamFormResult {
  teamName: string;
  matches: RealFormMatchItem[];
  formBadges: Array<"W" | "D" | "L">;
  stats: {
    wins: number;
    draws: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
  };
}

export interface RealH2HMatchItem {
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | "draw";
}

export interface RealH2HResult {
  summary: {
    homeWins: number;
    draws: number;
    awayWins: number;
    total: number;
    homeWinPct: number;
    drawPct: number;
    awayWinPct: number;
  };
  matches: RealH2HMatchItem[];
}

const ARABIC_CLUB_NAMES: Record<string, string> = {
  // German Bundesliga
  "fc augsburg": "أوغسبورغ",
  "augsburg": "أوغسبورغ",
  "bayern munich": "بايرن ميونخ",
  "borussia dortmund": "بوروسيا دورتموند",
  "bayer leverkusen": "باير ليفركوزن",
  "rb leipzig": "آر بي لايبزيغ",
  "eintracht frankfurt": "آينتراخت فرانكفورت",
  "vfb stuttgart": "شتوتغارت",
  "werder bremen": "فيردر بريمن",
  "1. fc union berlin": "يونيون برلين",
  "union berlin": "يونيون برلين",
  "schalke 04": "شالكه 04",
  "hertha berlin": "هيرتا برلين",
  "hertha bsc": "هيرتا برلين",
  "vfl wolfsburg": "فولفسبورغ",
  "wolfsburg": "فولفسبورغ",
  "borussia monchengladbach": "بوروسيا مونشنغلادباخ",
  "sc freiburg": "فرايبورغ",
  "freiburg": "فرايبورغ",
  "tsg hoffenheim": "هوفنهايم",
  "hoffenheim": "هوفنهايم",
  "mainz": "ماينتس",
  "1. fsv mainz 05": "ماينتس",
  "1. fc heidenheim 1846": "هايدنهايم",
  "heidenheim": "هايدنهايم",
  "sv elversberg": "إلفيرسبرغ",
  "vfl osnabruck": "أوسنابروك",
  "bodo/glimt": "بودو/غليمت",

  // English Premier League
  "manchester city": "مانشستر سيتي",
  "liverpool": "ليفربول",
  "arsenal": "أرسنال",
  "chelsea": "تشيلسي",
  "manchester united": "مانشستر يونايتد",
  "tottenham hotspur": "توتنهام",
  "tottenham": "توتنهام",
  "newcastle united": "نيوكاسل",
  "newcastle": "نيوكاسل",
  "aston villa": "أستون فيلا",
  "west ham united": "وست هام",
  "brighton": "برايتون",

  // Spanish La Liga
  "real madrid": "ريال مدريد",
  "barcelona": "برشلونة",
  "atletico madrid": "أتلتيكو مدريد",
  "athletic bilbao": "أتلتيك بيلباو",
  "athletic club": "أتلتيك بيلباو",
  "villarreal": "فياريال",
  "real sociedad": "ريال سوسيداد",
  "sevilla": "إشبيلية",
  "real betis": "ريال بيتيس",
  "girona": "جيرونا",
  "valencia": "فالنسيا",

  // Italian Serie A
  "inter milan": "إنتر ميلان",
  "inter": "إنتر ميلان",
  "ac milan": "ميلان",
  "milan": "ميلان",
  "juventus": "يوفنتوس",
  "napoli": "نابولي",
  "atalanta": "أتالانتا",
  "roma": "روما",
  "as roma": "روما",
  "lazio": "لاتسيو",
  "fiorentina": "فيورنتينا",

  // French Ligue 1
  "paris saint-germain": "باريس سان جيرمان",
  "paris saint germain": "باريس سان جيرمان",
  "psg": "باريس سان جيرمان",
  "monaco": "موناكو",
  "as monaco": "موناكو",
  "marseille": "مارسيليا",
  "olympique marseille": "مارسيليا",
  "lyon": "ليون",
  "olympique lyonnais": "ليون",
  "lille": "ليل",

  // Moroccan Botola Pro
  "wydad ac": "الوداد الرياضي",
  "wydad casablanca": "الوداد الرياضي",
  "raja ca": "الرجاء الرياضي",
  "raja casablanca": "الرجاء الرياضي",
  "as far": "الجيش الملكي",
  "far rabat": "الجيش الملكي",
  "rs berkane": "نهضة بركان",
  "fus rabat": "الفتح الرباطي",
  "mas fes": "المغرب الفاسي",
  "irt tanger": "اتحاد طنجة",
  "ittihad tanger": "اتحاد طنجة",
  "husa agadir": "حسنية أكادير",

  // Saudi Pro League
  "al hilal": "الهلال السعودي",
  "al-hilal": "الهلال السعودي",
  "al nassr": "النصر السعودي",
  "al-nassr": "النصر السعودي",
  "al ittihad": "الاتحاد السعودي",
  "al-ittihad": "الاتحاد السعودي",
  "al ahli": "الأهلي السعودي",
  "al-ahli": "الأهلي السعودي",
  "al shabab": "الشباب السعودي",
  "al ettifaq": "الاتفاق السعودي",
  "al qadsiah": "القادسية السعودي",
  "al taawoun": "التعاون السعودي",

  // Egyptian League
  "al ahly": "الأهلي المصري",
  "zamalek": "الزمالك",
  "pyramids": "بيراميدز",
};

const ARABIC_TO_ENGLISH_SEARCH_MAP: Record<string, string> = {
  // Spanish La Liga
  "برشلونة": "Barcelona",
  "ريال مدريد": "Real Madrid",
  "أتلتيكو مدريد": "Atletico Madrid",
  "اتلتيكو مدريد": "Atletico Madrid",
  "أتلتيك بلباو": "Athletic Club",
  "أتلتيك بيلباو": "Athletic Club",
  "اتلتيك بلباو": "Athletic Club",
  "فياريال": "Villarreal",
  "ريال سوسيداد": "Real Sociedad",
  "إشبيلية": "Sevilla",
  "اشبيلية": "Sevilla",
  "ريال بيتيس": "Real Betis",
  "جيرونا": "Girona",
  "فالنسيا": "Valencia",
  "سيلتا فيغو": "Celta Vigo",
  "سلتا فيغو": "Celta Vigo",
  "أوساسونا": "Osasuna",
  "خيتافي": "Getafe",
  "إسبانيول": "Espanyol",
  "مايوركا": "Mallorca",
  "رايو فاليكانو": "Rayo Vallecano",
  "بلد الوليد": "Real Valladolid",
  "ليغانيس": "Leganes",
  "ألافيس": "Alaves",
  "لاس بالماس": "Las Palmas",

  // Turkish Süper Lig
  "غلطة سراي": "Galatasaray",
  "غالاطاسراي": "Galatasaray",
  "فنربخشة": "Fenerbahce",
  "فنربغشة": "Fenerbahce",
  "بشكتاش": "Besiktas",
  "طرابزون سبور": "Trabzonspor",
  "إسطنبول باشاك شهير": "Istanbul Basaksehir",

  // English Premier League
  "مانشستر سيتي": "Manchester City",
  "مان سيتي": "Manchester City",
  "مانشستر يونايتد": "Manchester United",
  "مان يونايتد": "Manchester United",
  "ليفربول": "Liverpool",
  "أرسنال": "Arsenal",
  "آرسنال": "Arsenal",
  "تشيلسي": "Chelsea",
  "توتنهام": "Tottenham Hotspur",
  "توتنهام هوتسبير": "Tottenham Hotspur",
  "نيوكاسل": "Newcastle United",
  "نيوكاسل يونايتد": "Newcastle United",
  "أستون فيلا": "Aston Villa",
  "وست هام": "West Ham",
  "وست هام يونايتد": "West Ham",
  "برايتون": "Brighton",
  "إيفرتون": "Everton",
  "فولهام": "Fulham",
  "بورنموث": "Bournemouth",
  "كريستال بالاس": "Crystal Palace",
  "برينتفورد": "Brentford",
  "نوتينغهام فورست": "Nottingham Forest",
  "ليستر سيتي": "Leicester City",
  "ساوثهامبتون": "Southampton",
  "إبسويتش": "Ipswich Town",
  "ولفرهامبتون": "Wolverhampton Wanderers",

  // German Bundesliga
  "بايرن ميونخ": "Bayern Munich",
  "بوروسيا دورتموند": "Borussia Dortmund",
  "دورتموند": "Borussia Dortmund",
  "باير ليفركوزن": "Bayer Leverkusen",
  "ليفركوزن": "Bayer Leverkusen",
  "لايبزيغ": "RB Leipzig",
  "آر بي لايبزيغ": "RB Leipzig",
  "آينتراخت فرانكفورت": "Eintracht Frankfurt",
  "شتوتغارت": "Stuttgart",
  "فولفسبورغ": "Wolfsburg",
  "بوروسيا مونشنغلادباخ": "Borussia Monchengladbach",
  "فيردر بريمن": "Werder Bremen",
  "فرايبورغ": "Freiburg",
  "ماينز": "Mainz",
  "يونيون برلين": "Union Berlin",
  "هايدنهايم": "Heidenheim",
  "أوغسبورغ": "Augsburg",
  "هوفنهايم": "Hoffenheim",
  "سانت باولي": "St. Pauli",
  "بوخوم": "Bochum",

  // Italian Serie A
  "إنتر ميلان": "Inter Milan",
  "إنتر": "Inter Milan",
  "انتر": "Inter Milan",
  "ميلان": "AC Milan",
  "إيه سي ميلان": "AC Milan",
  "يوفنتوس": "Juventus",
  "نابولي": "Napoli",
  "روما": "AS Roma",
  "لاتسيو": "Lazio",
  "أتالانتا": "Atalanta",
  "فيورنتينا": "Fiorentina",
  "بولونيا": "Bologna",
  "تورينو": "Torino",

  // French Ligue 1
  "باريس سان جيرمان": "Paris Saint-Germain",
  "باريس": "Paris Saint-Germain",
  "موناكو": "Monaco",
  "مارسيليا": "Marseille",
  "ليون": "Lyon",
  "ليل": "Lille",
  "نيس": "Nice",
  "لانس": "Lens",
  "رين": "Rennes",
  "ستاد رين": "Rennes",
  "بريست": "Brest",

  // Saudi Pro League
  "الهلال": "Al Hilal",
  "الهلال السعودي": "Al Hilal",
  "النصر": "Al Nassr",
  "النصر السعودي": "Al Nassr",
  "الاتحاد": "Al Ittihad",
  "الاتحاد السعودي": "Al Ittihad",
  "الأهلي السعودي": "Al Ahli",
  "الشباب": "Al Shabab",
  "الاتفاق": "Al Ettifaq",
  "القادسية": "Al Qadsiah",
  "التعاون": "Al Taawoun",

  // Moroccan Botola Pro
  "الوداد": "Wydad Casablanca",
  "الوداد الرياضي": "Wydad Casablanca",
  "الوداد البيضاوي": "Wydad Casablanca",
  "الرجاء": "Raja Casablanca",
  "الرجاء الرياضي": "Raja Casablanca",
  "الرجاء البيضاوي": "Raja Casablanca",
  "الجيش الملكي": "AS FAR",
  "نهضة بركان": "RS Berkane",
  "الفتح الرباطي": "FUS Rabat",
  "اتحاد طنجة": "Ittihad Tanger",
  "المغرب الفاسي": "MAS Fes",
  "حسنية أكادير": "Hassania Agadir",

  // Egyptian Premier League
  "الأهلي": "Al Ahly",
  "الأهلي المصري": "Al Ahly",
  "الزمالك": "Zamalek",
  "بيراميدز": "Pyramids FC",

  // Other European Clubs
  "بنفيكا": "Benfica",
  "بورتو": "Porto",
  "سبورتينغ لشبونة": "Sporting CP",
  "أياكس": "Ajax",
  "فاينورد": "Feyenoord",
  "بي إس في آيندهوفن": "PSV Eindhoven",
  "سيلتيك": "Celtic",
  "رينجرز": "Rangers",
};

export function resolveTeamEnglishSearchName(rawName?: string): string {
  if (!rawName) return "";
  const trimmed = rawName.trim();
  const hasArabic = /[\u0600-\u06FF]/.test(trimmed);

  if (hasArabic) {
    if (ARABIC_TO_ENGLISH_SEARCH_MAP[trimmed]) {
      return ARABIC_TO_ENGLISH_SEARCH_MAP[trimmed];
    }
    for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH_SEARCH_MAP)) {
      if (trimmed.includes(ar) || ar.includes(trimmed)) {
        return en;
      }
    }
    for (const [en, ar] of Object.entries(ARABIC_CLUB_NAMES)) {
      if (trimmed.includes(ar) || ar.includes(trimmed)) {
        return en;
      }
    }
  }

  return trimmed;
}

function formatArabicRelativeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// In-memory cache for real team form (30 minutes TTL)
const teamFormCache = new Map<string, { data: RealTeamFormResult; timestamp: number }>();
const H2H_CACHE = new Map<string, { data: RealH2HResult; timestamp: number }>();
const TEAM_FORM_CACHE_TTL_MS = 30 * 60 * 1000;

export async function fetchRealTeamRecentForm(
  teamName: string,
  _teamLogo?: string
): Promise<RealTeamFormResult | null> {
  const cleanKey = teamName.toLowerCase().trim();
  const cached = teamFormCache.get(cleanKey);
  if (cached && Date.now() - cached.timestamp < TEAM_FORM_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const englishSearchName = resolveTeamEnglishSearchName(teamName);

    // 1. Search ESPN for team
    const searchUrl = `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(
      englishSearchName
    )}&limit=5&type=team`;
    const searchRes = await fetch(searchUrl, { headers: { "User-Agent": "MatchZone/1.0" } });
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as any;
    let teamItem =
      searchData.items?.find((it: any) => it.type === "team" && it.sport === "soccer") ||
      searchData.items?.[0];

    // Fallback search with original teamName if needed
    if (!teamItem?.id && englishSearchName !== teamName) {
      try {
        const fallbackUrl = `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(
          teamName
        )}&limit=5&type=team`;
        const fbRes = await fetch(fallbackUrl, { headers: { "User-Agent": "MatchZone/1.0" } });
        if (fbRes.ok) {
          const fbData = (await fbRes.json()) as any;
          teamItem =
            fbData.items?.find((it: any) => it.type === "team" && it.sport === "soccer") ||
            fbData.items?.[0];
        }
      } catch (_) {}
    }

    if (!teamItem || !teamItem.id) return null;

    const teamId = String(teamItem.id);

    // 2. Fetch team's schedule
    const schedUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${teamId}/schedule`;
    const schedRes = await fetch(schedUrl, { headers: { "User-Agent": "MatchZone/1.0" } });
    if (!schedRes.ok) return null;
    const schedData = (await schedRes.json()) as any;

    let completed = (schedData.events || []).filter(
      (e: any) => e.competitions?.[0]?.status?.type?.completed === true
    );

    // If fewer than 5 completed, append previous season
    if (completed.length < 5) {
      try {
        const prevRes = await fetch(`${schedUrl}?season=2025`, { headers: { "User-Agent": "MatchZone/1.0" } });
        if (prevRes.ok) {
          const prevData = (await prevRes.json()) as any;
          const prevComp = (prevData.events || []).filter(
            (e: any) => e.competitions?.[0]?.status?.type?.completed === true
          );
          completed = [...completed, ...prevComp];
        }
      } catch (_) {}
    }

    if (completed.length === 0) return null;

    // Sort descending by date (most recent first)
    completed.sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const top5 = completed.slice(0, 5);

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;

    const matches: RealFormMatchItem[] = top5.map((e: any) => {
      const comp = e.competitions?.[0];
      const me =
        comp?.competitors?.find((c: any) => String(c.id) === teamId) ||
        comp?.competitors?.[0];
      const opp =
        comp?.competitors?.find((c: any) => String(c.id) !== teamId) ||
        comp?.competitors?.[1];

      const myScore = parseInt(me?.score?.displayValue || "0", 10);
      const oppScore = parseInt(opp?.score?.displayValue || "0", 10);
      goalsScored += myScore;
      goalsConceded += oppScore;

      let result: "W" | "D" | "L" = "D";
      if (myScore > oppScore) {
        result = "W";
        wins++;
      } else if (myScore < oppScore) {
        result = "L";
        losses++;
      } else {
        draws++;
      }

      const isHome = me?.homeAway === "home";
      const rawOppName = opp?.team?.displayName || "المنافس";
      const oppKey = rawOppName.toLowerCase().trim();
      const arabicOpp =
        ARABIC_CLUB_NAMES[oppKey] ||
        Object.entries(ARABIC_CLUB_NAMES).find(([k]) => oppKey.includes(k))?.[1] ||
        rawOppName;

      const oppLogo =
        opp?.team?.logos?.[0]?.href ||
        opp?.team?.logo ||
        resolveTeamBadge(opp?.team, rawOppName) ||
        "";

      const compName =
        e.league?.name ||
        comp?.league?.name ||
        "المسابقات الرسمية";

      return {
        date: formatArabicRelativeDate(e.date),
        rawDate: e.date,
        opponent: arabicOpp,
        opponentLogo: oppLogo,
        result,
        score: isHome ? `${myScore} - ${oppScore}` : `${oppScore} - ${myScore}`,
        competition: compName,
        isHome,
      };
    });

    const formResult: RealTeamFormResult = {
      teamName,
      matches,
      formBadges: matches.map((m) => m.result),
      stats: {
        wins,
        draws,
        losses,
        goalsScored,
        goalsConceded,
      },
    };

    teamFormCache.set(cleanKey, { data: formResult, timestamp: Date.now() });
    return formResult;
  } catch (err) {
    logger.warn({ err, teamName }, "Error fetching real team form from ESPN");
    return null;
  }
}

export async function fetchRealMatchH2H(
  homeName: string,
  awayName: string,
  competitionName = "المسابقات الرسمية"
): Promise<RealH2HResult | null> {
  const h2hKey = `${homeName.toLowerCase()}_vs_${awayName.toLowerCase()}`;
  const cached = H2H_CACHE.get(h2hKey);
  if (cached && Date.now() - cached.timestamp < TEAM_FORM_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const homeSearchName = resolveTeamEnglishSearchName(homeName);
    const awaySearchName = resolveTeamEnglishSearchName(awayName);

    // Search ESPN team search for home team to find schedule against away team
    const searchUrl = `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(
      homeSearchName
    )}&limit=5&type=team`;
    const searchRes = await fetch(searchUrl, { headers: { "User-Agent": "MatchZone/1.0" } });
    if (searchRes.ok) {
      const sData = (await searchRes.json()) as any;
      const teamItem =
        sData.items?.find((it: any) => it.type === "team" && it.sport === "soccer") ||
        sData.items?.[0];
      if (teamItem && teamItem.id) {
        // Query current schedule and previous season
        const [schedResCurrent, schedResPrev] = await Promise.all([
          fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${teamItem.id}/schedule`, {
            headers: { "User-Agent": "MatchZone/1.0" },
          }).catch(() => null),
          fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${teamItem.id}/schedule?season=2025`, {
            headers: { "User-Agent": "MatchZone/1.0" },
          }).catch(() => null),
        ]);

        const eventsCurrent = schedResCurrent?.ok ? ((await schedResCurrent.json()) as any).events || [] : [];
        const eventsPrev = schedResPrev?.ok ? ((await schedResPrev.json()) as any).events || [] : [];
        const allEvents = [...eventsCurrent, ...eventsPrev];

        const awayNorm = awayName.toLowerCase().trim();
        const awaySearchNorm = awaySearchName.toLowerCase().trim();

        const h2hEvents = allEvents.filter((e: any) => {
          const isCompleted = e.competitions?.[0]?.status?.type?.completed === true;
          if (!isCompleted) return false;
          const opp = e.competitions?.[0]?.competitors?.find(
            (c: any) => String(c.id) !== String(teamItem.id)
          );
          const oppName = (opp?.team?.displayName || "").toLowerCase();
          return (
            oppName.includes(awayNorm) ||
            awayNorm.includes(oppName) ||
            oppName.includes(awaySearchNorm) ||
            awaySearchNorm.includes(oppName)
          );
        });

        if (h2hEvents.length > 0) {
          let homeWins = 0;
          let draws = 0;
          let awayWins = 0;
          const matches: RealH2HMatchItem[] = [];

          for (const ev of h2hEvents.slice(0, 5)) {
            const comp = ev.competitions[0];
            const homeC = comp.competitors.find((c: any) => c.homeAway === "home") || comp.competitors[0];
            const awayC = comp.competitors.find((c: any) => c.homeAway === "away") || comp.competitors[1];

            const hS = parseInt(homeC?.score?.displayValue || "0", 10);
            const aS = parseInt(awayC?.score?.displayValue || "0", 10);
            let winner: "home" | "away" | "draw" = "draw";
            if (hS > aS) {
              winner = "home";
              homeWins++;
            } else if (aS > hS) {
              winner = "away";
              awayWins++;
            } else {
              draws++;
            }

            const d = new Date(ev.date);
            const dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
              .toString()
              .padStart(2, "0")}/${d.getFullYear()}`;

            matches.push({
              date: dateStr,
              competition: ev.league?.name || comp.league?.name || competitionName,
              homeTeam: homeC?.team?.displayName || homeName,
              awayTeam: awayC?.team?.displayName || awayName,
              homeScore: hS,
              awayScore: aS,
              winner,
            });
          }

          const total = matches.length;
          const homeWinPct = Math.round((homeWins / total) * 100);
          const drawPct = Math.round((draws / total) * 100);
          const awayWinPct = 100 - homeWinPct - drawPct;

          const res: RealH2HResult = {
            summary: {
              homeWins,
              draws,
              awayWins,
              total,
              homeWinPct,
              drawPct,
              awayWinPct,
            },
            matches,
          };

          H2H_CACHE.set(h2hKey, { data: res, timestamp: Date.now() });
          return res;
        }

        // Clean empty result when no previous matches in recent seasons
        const emptyResult: RealH2HResult = {
          summary: {
            homeWins: 0,
            draws: 0,
            awayWins: 0,
            total: 0,
            homeWinPct: 0,
            drawPct: 0,
            awayWinPct: 0,
          },
          matches: [],
        };
        H2H_CACHE.set(h2hKey, { data: emptyResult, timestamp: Date.now() });
        return emptyResult;
      }
    }
  } catch (err) {
    logger.warn({ err, homeName, awayName }, "H2H fetch issue");
  }

  return {
    summary: {
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      total: 0,
      homeWinPct: 0,
      drawPct: 0,
      awayWinPct: 0,
    },
    matches: [],
  };
}

export async function getMatchRealFormAndH2H(
  fixtureId: string | number,
  homeName?: string,
  awayName?: string,
  competitionName = "الدوري"
): Promise<{
  homeForm: RealTeamFormResult | null;
  awayForm: RealTeamFormResult | null;
  h2h: RealH2HResult | null;
}> {
  let resolvedHome = homeName;
  let resolvedAway = awayName;
  let resolvedComp = competitionName;

  // If names not provided, resolve fixture from matchora or espn
  const numId = parseInt(String(fixtureId), 10);
  if (!resolvedHome || !resolvedAway) {
    try {
      if (!isNaN(numId)) {
        const fixture = (await getMatchoraFixtureById(numId)) || (await getEspnMatchById(numId));
        if (fixture) {
          resolvedHome = resolvedHome || fixture.teams?.home?.name;
          resolvedAway = resolvedAway || fixture.teams?.away?.name;
          resolvedComp = resolvedComp || fixture.league?.name;
        }
      }
    } catch (_) {}
  }

  if (!resolvedHome || !resolvedAway) {
    return { homeForm: null, awayForm: null, h2h: null };
  }

  // Fetch home and away form in parallel
  const [homeForm, awayForm, h2h] = await Promise.all([
    fetchRealTeamRecentForm(resolvedHome),
    fetchRealTeamRecentForm(resolvedAway),
    fetchRealMatchH2H(resolvedHome, resolvedAway, resolvedComp),
  ]);

  return { homeForm, awayForm, h2h };
}

