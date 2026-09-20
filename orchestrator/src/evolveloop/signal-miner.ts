import { createHash } from "node:crypto";
import type {
  NeedSignal,
  RawObservation,
  SignalSeverity,
  EvolutionScopeKind,
} from "./types.js";

function hash(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function inferScope(obs: RawObservation): { type: EvolutionScopeKind; id: string } {
  if (obs.user_id && !obs.project_id) return { type: "USER", id: obs.user_id };
  if (obs.project_id) return { type: "PROJECT", id: obs.project_id };
  if (obs.feature_id) return { type: "WORKSPACE", id: obs.feature_id };
  return { type: "SYSTEM", id: "system" };
}

function defaultSeverity(kind: RawObservation["kind"]): SignalSeverity {
  switch (kind) {
    case "failure":
    case "capability_unavailable":
    case "policy_block":
      return "HIGH";
    case "retry":
    case "human_intervention":
    case "correction":
    case "skill_failure":
      return "MEDIUM";
    case "excessive_steps":
    case "latency":
    case "eval_gap":
    case "knowledge_gap":
      return "LOW";
    default:
      return "INFO";
  }
}

/**
 * Signal Miner: raw observations → normalized NeedSignals.
 * Does NOT determine needs or propose agents.
 */
export class SignalMiner {
  private seen = new Map<string, NeedSignal>();

  mine(observations: RawObservation[]): NeedSignal[] {
    const out: NeedSignal[] = [];
    for (const obs of observations) {
      const scope = inferScope(obs);
      const domain = obs.domain ?? "unknown";
      const taskClass = obs.task_class ?? "unknown";
      const fingerprint = hash([
        obs.kind,
        domain,
        taskClass,
        scope.type,
        scope.id,
        obs.execution_id ?? obs.id,
        obs.source,
      ]);

      // Deduplicate identical logical events (same fingerprint already ingested)
      if (this.seen.has(fingerprint)) {
        continue;
      }

      const signal: NeedSignal = {
        id: `sig-${fingerprint}`,
        fingerprint,
        timestamp: obs.timestamp,
        scope,
        source: obs.source,
        type: obs.kind,
        domain,
        task_class: taskClass,
        severity: obs.severity ?? defaultSeverity(obs.kind),
        evidence_refs: obs.evidence_refs ?? [],
        execution_id: obs.execution_id,
        feature_id: obs.feature_id,
        user_id: obs.user_id,
        project_id: obs.project_id,
        synthetic: obs.synthetic === true,
        metadata: obs.metadata ?? {},
      };
      this.seen.set(fingerprint, signal);
      out.push(signal);
    }
    return out;
  }

  reset(): void {
    this.seen.clear();
  }

  size(): number {
    return this.seen.size;
  }
}
