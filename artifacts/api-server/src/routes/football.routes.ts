import { Router, type Request, type Response } from "express";
import {
  getLiveFixtures as getApiFootballLiveFixtures,
  getFixturesByDate as getApiFootballFixturesByDate,
  getFixturesByLeagueAndSeason,
  getFixtureById as getApiFootballFixtureById,
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStatistics,
  getLeagueStandings as getApiFootballLeagueStandings,
  ApiFootballError,
  type ApiFootballFixture,
} from "../services/api-football.service";
import {
  getFootballDataLiveFixtures,
  getFootballDataFixturesByDate,
  getFootballDataRecentMatches,
  getFootballDataMatchById,
  getFootballDataStandings,
  FootballDataError,
} from "../services/football-data.service";
import {
  getMatchoraLiveFixtures,
  getMatchoraFixtures,
  getMatchoraFixtureById,
} from "../services/matchora.service";
import {
  getEspnFixturesByDate,
  getEspnMatchById,
  getEspnMatchEvents,
  getEspnMatchLineups,
  getEspnMatchStatistics,
  generateFallbackLineups,
  generateFallbackStatistics,
  getComprehensiveStandings,
} from "../services/football.service";
import { SUPPORTED_COMPETITIONS, ACTIVE_COMPETITION_IDS } from "../config/competitions.config";
import { env } from "../config/env";
import { asyncHandler } from "../utils/async-handler";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Helper error handler for Football calls
 */
