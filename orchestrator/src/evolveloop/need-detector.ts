import { createHash } from "node:crypto";
import type { Confidence, DetectedPattern, NeedCandidate } from "./types.js";
import { EVOLVE_THRESHOLDS } from "./types.js";

function hash(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function confidenceFor(pattern: DetectedPattern, sourceDiversity: number): Confidence {
  if (pattern.frequency >= 5 && sourceDiversity >= 2) return "HIGH";
  if (pattern.frequency >= EVOLVE_THRESHOLDS.min_need_signals) return "MEDIUM";
  return "LOW";
}

/**
 * Need Detector: patterns → Need Candidates.
 * Need ≠ Solution. Single trivial events never become needs.
 */
export class NeedDetector {
  private emitted = new Map<string, NeedCandidate>();

  detect(patterns: DetectedPattern[], signalsById?: Map<string, { source: string }>): NeedCandidate[] {
    const needs: NeedCandidate[] = [];

    for (const p of patterns) {
      if (p.signal_ids.length < EVOLVE_THRESHOLDS.min_need_signals) {
        continue;
      }

      const fingerprint = hash([p.kind, p.domain, p.task_class, p.scope_class, p.scope_id]);
      if (this.emitted.has(fingerprint)) {
        needs.push(this.emitted.get(fingerprint)!);
        continue;
      }

      const sources = new Set(
        p.signal_ids.map((id) => signalsById?.get(id)?.source ?? "unknown"),
      );
      const conf = confidenceFor(p, sources.size);

      const need: NeedCandidate = {
        id: `need-${fingerprint}`,
        fingerprint,
        scope: p.scope,
        scope_class: p.scope_class,
        scope_id: p.scope_id,
        domain: p.domain,
        type: p.kind,
        recurrence: p.frequency,
        impact: p.impact,
        affected_tasks: [p.task_class],
        evidence: [...p.signal_ids],
        pattern_ids: [p.id],
        signal_ids: [...p.signal_ids],
        confidence: conf,
        suspected_root_causes: [],
        first_seen: p.first_seen,
        last_seen: p.last_seen,
        status: conf === "LOW" ? "INSUFFICIENT_EVIDENCE" : "CANDIDATE",
      };

      this.emitted.set(fingerprint, need);
      needs.push(need);
    }

    return needs;
  }

  reset(): void {
    this.emitted.clear();
  }
}
