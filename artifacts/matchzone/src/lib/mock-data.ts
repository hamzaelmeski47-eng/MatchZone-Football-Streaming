export type MatchStatus = 'live' | 'upcoming' | 'finished';

export type Team = {
  id: string;
  name: string;
  short: string;
  country: string;
  color: string;
  logoUrl?: string | null;
};

export type Competition = {
  id: string;
  name: string;
  short: string;
  country: string;
  matches: number;
  accent: string;
  logoUrl?: string | null;
};

export type Match = {
  id: string;
  competitionId: string;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  time: string;
  date: string;
  rawDate?: string;
  kickoffTime?: string;
  venue: string;
  minute?: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeName?: string;
  awayName?: string;
  competitionName?: string;
  competitionLogo?: string | null;
  competitionCountry?: string;
  round?: string;
  channel?: string;
  commentator?: string;
};

// No mock data: populated exclusively from API-Football
export const teams: Team[] = [];
export const competitions: Competition[] = [];
export const matches: Match[] = [];

const DEFAULT_EMPTY_TEAM: Team = {
  id: '0',
  name: 'Team',
  short: 'TBD',
  country: 'Unknown',
  color: '#888888',
  logoUrl: null,
};

const DEFAULT_EMPTY_COMPETITION: Competition = {
  id: '0',
  name: 'Competition',
  short: 'CMP',
  country: 'Unknown',
  matches: 0,
  accent: '#b7ff4a',
  logoUrl: null,
};

export const getTeam = (id: string, teamsList?: Team[]) => {
  const list = teamsList && teamsList.length > 0 ? teamsList : teams;
  return list.find((team) => team.id === id) ?? { ...DEFAULT_EMPTY_TEAM, id };
};

export const getCompetition = (id: string, compsList?: Competition[]) => {
  const list = compsList && compsList.length > 0 ? compsList : competitions;
  return list.find((c) => c.id === id) ?? { ...DEFAULT_EMPTY_COMPETITION, id };
};