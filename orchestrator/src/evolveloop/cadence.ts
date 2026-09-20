/**
 * Analysis cadence — gates when to analyze and dedupes evolution requests.
 * Separate from EventBus ingest (observer never calls analyze).
 */

import type { PersistentSignalStore } from "./persistence/signal-store.js";
import type { EvolutionRequest } from "./types.js";

export interface AnalysisCadenceOptions {
  min_new_signals?: number;
  cooldown_ms?: number;
  max_requests_per_need?: number;
}

const DEFAULTS = {
  min_new_signals: 3,
  cooldown_ms: 60_000,
  max_requests_per_need: 1,
} as const;

export class AnalysisCadence {
  private readonly minNewSignals: number;
  private readonly cooldownMs: number;
  private readonly maxRequestsPerNeed: number;
  private lastAnalyzeAt: number | null = null;
  private signalCountAtLastAnalyze = 0;
  /** need fingerprint → last emit ms / count in window */
  private readonly requestHistory = new Map<string, { lastAt: number; count: number }>();

  constructor(opts: AnalysisCadenceOptions = {}) {
    this.minNewSignals = opts.min_new_signals ?? DEFAULTS.min_new_signals;
    this.cooldownMs = opts.cooldown_ms ?? DEFAULTS.cooldown_ms;
    this.maxRequestsPerNeed = opts.max_requests_per_need ?? DEFAULTS.max_requests_per_need;
  }

  shouldAnalyze(store: PersistentSignalStore, lastAnalyzeAt?: Date | number | null): boolean {
    const last =
      lastAnalyzeAt != null
        ? typeof lastAnalyzeAt === "number"
          ? lastAnalyzeAt
          : lastAnalyzeAt.getTime()
        : this.lastAnalyzeAt;

    const now = Date.now();
    if (last != null && now - last < this.cooldownMs) return false;

    const fingerprintCount = store.getFingerprintCount();
    const newSignals = fingerprintCount - this.signalCountAtLastAnalyze;
    return newSignals >= this.minNewSignals;
  }

  recordAnalyze(store?: PersistentSignalStore, at: Date = new Date()): void {
    this.lastAnalyzeAt = at.getTime();
    if (store) {
      this.signalCountAtLastAnalyze = store.getFingerprintCount();
    }
  }

  getLastAnalyzeAt(): number | null {
    return this.lastAnalyzeAt;
  }

  /**
   * Dedupe / cooldown by need fingerprint (source_need or candidate need id).
   * Reuses requestHistory; optionally seeds from store fingerprints for known needs.
   */
  filterRequests(requests: EvolutionRequest[], store?: PersistentSignalStore): EvolutionRequest[] {
    const now = Date.now();
    const out: EvolutionRequest[] = [];
    const seenThisBatch = new Set<string>();

    // Seed known fingerprints from store if present (needs already tracked)
    if (store) {
      for (const need of store.loadNeeds()) {
        if (!this.requestHistory.has(need.fingerprint)) {
          this.requestHistory.set(need.fingerprint, { lastAt: 0, count: 0 });
        }
      }
    }

    for (const req of requests) {
      const fp = req.source_need;
      if (seenThisBatch.has(fp)) continue;
      seenThisBatch.add(fp);

      const hist = this.requestHistory.get(fp);
      if (hist) {
        if (now - hist.lastAt < this.cooldownMs && hist.lastAt > 0) continue;
        if (hist.count >= this.maxRequestsPerNeed && now - hist.lastAt < this.cooldownMs) continue;
      }

      out.push(req);
      const prev = this.requestHistory.get(fp) ?? { lastAt: 0, count: 0 };
      this.requestHistory.set(fp, {
        lastAt: now,
        count: prev.count + 1,
      });
    }

    return out;
  }
}
