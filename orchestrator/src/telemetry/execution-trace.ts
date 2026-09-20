/**
 * Thin post-run summary from RunResult.events + evidence[].
 * Replay model: JSONL events + evidence payloads (not Temporal) — see docs.
 */

import type { Evidence, EventEnvelope, FeatureMetrics } from "../types/index.js";

export interface CapabilityCallSummary {
  capability: string;
  node_id?: string;
  provider_id?: string;
  status?: string;
  duration_ms?: number;
}

export interface AuthorityDecisionSummary {
  capability: string;
  decision: "allow" | "deny" | "confirm" | string;
  reason?: string;
  node_id?: string;
  source: "evidence" | "event";
}

export interface ExecutionErrorSummary {
  code?: string;
  message?: string;
  node_id?: string;
  capability?: string;
  source: "evidence" | "event";
}

export interface ExecutionTraceSummary {
  execution_id: string;
  success?: boolean;
  latency_ms?: number;
  capability_calls: CapabilityCallSummary[];
  policy_authority_decisions: AuthorityDecisionSummary[];
  errors: ExecutionErrorSummary[];
  event_counts: Record<string, number>;
}

export interface ExecutionTraceInput {
  events: EventEnvelope[];
  evidence: Evidence[];
  metrics?: Pick<FeatureMetrics, "feature_id" | "success" | "duration_ms">;
  /** Override when metrics.feature_id is absent */
  execution_id?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

/**
 * Produce a compact JSON-friendly summary for observability / offline replay review.
 */
export function summarizeExecutionTrace(input: ExecutionTraceInput): ExecutionTraceSummary {
  const { events, evidence, metrics } = input;
  const event_counts: Record<string, number> = {};
  for (const e of events) {
    event_counts[e.type] = (event_counts[e.type] ?? 0) + 1;
  }

  const capability_calls: CapabilityCallSummary[] = [];
  const policy_authority_decisions: AuthorityDecisionSummary[] = [];
  const errors: ExecutionErrorSummary[] = [];

  for (const ev of evidence) {
    const payload = ev.spec.payload;
    const meta = ev.metadata;
    const capability = meta.capability;
    const node_id = meta.node_id;

    if (payload?.type === "authority") {
      policy_authority_decisions.push({
        capability: payload.capability || capability,
        decision: payload.decision,
        reason: payload.reason,
        node_id,
        source: "evidence",
      });
      if (payload.decision !== "allow" || payload.handler_error) {
        errors.push({
          code: payload.handler_error ?? `AUTHORITY_${payload.decision.toUpperCase()}`,
          message: payload.reason,
          node_id,
          capability: payload.capability || capability,
          source: "evidence",
        });
      }
    }

    if (payload?.type === "worker" || (ev.spec as { normalized?: unknown }).normalized !== undefined) {
      capability_calls.push({
        capability,
        node_id,
        provider_id: meta.provider_id,
        status: ev.spec.status,
        duration_ms: ev.spec.duration_ms,
      });
    }

    if (ev.spec.status === "failed" && payload?.type !== "authority") {
      errors.push({
        code: "EVIDENCE_FAILED",
        message: `evidence status failed for ${capability}`,
        node_id,
        capability,
        source: "evidence",
      });
    }

    // Nested authority on worker payload (DeterministicProvider success path)
    const nestedAuth = asRecord(payload)?.authority ?? asRecord(asRecord(payload)?.result)?.authority;
    const authObj = asRecord(nestedAuth);
    if (authObj && typeof authObj.decision === "string") {
      policy_authority_decisions.push({
        capability: String(authObj.capability ?? capability),
        decision: String(authObj.decision),
        reason: authObj.reason ? String(authObj.reason) : undefined,
        node_id,
        source: "evidence",
      });
    }
  }

  for (const event of events) {
    const p = event.payload;
    if (event.type === "ProviderSelected" || event.type === "NodeStarted" || event.type === "NodeCompleted") {
      const cap = typeof p.capability === "string" ? p.capability : undefined;
      if (cap) {
        capability_calls.push({
          capability: cap,
          node_id: typeof p.node_id === "string" ? p.node_id : undefined,
          provider_id: typeof p.provider_id === "string" ? p.provider_id : undefined,
          status: event.type,
          duration_ms: typeof p.duration_ms === "number" ? p.duration_ms : undefined,
        });
      }
    }
    if (event.type === "NodeFailed") {
      errors.push({
        code: typeof p.error_code === "string" ? p.error_code : "NODE_FAILED",
        message: typeof p.error === "string" ? p.error : typeof p.message === "string" ? p.message : undefined,
        node_id: typeof p.node_id === "string" ? p.node_id : undefined,
        capability: typeof p.capability === "string" ? p.capability : undefined,
        source: "event",
      });
    }
  }

  const execution_id =
    input.execution_id ??
    metrics?.feature_id ??
    events[0]?.feature_id ??
    evidence[0]?.metadata.run_id ??
    "unknown";

  return {
    execution_id,
    success: metrics?.success,
    latency_ms: metrics?.duration_ms,
    capability_calls,
    policy_authority_decisions,
    errors,
    event_counts,
  };
}
