export * from "./live-stream-provider.interface";
export * from "./sportsrc.provider";
export * from "./matchora.provider";

import type { LiveStreamProvider } from "./live-stream-provider.interface";
import { SportSrcProvider } from "./sportsrc.provider";
import { MatchoraProvider } from "./matchora.provider";
import { env } from "../config/env";

/**
 * Registry of active live stream providers.
 * Easily extensible to add additional legitimate providers in the future.
 */
class ProviderRegistry {
  private providers: LiveStreamProvider[] = [];

  constructor() {
    this.initProviders();
  }

  private initProviders() {
    // Register Matchora as the exclusive live stream provider
    this.providers.push(new MatchoraProvider());
  }

  getProviders(): LiveStreamProvider[] {
    return this.providers;
  }

  registerProvider(provider: LiveStreamProvider) {
    this.providers.push(provider);
  }
}

export const providerRegistry = new ProviderRegistry();
