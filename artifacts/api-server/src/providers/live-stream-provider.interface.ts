/**
 * Live Stream Provider Abstraction
 * Defines canonical models and provider interface for live streaming feeds.
 * Allows MatchZone to be completely provider-agnostic.
 */

export type LiveSourceType = "embed" | "hls" | "dash";

export interface LiveSource {
  id: string;
  name: string;
  type: LiveSourceType;
  embedUrl?: string;
  status?: string;
  quality?: string;
  provider?: string;
  channel?: string;
  lang?: string;
  commentator?: string;
  isBein?: boolean;
  isArabic?: boolean;
}

export interface MatchContext {
  fixtureId: number;
  homeTeam?: string;
  awayTeam?: string;
  date?: string;
  kickoffTime?: string;
  competition?: string;
  status?: string;
}

export interface LiveStreamProvider {
  readonly name: string;
  getSources(match: MatchContext): Promise<LiveSource[]>;
}