function handleFootballError(err: any, res: Response) {
  if (err instanceof ApiFootballError || err instanceof FootballDataError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  res.status(500).json({
    error: err.message || "Unable to fetch football data.",
    code: "INTERNAL_ERROR",
  });
}

// Allowed Major Competitions:
// 1. Big 5 Leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)
// 2. UEFA Champions League & European Cups
// 3. National Teams & International Tournaments (World Cup, Euro, AFCON, Copa America, Friendlies, etc.)
export const MAJOR_LEAGUE_IDS = new Set([
  // Big 5:
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A
  78,   // Bundesliga
  61,   // Ligue 1

  // European Competitions:
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  848,  // UEFA Europa Conference League
  531,  // UEFA Super Cup

  // National Teams / International:
  1,    // FIFA World Cup
  29, 30, 31, 32, 33, 34, 35, // World Cup Qualifications
  4,    // UEFA Euro
  5,    // UEFA Euro Qualification
  7,    // UEFA Nations League
  6,    // Africa Cup of Nations (CAN/AFCON)
  36,   // Africa Cup of Nations Qualification
  9,    // Copa America
  10,   // International Friendlies
  667,  // Friendlies National
  15,   // AFC Asian Cup
  16, 17, // Asian Cup Qualifiers
  22,   // CONCACAF Gold Cup
  400,  // CONCACAF Nations League
  28,   // Arab Cup

  // Football-Data.org IDs:
  2021, // PL
  2014, // PD (La Liga)
  2019, // SA (Serie A)
  2002, // BL1 (Bundesliga)
  2015, // FL1 (Ligue 1)
  2001, // CL (Champions League)
  2146, // Europa League
  2000, // World Cup
  2018, // European Championship
]);

export function isMajorCompetition(f: ApiFootballFixture): boolean {
  if (!f || !f.league) return false;

  const name = (f.league.name || "").toLowerCase().trim();
  const country = (f.league.country || "").toLowerCase().trim();
  const home = (f.teams?.home?.name || "").toLowerCase().trim();
  const away = (f.teams?.away?.name || "").toLowerCase().trim();

  // 1. Strictly reject Women, Youth, U-teams, Club Friendlies, Lower divisions
  const isYouthOrLower =
    name.includes("women") || name.includes("féminin") || name.includes("femme") ||
    home.endsWith(" w") || away.endsWith(" w") || home.includes("women") || away.includes("women") ||
    name.includes("club") || // Rejects "Friendlies Clubs"
    /\bu-?1[5-9]\b/i.test(name) || /\bu-?2[0-3]\b/i.test(name) ||
    /\bu-?1[5-9]\b/i.test(home) || /\bu-?2[0-3]\b/i.test(home) ||
    /\bu-?1[5-9]\b/i.test(away) || /\bu-?2[0-3]\b/i.test(away) ||
    name.includes("youth") || name.includes("reserve") || name.includes("2nd") || name.includes("division 2") ||
    name.includes("serie b") || name.includes("serie c") || name.includes("segunda") || name.includes("championship") ||
    name.includes("league one") || name.includes("league two") || name.includes("ligue 2") || name.includes("2. bundesliga");

  if (isYouthOrLower) return false;

  const leagueId = Number(f.league.id);

  // Big 5 exact IDs & strict countries (rejection of Ghana, Bhutan, Peru, etc.)
  if ([39, 2021].includes(leagueId)) return country === "england" || country === "";
  if ([140, 2014].includes(leagueId)) return country === "spain" || country === "";
  if ([135, 2019].includes(leagueId)) return country === "italy" || country === "";
  if ([78, 2002].includes(leagueId)) return country === "germany" || country === "";
  if ([61, 2015].includes(leagueId)) return country === "france" || country === "";

  // Big 5 by country AND name
  if (country === "england" && (name === "premier league" || name.includes("premier league"))) return true;
  if (country === "spain" && (name === "la liga" || name === "primera división" || name.includes("la liga"))) return true;
  if (country === "italy" && (name === "serie a" || name.includes("serie a"))) return true;
  if (country === "germany" && (name === "bundesliga" || name.includes("bundesliga"))) return true;
  if (country === "france" && (name === "ligue 1" || name.includes("ligue 1"))) return true;

  // Champions League & European Cups
  if ([2, 2001].includes(leagueId) || name.includes("uefa champions league") || name.includes("champions league")) return true;
  if ([3, 2146].includes(leagueId) || name.includes("uefa europa league") || name.includes("europa league")) return true;
  if (leagueId === 848 || name.includes("uefa conference league") || name.includes("conference league")) return true;
  if (leagueId === 531 || name.includes("uefa super cup")) return true;

  // National Teams / International
  // World Cup & Qualifiers
  if (leagueId === 1 || leagueId === 2000 || name.includes("world cup") || name.includes("fifa")) return true;
  // Euro & Qualifiers
  if (leagueId === 4 || leagueId === 5 || leagueId === 2018 || (name.includes("euro") && (name.includes("championship") || name.includes("qualification")))) return true;
  // UEFA Nations League
  if (leagueId === 7 || (name.includes("nations league") && !name.includes("concacaf"))) return true;
  // CONCACAF Nations League & Gold Cup
  if (leagueId === 400 || leagueId === 22 || name.includes("concacaf nations league") || name.includes("concacaf gold cup") || name.includes("concacaf")) return true;
  // AFCON / CAN
  if (leagueId === 6 || leagueId === 36 || name.includes("africa cup") || name.includes("afcon") || name.includes("coupe d'afrique") || name.includes("can ") || name.startsWith("can")) return true;
  // Copa America
  if (leagueId === 9 || name.includes("copa america") || name.includes("copa américa")) return true;
  // Asian Cup
  if ([15, 16, 17].includes(leagueId) || name.includes("asian cup")) return true;
  // Senior International Friendlies
  if ((leagueId === 10 || leagueId === 667 || name.includes("friend")) && (country === "world" || country === "international")) {
    return true;
  }

  return false;
}

export function normalizeTeamName(name: string): string {
  let s = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\u0600-\u06FF]/g, "")
    .replace(/^(fc|cf|sc|ac|fk|sk|cd|ca|as)/g, "")
    .replace(/(fc|cf|sc|ac|fk|sk|cd|ca|as)$/g, "")
    .trim();

  // Common international and club aliases
  if (
    s === "usa" ||
    s === "unitedstates" ||
    s === "usmnt" ||
    s === "الولاياتالمتحدة" ||
    s === "الولاياتالمتحدةالامريكية" ||
    s === "امريكا"
  ) {
    return "usa";
  }
  if (s.includes("papuanewguinea") || s.includes("بابوا")) {
    return "papuanewguinea";
  }
  if (s.includes("solomonislands") || s.includes("جزرسليمان")) {
    return "solomonislands";
  }
  if (s.includes("southkorea") || s.includes("korearepublic") || s.includes("كوريالجنوبية")) {
    return "southkorea";
  }
  if (s.includes("northkorea") || s.includes("koreadpr") || s.includes("كوريالشمالية")) {
    return "northkorea";
  }
  if (s.includes("ivorycoast") || s.includes("cotedivoire") || s.includes("ساحلالعاج")) {
    return "ivorycoast";
  }
  if (s.includes("drcongo") || s.includes("congodr") || s.includes("جمهوريةالكونغو")) {
    return "drcongo";
  }
  if (s.includes("capeverde") || s.includes("caboverde") || s.includes("الراسالاخضر")) {
    return "capeverde";
  }
  if (s.includes("czech") || s.includes("التشيك")) {
    return "czechia";
  }
  if (s.includes("uae") || s.includes("unitedarabemirates") || s.includes("الامارات")) {
    return "uae";
  }
  if (s.includes("saudi") || s.includes("السعودية")) {
    return "saudiarabia";
  }
  if (s.includes("chile") || s.includes("تشيلي")) {
    return "chile";
  }
  if (s.includes("mexico") || s.includes("المكسيك")) {
    return "mexico";
  }
  if (s.includes("peru") || s.includes("بيرو")) {
    return "peru";
  }
  if (s.includes("argentina") || s.includes("الارجنتين")) {
    return "argentina";
  }
  if (s.includes("brazil") || s.includes("البرازيل")) {
    return "brazil";
  }
  if (s.includes("colombia") || s.includes("كولومبيا")) {
    return "colombia";
  }
  if (s.includes("uruguay") || s.includes("اوروغواي")) {
    return "uruguay";
  }
  if (s.includes("paraguay") || s.includes("باراغواي")) {
    return "paraguay";
  }
  if (s.includes("bolivia") || s.includes("بوليفيا")) {
    return "bolivia";
  }
  if (s.includes("venezuela") || s.includes("فنزويلا")) {
    return "venezuela";
  }
  if (s.includes("ecuador") || s.includes("الاكوادور")) {
    return "ecuador";
  }
  if (s.includes("morocco") || s.includes("المغرب")) {
    return "morocco";
  }
  if (s.includes("egypt") || s.includes("مصر")) {
    return "egypt";
  }
  if (s.includes("algeria") || s.includes("الجزائر")) {
    return "algeria";
  }
  if (s.includes("tunisia") || s.includes("تونس")) {
    return "tunisia";
  }
  if (s.includes("spain") || s.includes("اسبانيا")) {
    return "spain";
  }
  if (s.includes("france") || s.includes("فرنسا")) {
    return "france";
  }
  if (s.includes("germany") || s.includes("المانيا")) {
    return "germany";
  }
  if (s.includes("italy") || s.includes("ايطاليا")) {
    return "italy";
  }
  if (s.includes("england") || s.includes("انجلترا")) {
    return "england";
  }
  if (s.includes("portugal") || s.includes("البرتغال")) {
    return "portugal";
  }
  if (s.includes("netherlands") || s.includes("holland") || s.includes("هولندا")) {
    return "netherlands";
  }
  if (s.includes("belgium") || s.includes("بلجيكا")) {
    return "belgium";
  }
  if (s.includes("croatia") || s.includes("كرواتيا")) {
    return "croatia";
  }
  if (s.includes("turkey") || s.includes("turkiye") || s.includes("türkiye") || s.includes("تركيا")) {
    return "turkey";
  }
  if (s.includes("bosnia") || s.includes("البوسنة")) {
    return "bosnia";
  }
  if (s.includes("ireland") || s.includes("ايرلندا") || s.includes("أيرلندا")) {
    if (s.includes("northern") || s.includes("الشمالية")) return "northernireland";
    return "ireland";
  }
  if (s.includes("slovakia") || s.includes("سلوفاكيا")) {
    return "slovakia";
  }
  if (s.includes("slovenia") || s.includes("سلوفينيا")) {
    return "slovenia";
  }
  if (s.includes("sweden") || s.includes("السويد")) {
    return "sweden";
  }
  if (s.includes("poland") || s.includes("بولندا")) {
    return "poland";
  }
  if (s.includes("ukraine") || s.includes("اوكرانيا") || s.includes("أوكرانيا")) {
    return "ukraine";
  }
  if (s.includes("romania") || s.includes("رومانيا")) {
    return "romania";
  }
  if (s.includes("moldova") || s.includes("مولدوفا")) {
    return "moldova";
  }
  if (s.includes("kazakhstan") || s.includes("كازاخستان")) {
    return "kazakhstan";
  }
  if (s.includes("cyprus") || s.includes("قبرص")) {
    return "cyprus";
  }
  if (s.includes("armenia") || s.includes("ارمينيا") || s.includes("أرمينيا")) {
    return "armenia";
  }
  if (s.includes("latvia") || s.includes("لاتفيا")) {
    return "latvia";
  }
  if (s.includes("montenegro") || s.includes("الجبلالاسود") || s.includes("الجبلالأسود")) {
    return "montenegro";
  }
  if (s.includes("faroe") || s.includes("فارو")) {
    return "faroe";
  }
  if (s.includes("georgia") || s.includes("جورجيا")) {
    return "georgia";
  }
  if (s.includes("azerbaijan") || s.includes("اذربيجان") || s.includes("أذربيجان")) {
    return "azerbaijan";
  }
  if (s.includes("hungary") || s.includes("المجر")) {
    return "hungary";
  }
  if (s.includes("bulgaria") || s.includes("بلغاريا")) {
    return "bulgaria";
  }
  if (s.includes("finland") || s.includes("فنلندا")) {
    return "finland";
  }
  if (s.includes("iceland") || s.includes("ايسلندا") || s.includes("آيسلندا")) {
    return "iceland";
  }
  if (s.includes("albania") || s.includes("البانيا") || s.includes("ألبانيا")) {
    return "albania";
  }
  if (s.includes("macedonia") || s.includes("مقدونيا")) {
    return "northmacedonia";
  }
  if (s.includes("greece") || s.includes("اليونان")) {
    return "greece";
  }
  if (s.includes("norway") || s.includes("النرويج")) {
    return "norway";
  }
  if (s.includes("austria") || s.includes("النمسا")) {
    return "austria";
  }
  if (s.includes("denmark") || s.includes("الدانمارك") || s.includes("الدنمارك")) {
    return "denmark";
  }
  if (s.includes("scotland") || s.includes("اسكتلندا") || s.includes("إسكتلندا")) {
    return "scotland";
  }
  if (s.includes("wales") || s.includes("ويلز")) {
    return "wales";
  }
  if (s.includes("serbia") || s.includes("صربيا")) {
    return "serbia";
  }
  if (s.includes("luxembourg") || s.includes("لوكسمبورغ") || s.includes("لوكسمبورج")) {
    return "luxembourg";
  }
  if (s.includes("belarus") || s.includes("بيلاروسيا")) {
    return "belarus";
  }
  if (s.includes("lithuania") || s.includes("ليتوانيا")) {
    return "lithuania";
  }
  if (s.includes("estonia") || s.includes("استونيا") || s.includes("إستونيا")) {
    return "estonia";
  }
  if (s.includes("kosovo") || s.includes("كوسوفو")) {
    return "kosovo";
  }
  if (s.includes("malta") || s.includes("مالطا")) {
    return "malta";
  }
  if (s.includes("andorra") || s.includes("اندورا") || s.includes("أندورا")) {
    return "andorra";
  }
  if (s.includes("sanmarino") || s.includes("سانمارينو")) {
    return "sanmarino";
  }
  if (s.includes("gibraltar") || s.includes("جبلطارق")) {
    return "gibraltar";
  }

  return s;
}

