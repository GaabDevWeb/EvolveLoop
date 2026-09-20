/** Failure pattern aggregation — contracts learning loop */

import type { EventEnvelope } from "../types/index.js";

export interface FailurePattern {
  capability: string;
  provider_id: string;
  blocked_reason: string;
  count: number;
  last_seen: string;
}

export class PatternAggregator {
  private patterns = new Map<string, FailurePattern>();

  record(event: EventEnvelope): void {
    if (event.type !== "NodeFailed" && event.type !== "FeatureBlocked") return;

    const capability = (event.payload.capability as string) ?? "unknown";
    const providerId = (event.payload.provider_id as string) ?? "unknown";
    const reason =
      (event.payload.error as { message?: string })?.message ??
      (event.payload.reason as string) ??
      "unknown";

    const key = `${capability}:${providerId}:${reason}`;
    const existing = this.patterns.get(key);
    if (existing) {
      existing.count += 1;
      existing.last_seen = event.timestamp;
    } else {
      this.patterns.set(key, {
        capability,
        provider_id: providerId,
        blocked_reason: reason,
        count: 1,
        last_seen: event.timestamp,
      });
    }
  }

  ingest(events: EventEnvelope[]): void {
    for (const e of events) this.record(e);
  }

  topPatterns(limit = 10): FailurePattern[] {
    return [...this.patterns.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  }

  providerPenalty(providerId: string): number {
    const relevant = [...this.patterns.values()].filter((p) => p.provider_id === providerId);
    if (relevant.length === 0) return 0;
    return Math.min(0.3, relevant.reduce((s, p) => s + p.count, 0) * 0.05);
  }

  snapshot(): FailurePattern[] {
    return [...this.patterns.values()];
  }
}
