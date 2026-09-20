/**
 * Live EvolveLoop cadence / trigger policy — no magic numbers in call sites.
 */
export const LIVE_CADENCE_DEFAULTS = {
  /** New fingerprints for a scope before analyze */
  min_new_signals: 3,
  /** High-severity failure can analyze with fewer new signals */
  min_new_signals_high_severity: 1,
  /** Minimum ms between analyzes for the same scope */
  cooldown_ms: 60_000,
  /** Cap EvolutionRequests per need fingerprint within cooldown */
  max_requests_per_need: 1,
  /** Global analyses per rolling minute (backpressure) */
  max_analyses_per_minute: 30,
  /** Max nested evolution chain depth */
  max_loop_depth: 2,
  /** Observation window: min after-samples before outcome */
  window_minimum_samples: 2,
  /** Observation window max duration */
  window_max_duration_ms: 3_600_000,
} as const;

export type LiveCadenceConfig = {
  [K in keyof typeof LIVE_CADENCE_DEFAULTS]?: (typeof LIVE_CADENCE_DEFAULTS)[K];
};

export function resolveLiveCadence(partial?: LiveCadenceConfig): typeof LIVE_CADENCE_DEFAULTS {
  return { ...LIVE_CADENCE_DEFAULTS, ...partial };
}

export function scopeKey(scope: { type: string; id: string }): string {
  return `${scope.type}:${scope.id}`;
}