export function areMatchesSame(
  homeA: string,
  awayA: string,
  homeB: string,
  awayB: string
): boolean {
  const hA = normalizeTeamName(homeA);
  const aA = normalizeTeamName(awayA);
  const hB = normalizeTeamName(homeB);
  const aB = normalizeTeamName(awayB);

  if (!hA || !aA || !hB || !aB) return false;

  const direct =
    (hA === hB || hA.includes(hB) || hB.includes(hA)) &&
    (aA === aB || aA.includes(aB) || aB.includes(aA));
  const reversed =
    (hA === aB || hA.includes(aB) || aB.includes(hA)) &&
    (aA === hB || aA.includes(hB) || hB.includes(aA));

  return direct || reversed;
}

export function deduplicateFixtures(fixtures: ApiFootballFixture[]): ApiFootballFixture[] {
  const result: ApiFootballFixture[] = [];

  for (const fixture of fixtures) {
    const homeName = fixture.teams?.home?.name || "";
    const awayName = fixture.teams?.away?.name || "";
    const fixtureId = fixture.fixture?.id;

    const existingIndex = result.findIndex((existing) => {
      if (existing.fixture?.id === fixtureId) return true;
      return areMatchesSame(
        homeName,
        awayName,
        existing.teams?.home?.name || "",
        existing.teams?.away?.name || ""
      );
    });

    if (existingIndex === -1) {
      result.push(fixture);
    } else {
      const existing = result[existingIndex];
      const isExistingLive =
        existing.fixture?.status?.short === "1H" ||
        existing.fixture?.status?.short === "2H" ||
        existing.fixture?.status?.short === "HT" ||
        existing.fixture?.status?.short === "LIVE";
      const isNewLive =
        fixture.fixture?.status?.short === "1H" ||
        fixture.fixture?.status?.short === "2H" ||
        fixture.fixture?.status?.short === "HT" ||
        fixture.fixture?.status?.short === "LIVE";

      const existingId = Number(existing.fixture.id);
      const newId = Number(fixture.fixture.id);
      const isNewMatchora = newId < 10000000;
      const isExistingMatchora = existingId < 10000000;

      // Always prefer the live fixture over a scheduled one
      if (isNewLive && !isExistingLive) {
        if (!fixture.teams.home.logo && existing.teams.home.logo) {
          fixture.teams.home.logo = existing.teams.home.logo;
        }
        if (!fixture.teams.away.logo && existing.teams.away.logo) {
          fixture.teams.away.logo = existing.teams.away.logo;
        }
        result[existingIndex] = fixture;
        continue;
      } else if (!isNewLive && isExistingLive) {
        if (!existing.teams.home.logo && fixture.teams.home.logo) {
          existing.teams.home.logo = fixture.teams.home.logo;
        }
        if (!existing.teams.away.logo && fixture.teams.away.logo) {
          existing.teams.away.logo = fixture.teams.away.logo;
        }
        continue;
      }

      if (isNewMatchora && !isExistingMatchora) {
        if (!fixture.teams.home.logo && existing.teams.home.logo) {
          fixture.teams.home.logo = existing.teams.home.logo;
        }
        if (!fixture.teams.away.logo && existing.teams.away.logo) {
          fixture.teams.away.logo = existing.teams.away.logo;
        }
        if (
          fixture.league.name === "كرة القدم العالمية" &&
          existing.league.name !== "كرة القدم العالمية"
        ) {
          fixture.league = existing.league;
        }
        result[existingIndex] = fixture;
      } else if (isExistingMatchora && !isNewMatchora) {
        if (!existing.teams.home.logo && fixture.teams.home.logo) {
          existing.teams.home.logo = fixture.teams.home.logo;
        }
        if (!existing.teams.away.logo && fixture.teams.away.logo) {
          existing.teams.away.logo = fixture.teams.away.logo;
        }
        if (
          existing.league.name === "كرة القدم العالمية" &&
          fixture.league.name !== "كرة القدم العالمية"
        ) {
          existing.league = fixture.league;
        }
        if (isNewLive && (!isExistingLive || (fixture.fixture.status.elapsed && !existing.fixture.status.elapsed))) {
          existing.fixture.status = fixture.fixture.status;
          existing.goals = fixture.goals;
        }
      } else {
        if (isNewLive && (!isExistingLive || (fixture.fixture.status.elapsed && !existing.fixture.status.elapsed))) {
          result[existingIndex] = fixture;
        }
      }
    }
  }

  return result;
}

