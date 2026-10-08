import type { Request, Response } from "express";
import {
  listAllStreams,
  getActiveStreamForMatch,
  createStreamRecord,
  updateStreamRecord,
  deleteStreamRecord,
} from "../models/stream.model";
import { AppError } from "../utils/app-error";
import { env } from "../config/env";

/**
 * Replaces template variables in a stream server URL.
 * Supported variables:
 *   {matchId}  → API-Football fixture ID (number)
 *   {home}     → home team name (URL-encoded)
 *   {away}     → away team name (URL-encoded)
 *   {league}   → league/competition name (URL-encoded)
 *
 * Example template:
 *   https://mystream.com/embed/football/{matchId}
 *   https://mystream.com/watch?home={home}&away={away}
 */
function resolveServerUrl(
  template: string,
  vars: { matchId: number; home?: string; away?: string; league?: string }
): string {
  return template
    .replace(/\{matchId\}/gi, String(vars.matchId))
    .replace(/\{home\}/gi, encodeURIComponent(vars.home || ""))
    .replace(/\{away\}/gi, encodeURIComponent(vars.away || ""))
    .replace(/\{league\}/gi, encodeURIComponent(vars.league || ""));
}

import {
  getLiveSourcesForMatch,
  type LiveSource,
} from "../services/live-sources.service";
import { getMatchoraSource } from "../services/matchora.service";

/**
 * GET /api/streams/active-matches
 * Returns list of match IDs that currently have active authorized streams/iframes
 */
export async function getActiveMatchesWithStreamsController(_req: Request, res: Response) {
  const streams = await listAllStreams();
  const activeStreams = streams.filter((s) => s.is_active && Boolean(s.stream_url));
  const activeMatchIds = Array.from(new Set(activeStreams.map((s) => s.match_id)));
  res.json({
    activeMatchIds,
    hasGlobalServers: env.streamServers.length > 0,
    hasExternalProvider: Boolean(env.liveStreamProviderUrl && env.liveStreamProviderUrl.trim()),
  });
}

/**
 * GET /api/streams/servers
 * Returns configured global stream server definitions (from env or defaults).
 */
export async function getStreamServersController(_req: Request, res: Response) {
  res.json({ servers: env.streamServers });
}

/**
 * GET /api/streams/:matchId/sources
 * Returns structured Live Sources according to the canonical source model:
 * [ { id, name, type: 'embed'|'hls'|'dash', embedUrl, status } ]
 */
export async function getMatchLiveSourcesController(req: Request, res: Response) {
  const matchId = parseInt(String(req.params.matchId), 10);
  if (isNaN(matchId)) {
    res.status(400).json({ error: "Invalid match ID", sources: [], hasSources: false });
    return;
  }

  const home = String(req.query.home || "");
  const away = String(req.query.away || "");
  const league = String(req.query.league || "");
  const date = String(req.query.date || "");
  const kickoff = String(req.query.kickoff || "");
  const status = String(req.query.status || "");

  const result = await getLiveSourcesForMatch(matchId, { home, away, league, date, kickoff, status });
  res.json(result);
}

/**
 * GET /api/streams/:matchId/matchora
 * GET /api/streams/matchora/:matchId
 * Dedicated Matchora provider endpoint returning exact requested model:
 * { available, provider: "Matchora", embedUrl?, eventId?, reason? }
 */
export async function getMatchoraSourceController(req: Request, res: Response) {
  const matchId = parseInt(String(req.params.matchId), 10);
  if (isNaN(matchId)) {
    res.status(400).json({
      available: false,
      provider: "Matchora",
      reason: "INVALID_RESPONSE",
      message: "Invalid fixture ID provided.",
    });
    return;
  }

  const home = String(req.query.home || "");
  const away = String(req.query.away || "");
  const league = String(req.query.league || "");
  const date = String(req.query.date || "");
  const kickoff = String(req.query.kickoff || "");
  const status = String(req.query.status || "");

  const result = await getMatchoraSource(matchId, {
    fixtureId: matchId,
    homeTeam: home,
    awayTeam: away,
    competition: league,
    date,
    kickoffTime: kickoff,
    status,
  });

  res.json(result);
}

