/**
 * Named policy defaults — no anonymous magic numbers in the engine loop.
 * Telemetry and tests refer to these constants by name.
 */

export const POLICY_DEFAULTS = {
  /** Engine loop ceiling when policy.spec.max_iterations is unset. */
  MAX_ITERATIONS: 500,
  /** Automatic replans when policy.spec.max_replans and engine option are unset. */
  MAX_REPLANS: 3,
  /** Same-capability provider switches after retries exhausted. */
  MAX_PROVIDER_FALLBACKS: 3,
  /** Job poll interval (ms) when waiting on external jobs. */
  JOB_POLL_INTERVAL_MS: 500,
} as const;

export type PolicyDefaultKey = keyof typeof POLICY_DEFAULTS;