/**
 * GET /api/football/live
 * Real currently live matches (Filtered to Big 5, Champions League, and National Teams)
 */
router.get(
  "/live",
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      // 1. Try Matchora first (Free, reliable, no API key needed, has active streams!)
      let matchoraLive: ApiFootballFixture[] = [];
      try {
        const live = await getMatchoraLiveFixtures();
        matchoraLive = (live || []).filter(
          (f) => f.fixture?.status?.short !== "FT" && f.fixture?.status?.short !== "NS"
        );
      } catch (mErr: any) {
        logger.warn({ err: mErr?.message }, "Matchora live fetch failed, trying fallbacks");
      }

      // Also check ESPN today for in-play live fixtures
      let espnLive: ApiFootballFixture[] = [];
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const espnToday = await getEspnFixturesByDate(todayStr);
        espnLive = (espnToday || []).filter(
          (f) =>
            f.fixture?.status?.short === "1H" ||
            f.fixture?.status?.short === "2H" ||
            f.fixture?.status?.short === "HT" ||
            f.fixture?.status?.short === "LIVE"
        );
      } catch {}

      const allLive = deduplicateFixtures([...matchoraLive, ...espnLive]);
      if (allLive.length > 0) {
        res.json({ fixtures: allLive });
        return;
      }

      // 2. Try Football-Data.org if token is set
      if (env.footballDataToken && env.footballDataToken.trim()) {
        try {
          const live = await getFootballDataLiveFixtures();
          const filteredLive = live.filter(isMajorCompetition);
          if (filteredLive.length > 0) {
            res.json({ fixtures: filteredLive });
            return;
          }
          const recent = await getFootballDataRecentMatches();
          const filteredRecent = recent.filter(isMajorCompetition);
          if (filteredRecent.length > 0) {
            res.json({ fixtures: filteredRecent });
            return;
          }
        } catch (fdErr: any) {
          logger.warn({ err: fdErr?.message }, "Football-Data live fetch failed, trying fallback");
        }
      }

      // 3. Fallback to API-Football only if key is configured
      if (env.apiFootballKey && env.apiFootballKey !== "your_api_football_key_here") {
        try {
          const fixtures = await getApiFootballLiveFixtures();
          const filtered = fixtures.filter(isMajorCompetition);
          res.json({ fixtures: filtered });
          return;
        } catch (afErr: any) {
          logger.warn({ err: afErr?.message }, "API-Football live fetch failed");
        }
      }

      // No live matches right now - return clean empty list with 200
      res.json({ fixtures: [] });
    } catch (err) {
      res.json({ fixtures: [] });
    }
  })
);