/**
 * GET /api/streams/:matchId
 * Returns authorized sources and stream for a specific match.
 * If no authorized source exists, sources will be empty and message will state "البث المباشر غير متوفر حالياً".
 */
export async function getMatchStreamController(req: Request, res: Response) {
  const matchId = parseInt(String(req.params.matchId), 10);
  if (isNaN(matchId)) {
    res.status(400).json({ error: "Invalid match ID", sources: [], stream: null, servers: [] });
    return;
  }

  const home = String(req.query.home || "");
  const away = String(req.query.away || "");
  const league = String(req.query.league || "");
  const date = String(req.query.date || "");
  const kickoff = String(req.query.kickoff || "");
  const status = String(req.query.status || "");

  const { sources, hasSources, matchChannels, message } = await getLiveSourcesForMatch(matchId, { home, away, league, date, kickoff, status });

  // Map to server list for backwards compatibility
  const servers = sources.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.embedUrl,
    type: s.type === "embed" ? "iframe" : s.type,
  }));

  const primaryStream = sources.length > 0 ? {
    id: 990000 + (matchId % 1000),
    match_id: matchId,
    provider: sources[0].name,
    stream_url: sources[0].embedUrl,
    stream_type: sources[0].type === "embed" ? ("iframe" as const) : (sources[0].type as "hls" | "dash"),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null;

  res.json({
    matchId,
    sources,
    hasSources,
    matchChannels: matchChannels || [],
    stream: primaryStream,
    servers,
    message: hasSources ? null : (message || "البث المباشر غير متوفر حالياً"),
  });
}

/**
 * GET /api/streams
 * List all streams for Admin panel
 */
export async function listStreamsController(_req: Request, res: Response) {
  const streams = await listAllStreams();
  res.json({ streams });
}

/**
 * POST /api/streams
 * Create authorized stream (Admin)
 */
export async function createStreamController(req: Request, res: Response) {
  const { match_id, matchId, provider, stream_url, url, stream_type, is_active } = req.body;
  const finalMatchId = parseInt(String(match_id ?? matchId), 10);
  const finalUrl = stream_url || url;

  if (isNaN(finalMatchId) || !finalUrl || !provider) {
    throw new AppError(400, "match_id, provider, and stream_url are required.");
  }

  const validType = ["hls", "dash", "iframe"].includes(stream_type) ? stream_type : "hls";

  const stream = await createStreamRecord({
    match_id: finalMatchId,
    provider: String(provider).trim(),
    stream_url: String(finalUrl).trim(),
    stream_type: validType as "hls" | "dash" | "iframe",
    is_active: is_active ?? true,
  });

  res.status(201).json({ stream });
}

/**
 * PUT /api/streams/:id
 * Update authorized stream (Admin)
 */
export async function updateStreamController(req: Request, res: Response) {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    throw new AppError(400, "Invalid stream ID");
  }

  const { provider, stream_url, stream_type, is_active, match_id } = req.body;
  const updated = await updateStreamRecord(id, {
    provider,
    stream_url,
    stream_type,
    is_active,
    match_id: match_id ? parseInt(String(match_id), 10) : undefined,
  });

  if (!updated) {
    throw new AppError(404, "Stream not found");
  }

  res.json({ stream: updated });
}

/**
 * DELETE /api/streams/:id
 * Delete authorized stream (Admin)
 */
export async function deleteStreamController(req: Request, res: Response) {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    throw new AppError(400, "Invalid stream ID");
  }

  const deleted = await deleteStreamRecord(id);
  if (!deleted) {
    throw new AppError(404, "Stream not found");
  }

  res.json({ success: true });
}