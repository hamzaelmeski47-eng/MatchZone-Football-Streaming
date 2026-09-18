export type MatchStatus = 'live' | 'upcoming' | 'finished';

export type Team = {
  id: string;
  name: string;
  short: string;
  country: string;
  color: string;
};

export type Competition = {
  id: string;
  name: string;
  short: string;
  country: string;
  matches: number;
  accent: string;
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
  venue: string;
  minute?: string;
};

export const teams: Team[] = [
  { id: 'arsenal', name: 'Arsenal', short: 'ARS', country: 'England', color: '#dd274b' },
  { id: 'man-city', name: 'Manchester City', short: 'MCI', country: 'England', color: '#62b7e8' },
  { id: 'real-madrid', name: 'Real Madrid', short: 'RMA', country: 'Spain', color: '#d7dbe5' },
  { id: 'barcelona', name: 'Barcelona', short: 'FCB', country: 'Spain', color: '#e04563' },
  { id: 'bayern', name: 'Bayern Munich', short: 'BAY', country: 'Germany', color: '#d51f3f' },
  { id: 'inter', name: 'Inter Milan', short: 'INT', country: 'Italy', color: '#4e8ed9' },
  { id: 'psg', name: 'Paris Saint-Germain', short: 'PSG', country: 'France', color: '#6e7dcc' },
  { id: 'liverpool', name: 'Liverpool', short: 'LIV', country: 'England', color: '#d63e43' },
  { id: 'dortmund', name: 'Borussia Dortmund', short: 'BVB', country: 'Germany', color: '#e5c82b' },
  { id: 'napoli', name: 'Napoli', short: 'NAP', country: 'Italy', color: '#5b9bd7' },
];

export const competitions: Competition[] = [
  { id: 'premier-league', name: 'Premier League', short: 'PL', country: 'England', matches: 380, accent: '#b7ff4a' },
  { id: 'champions-league', name: 'Champions League', short: 'UCL', country: 'Europe', matches: 125, accent: '#a888ff' },
  { id: 'la-liga', name: 'La Liga', short: 'LL', country: 'Spain', matches: 380, accent: '#ff815c' },
  { id: 'bundesliga', name: 'Bundesliga', short: 'BL', country: 'Germany', matches: 306, accent: '#ff5571' },
  { id: 'serie-a', name: 'Serie A', short: 'SA', country: 'Italy', matches: 380, accent: '#50bde8' },
  { id: 'ligue-1', name: 'Ligue 1', short: 'L1', country: 'France', matches: 306, accent: '#ffca57' },
];

export const matches: Match[] = [
  { id: 'arsenal-city', competitionId: 'premier-league', home: 'arsenal', away: 'man-city', homeScore: 2, awayScore: 1, status: 'live', time: 'Live', date: 'Today', venue: 'Emirates Stadium', minute: "74'" },
  { id: 'real-barca', competitionId: 'la-liga', home: 'real-madrid', away: 'barcelona', homeScore: 1, awayScore: 1, status: 'live', time: 'Live', date: 'Today', venue: 'Santiago Bernabéu', minute: "61'" },
  { id: 'bayern-inter', competitionId: 'champions-league', home: 'bayern', away: 'inter', status: 'upcoming', time: '19:45', date: 'Today', venue: 'Allianz Arena' },
  { id: 'psg-liverpool', competitionId: 'champions-league', home: 'psg', away: 'liverpool', status: 'upcoming', time: '20:00', date: 'Today', venue: 'Parc des Princes' },
  { id: 'dortmund-napoli', competitionId: 'champions-league', home: 'dortmund', away: 'napoli', status: 'upcoming', time: 'Tomorrow · 17:45', date: 'Tomorrow', venue: 'Signal Iduna Park' },
  { id: 'city-liverpool', competitionId: 'premier-league', home: 'man-city', away: 'liverpool', homeScore: 3, awayScore: 2, status: 'finished', time: 'FT', date: 'Yesterday', venue: 'Etihad Stadium' },
  { id: 'inter-psg', competitionId: 'champions-league', home: 'inter', away: 'psg', homeScore: 0, awayScore: 2, status: 'finished', time: 'FT', date: 'Yesterday', venue: 'San Siro' },
  { id: 'barca-napoli', competitionId: 'la-liga', home: 'barcelona', away: 'napoli', status: 'upcoming', time: 'Sat · 18:30', date: 'Saturday', venue: 'Camp Nou' },
];

export const getTeam = (id: string) => teams.find((team) => team.id === id) ?? teams[0];
export const getCompetition = (id: string) => competitions.find((competition) => competition.id === id) ?? competitions[0];