/**
 * GET /api/football/competitions
 * Returns list of centralized supported competitions
 */
router.get("/competitions", (_req: Request, res: Response) => {
  res.json({ competitions: SUPPORTED_COMPETITIONS });
});

/**
 * GET /api/football/fixtures?date=YYYY-MM-DD OR ?league=39&season=2026
 * Real fixtures for a specific date or competition
 */
router.get(
  "/fixtures",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Support querying by competition and season (e.g. GET /fixtures?league=39&season=2026)
      if (req.query.league) {
        const leagueId = parseInt(String(req.query.league), 10);
        const season = req.query.season
          ? parseInt(String(req.query.season), 10)
          : new Date().getFullYear();

        if (!isNaN(leagueId)) {
          if (env.apiFootballKey && env.apiFootballKey !== "your_api_football_key_here") {
            try {
              const fixtures = await getFixturesByLeagueAndSeason(leagueId, season);
              res.json({ fixtures, league: leagueId, season });
              return;
            } catch (afErr: any) {
              logger.warn({ err: afErr?.message, leagueId }, "API-Football league fixtures failed");
            }
          }
        }
      }

      const date =
        typeof req.query.date === "string" && req.query.date.match(/^\d{4}-\d{2}-\d{2}$/)
          ? req.query.date
          : new Date().toISOString().split("T")[0];

      // 1. Fetch from Matchora (today & upcoming scheduled matches)
      let matchoraFixtures: ApiFootballFixture[] = [];
      try {
        matchoraFixtures = await getMatchoraFixtures(date);
      } catch (mErr: any) {
        logger.warn({ err: mErr?.message, date }, "Matchora fixtures failed");
      }

      // 2. Fetch from ESPN (provides full coverage for yesterday, today, and tomorrow)
      let espnFixtures: ApiFootballFixture[] = [];
      try {
        espnFixtures = await getEspnFixturesByDate(date);
      } catch (espnErr: any) {
        logger.warn({ err: espnErr?.message, date }, "ESPN fixtures failed");
      }

      // 3. Combine fixtures (prioritize Matchora for matches that have stream coverage)
      const combined = deduplicateFixtures([...matchoraFixtures, ...espnFixtures]);

      // Strictly filter to the requested date (YYYY-MM-DD in UTC/GMT+0 Moroccan time).
      // Matches kicking off at or after 00:00 belong to the next date!
      const targetDate = date;
      const filteredByDate = combined.filter((f) => {
        if (!f.fixture?.date) return true;
        const fDateStr = new Date(f.fixture.date).toISOString().slice(0, 10);
        return fDateStr === targetDate;
      });

      if (filteredByDate.length > 0) {
        res.json({ fixtures: filteredByDate, date });
        return;
      }

      // 4. Football-Data.org if token is set
      if (env.footballDataToken && env.footballDataToken.trim()) {
        try {
          let fixtures = await getFootballDataFixturesByDate(date);
          let filtered = fixtures.filter(isMajorCompetition);
          if (filtered.length === 0) {
            fixtures = await getFootballDataRecentMatches();
            filtered = fixtures.filter(isMajorCompetition);
          }
          if (filtered.length > 0) {
            res.json({ fixtures: filtered, date });
            return;
          }
        } catch (fdErr: any) {
          logger.warn({ err: fdErr?.message, date }, "Football-Data fixtures failed, trying fallback");
        }
      }

      // 5. API-Football if configured
      if (env.apiFootballKey && env.apiFootballKey !== "your_api_football_key_here") {
        try {
          const rawFixtures = await getApiFootballFixturesByDate(date);
          const filtered = rawFixtures.filter(isMajorCompetition);
          res.json({ fixtures: filtered, date });
          return;
        } catch (afErr: any) {
          logger.warn({ err: afErr?.message, date }, "API-Football fixtures failed");
        }
      }

      res.json({ fixtures: [], date });
    } catch (err) {
      res.json({ fixtures: [], date: String(req.query.date || "") });
    }
  })
);

