/**
 * Per-scope analysis cadence for live operation.
 */

import type { PersistentSignalStore } from "../persistence/signal-store.js";
import type { EvolutionRequest } from "../types.js";
import type { AnalysisScope } from "../longitudinal-types.js";
import { LIVE_CADENCE_DEFAULTS, resolveLiveCadence, scopeKey, type LiveCadenceConfig } from "./live-config.js";

interface ScopeState {
  lastAnalyzeAt: number | null;
  signalCountAtLastAnalyze: number;
  pendingNew: number;
}

export class ScopedAnalysisCadence {
  private readonly cfg: ReturnType<typeof resolveLiveCadence>;
  private readonly scopes = new Map<string, ScopeState>();
  private readonly requestHistory = new Map<string, { lastAt: number; count: number }>();
  private readonly recentAnalyzeAt: number[] = [];

  constructor(cfg?: LiveCadenceConfig) {
    this.cfg = resolveLiveCadence(cfg);
  }

  getConfig(): Readonly<typeof LIVE_CADENCE_DEFAULTS> {
    return this.cfg;
  }

  recordSignal(scope: AnalysisScope, count = 1): void {
    const key = scopeKey(scope);
    const st = this.scopes.get(key) ?? {
      lastAnalyzeAt: null,
      signalCountAtLastAnalyze: 0,
      pendingNew: 0,
    };
    st.pendingNew += count;
    this.scopes.set(key, st);
  }

  shouldAnalyze(
    scope: AnalysisScope,
    opts?: { high_severity?: boolean; after_outcome?: boolean; now?: number },
  ): boolean {
    const now = opts?.now ?? Date.now();
    const key = scopeKey(scope);
    const st = this.scopes.get(key);
    if (!st) return false;

    if (st.lastAnalyzeAt != null && now - st.lastAnalyzeAt < this.cfg.cooldown_ms) {
      return false;
    }

    // Global backpressure
    this.pruneAnalyzeLog(now);
    if (this.recentAnalyzeAt.length >= this.cfg.max_analyses_per_minute) {
      return false;
    }

    // Outcome-triggered: bypass min_new_signals; keep cooldown + rate limit.
    if (opts?.after_outcome) {
      return true;
    }

    const threshold = opts?.high_severity
      ? this.cfg.min_new_signals_high_severity
      : this.cfg.min_new_signals;
    return st.pendingNew >= threshold;
  }

  recordAnalyze(scope: AnalysisScope, store?: PersistentSignalStore, at: Date = new Date()): void {
    const key = scopeKey(scope);
    const st = this.scopes.get(key) ?? {
      lastAnalyzeAt: null,
      signalCountAtLastAnalyze: 0,
      pendingNew: 0,
    };
    st.lastAnalyzeAt = at.getTime();
    st.pendingNew = 0;
    st.signalCountAtLastAnalyze = store?.getFingerprintCount() ?? st.signalCountAtLastAnalyze;
    this.scopes.set(key, st);
    this.recentAnalyzeAt.push(at.getTime());
  }

  nextAllowedAt(scope: AnalysisScope): number | null {
    const st = this.scopes.get(scopeKey(scope));
    if (!st?.lastAnalyzeAt) return null;
    return st.lastAnalyzeAt + this.cfg.cooldown_ms;
  }

  filterRequests(requests: EvolutionRequest[]): EvolutionRequest[] {
    const now = Date.now();
    const out: EvolutionRequest[] = [];
    const seen = new Set<string>();
    for (const req of requests) {
      const fp = req.source_need;
      if (seen.has(fp)) continue;
      seen.add(fp);
      const hist = this.requestHistory.get(fp);
      if (hist && now - hist.lastAt < this.cfg.cooldown_ms && hist.lastAt > 0) continue;
      if (hist && hist.count >= this.cfg.max_requests_per_need && now - hist.lastAt < this.cfg.cooldown_ms) {
        continue;
      }
      out.push(req);
      const prev = this.requestHistory.get(fp) ?? { lastAt: 0, count: 0 };
      this.requestHistory.set(fp, { lastAt: now, count: prev.count + 1 });
    }
    return out;
  }

  private pruneAnalyzeLog(now: number): void {
    const cutoff = now - 60_000;
    while (this.recentAnalyzeAt.length && this.recentAnalyzeAt[0]! < cutoff) {
      this.recentAnalyzeAt.shift();
    }
  }
}
