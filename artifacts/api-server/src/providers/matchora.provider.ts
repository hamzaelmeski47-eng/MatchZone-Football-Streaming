import type {
  LiveSource,
  LiveStreamProvider,
  MatchContext,
} from "./live-stream-provider.interface";
import { matchoraService } from "../services/matchora.service";

/**
 * Matchora Live Stream Provider Adapter
 * Integrates official Matchora public API into the MatchZone LiveStreamProvider system.
 * Returns all available playing channels as separate switchable sources.
 */
export class MatchoraProvider implements LiveStreamProvider {
  readonly name = "Matchora";

  async getSources(match: MatchContext): Promise<LiveSource[]> {
    const res = await matchoraService.getMatchoraSource(match.fixtureId, match);

    if (!res.available || !res.embedUrl) {
      return [];
    }

    // If channels available, expose them as switchable sources (up to 12 channels)
    if (res.channels && res.channels.length > 0) {
      return res.channels.slice(0, 12).map((ch, idx) => ({
        id: `matchora-${res.eventId || match.fixtureId}-ch-${ch.id}`,
        name: ch.name || `قناة ${idx + 1}`,
        type: "embed" as const,
        embedUrl: ch.embedUrl,
        status: "active" as const,
        provider: "Matchora",
        channel: ch.channel || (ch.name.toLowerCase().includes("bein") ? "beIN Sports" : undefined),
        quality: ch.quality,
        lang: ch.lang,
        commentator: ch.commentator,
        isBein: ch.isBein ?? ch.name.toLowerCase().includes("bein"),
        isArabic: ch.isArabic ?? (ch.name.includes("عربي") || ch.lang?.toLowerCase() === "arabic"),
      }));
    }

    // Single source fallback
    const fallbackIsBein = false;
    return [{
      id: `matchora-${res.eventId || match.fixtureId}-main`,
      name: "بث مباشر (المصدر الرئيسي)",
      type: "embed" as const,
      embedUrl: res.embedUrl,
      status: "active" as const,
      provider: "Matchora",
    }];
  }
}