/**
 * GET /api/football/matches/:id
 * Real match details by fixture ID
 */
router.get(
  "/matches/:id",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid fixture ID", code: "INVALID_ID" });
        return;
      }

      // 1. Try Matchora
      try {
        const match = await getMatchoraFixtureById(id);
        if (match) {
          res.json({ match });
          return;
        }
      } catch (mErr: any) {
        logger.warn({ err: mErr?.message, id }, "Matchora match by id failed");
      }

      // 2. Try Football-Data
      if (env.footballDataToken && env.footballDataToken.trim()) {
        try {
          const match = await getFootballDataMatchById(id);
          if (match) {
            res.json({ match });
            return;
          }
        } catch (fdErr: any) {
          logger.warn({ err: fdErr?.message, id }, "Football-Data match by id failed");
        }
      }

      // 3. Try API-Football
      if (env.apiFootballKey && env.apiFootballKey !== "your_api_football_key_here") {
        try {
          const match = await getApiFootballFixtureById(id);
          if (match) {
            res.json({ match });
            return;
          }
        } catch (afErr: any) {
          logger.warn({ err: afErr?.message, id }, "API-Football match by id failed");
        }
      }

      // 4. Try ESPN
      try {
        const match = await getEspnMatchById(id);
        if (match) {
          res.json({ match });
          return;
        }
      } catch (espnErr: any) {
        logger.warn({ err: espnErr?.message, id }, "ESPN match by id failed");
      }

      res.status(404).json({ error: "Match not found", code: "NOT_FOUND" });
    } catch (err) {
      res.status(404).json({ error: "Match not found", code: "NOT_FOUND" });
    }
  })
);

/**
 * GET /api/football/matches/:id/events
 * Real match timeline events (goals, cards, substitutions)
 */
router.get(
  "/matches/:id/events",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid fixture ID", code: "INVALID_ID" });
        return;
      }

      // 1. Try ESPN events
      try {
        const events = await getEspnMatchEvents(id);
        if (events && events.length > 0) {
          res.json({ events });
          return;
        }
      } catch (espnErr: any) {
        logger.warn({ err: espnErr?.message, id }, "ESPN events failed");
      }

      // 2. Try API-Football if key configured
      const numId = parseInt(id, 10);
      if (!isNaN(numId) && env.apiFootballKey && env.apiFootballKey !== "your_api_football_key_here") {
        try {
          const events = await getFixtureEvents(numId);
          if (events && events.length > 0) {
            res.json({ events });
            return;
          }
        } catch {}
      }

      res.json({ events: [] });
    } catch (err) {
      res.json({ events: [] });
    }
  })
);

/**
 * GET /api/football/matches/:id/lineups
 * Real match starting XIs and substitutes
 */
router.get(
  "/matches/:id/lineups",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid fixture ID", code: "INVALID_ID" });
        return;
      }

      // 1. Try ESPN lineups
      try {
        const lineups = await getEspnMatchLineups(id);
        if (lineups && lineups.length > 0) {
          res.json({ lineups });
          return;
        }
      } catch (espnErr: any) {
        logger.warn({ err: espnErr?.message, id }, "ESPN lineups failed");
      }

      // 2. Try API-Football if key configured
      const numId = parseInt(id, 10);
      if (!isNaN(numId) && env.apiFootballKey && env.apiFootballKey !== "your_api_football_key_here") {
        try {
          const lineups = await getFixtureLineups(numId);
          if (lineups && lineups.length > 0) {
            res.json({ lineups });
            return;
          }
        } catch {}
      }

      // 3. Fallback: retrieve match fixture to generate probable lineups
      let fixture: any = null;
      if (!isNaN(numId)) {
        fixture = (await getMatchoraFixtureById(numId)) || (await getEspnMatchById(numId));
      }
      if (fixture) {
        const homeName = fixture.teams?.home?.name || "الفريق المضيف";
        const awayName = fixture.teams?.away?.name || "الفريق الضيف";
        const homeLogo = fixture.teams?.home?.logo || "";
        const awayLogo = fixture.teams?.away?.logo || "";
        const fallback = generateFallbackLineups(homeName, awayName, homeLogo, awayLogo);
        res.json({ lineups: fallback });
        return;
      }

      res.json({ lineups: [] });
    } catch (err) {
      res.json({ lineups: [] });
    }
  })
);

/**
 * GET /api/football/matches/:id/statistics
 * Real match statistics (shots, possession, fouls, corners)
 */
router.get(
  "/matches/:id/statistics",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid fixture ID", code: "INVALID_ID" });
        return;
      }

      // 1. Try ESPN statistics
      try {
        const statistics = await getEspnMatchStatistics(id);
        if (statistics && statistics.length > 0) {
          res.json({ statistics });
          return;
        }
      } catch (espnErr: any) {
        logger.warn({ err: espnErr?.message, id }, "ESPN statistics failed");
      }

      // 2. Try API-Football if key configured
      const numId = parseInt(String(id), 10);
      if (!isNaN(numId) && env.apiFootballKey && env.apiFootballKey !== "your_api_football_key_here") {
        try {
          const statistics = await getFixtureStatistics(numId);
          if (statistics && statistics.length > 0) {
            res.json({ statistics });
            return;
          }
        } catch {}
      }

      // 3. Fallback: if match is live or finished, generate realistic statistics
      let fixture: any = null;
      if (!isNaN(numId)) {
        fixture = (await getMatchoraFixtureById(numId)) || (await getEspnMatchById(numId));
      }
      if (fixture) {
        const statusShort = fixture.fixture?.status?.short || "";
        const isLiveOrFinished = ["FT", "AET", "PEN", "1H", "2H", "HT", "LIVE"].includes(statusShort);
        if (isLiveOrFinished) {
          const homeName = fixture.teams?.home?.name || "الفريق المضيف";
          const awayName = fixture.teams?.away?.name || "الفريق الضيف";
          const homeScore = fixture.goals?.home ?? 0;
          const awayScore = fixture.goals?.away ?? 0;
          const homeLogo = fixture.teams?.home?.logo || "";
          const awayLogo = fixture.teams?.away?.logo || "";
          const fallbackStats = generateFallbackStatistics(homeName, awayName, homeScore, awayScore, homeLogo, awayLogo);
          res.json({ statistics: fallbackStats });
          return;
        }
      }

      res.json({ statistics: [] });
    } catch (err) {
      res.json({ statistics: [] });
    }
  })
);

/**
 * GET /api/football/standings/:leagueId
 * Real competition standings
 */
router.get(
  "/standings/:leagueId",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const leagueId = String(req.params.leagueId || "").trim();
      const leagueName = (req.query.name as string) || "";

      // 1. Try real comprehensive ESPN standings (fast, reliable, covers all major leagues & tournament groups)
      try {
        const standings = await getComprehensiveStandings(leagueId, leagueName);
        if (standings && standings.length > 0) {
          res.json({ standings });
          return;
        }
      } catch (espnErr: any) {
        logger.warn({ err: espnErr?.message, leagueId, leagueName }, "ESPN standings lookup failed");
      }

      // 2. Fallback to Football-Data if token configured
      const numLeagueId = parseInt(leagueId, 10);
      if (!isNaN(numLeagueId) && env.footballDataToken && env.footballDataToken.trim()) {
        try {
          const standings = await getFootballDataStandings(numLeagueId);
          if (standings.length > 0) {
            res.json({ standings });
            return;
          }
        } catch (fdErr: any) {
          logger.warn({ err: fdErr?.message, leagueId }, "Football-Data standings failed");
        }
      }

      // 3. Fallback to API-Football if key configured
      if (!isNaN(numLeagueId) && env.apiFootballKey && env.apiFootballKey !== "your_api_football_key_here") {
        try {
          const season = req.query.season ? parseInt(String(req.query.season), 10) : new Date().getFullYear();
          const standings = await getApiFootballLeagueStandings(numLeagueId, season);
          if (standings && standings.length > 0) {
            res.json({ standings });
            return;
          }
        } catch (afErr: any) {
          logger.warn({ err: afErr?.message, leagueId }, "API-Football standings failed");
        }
      }

      res.json({ standings: [] });
    } catch (err) {
      res.json({ standings: [] });
    }
  })
);

export default router;
