/** Evidence v2.1 builders — universal emitters per contracts/evidence.md */

import type {
  DoDCheck,
  Evidence,
  EvidenceEmitter,
  EvidencePayload,
  GraphNode,
  ProviderEntry,
  ProviderStrategy,
} from "../types/index.js";

const API_VERSION = "capability-orchestrator.io/v2";

function baseEvidence(
  nodeId: string,
  runId: string,
  emitter: EvidenceEmitter,
  capability: string,
  providerId?: string,
): Evidence["metadata"] {
  return {
    node_id: nodeId,
    run_id: runId,
    emitter,
    provider_id: providerId ?? emitter,
    capability,
    submitted_at: new Date().toISOString(),
  };
}

export function buildPlanningEvidence(
  runId: string,
  payload: Extract<EvidencePayload, { type: "planning" }>,
  assumptions: string[] = [],
): Evidence {
  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: baseEvidence("planning", runId, "planner", "planning"),
    spec: {
      status: "complete",
      confidence: payload.decomposition_confidence,
      coverage: payload.unresolved_dependencies.length === 0 ? 1 : 0.8,
      assumptions,
      known_gaps: payload.unresolved_dependencies.map((d) => ({
        id: `dep-${d}`,
        severity: "info" as const,
        description: `Unresolved dependency: ${d}`,
      })),
      checks: [],
      payload,
    },
  };
}

export function buildSchedulingEvidence(
  nodeId: string,
  runId: string,
  payload: Extract<EvidencePayload, { type: "scheduling" }>,
): Evidence {
  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: baseEvidence(nodeId, runId, "scheduler", "scheduling"),
    spec: {
      status: "complete",
      confidence: 1,
      coverage: 1,
      assumptions: [],
      known_gaps: [],
      checks: [],
      payload,
    },
  };
}

export function buildSelectionEvidence(
  capability: string,
  runId: string,
  payload: Extract<EvidencePayload, { type: "selection" }>,
): Evidence {
  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: baseEvidence(`selection:${capability}`, runId, "registry", capability),
    spec: {
      status: "complete",
      confidence: payload.constraints_matched ? 1 : 0.7,
      coverage: 1,
      assumptions: [],
      known_gaps: [],
      checks: [],
      payload,
    },
  };
}

export interface WorkerEvidenceOptions {
  files_created?: string[];
  files_modified?: string[];
  commands_run?: string[];
  /**
   * Explicit per-DoD results from runtime observation.
   * Absent results default to `skip` (NOT auto-pass).
   */
  checkResults?: Array<{
    dod_id: string;
    result: "pass" | "fail" | "skip" | "manual";
    details?: string;
    command?: string;
    exit_code?: number;
  }>;
  /** Force status; default derived from checks */
  status?: "complete" | "partial" | "failed";
  confidence?: number;
  /** Lineage binding recorded into metadata assumptions */
  execution_id?: string;
  agent_id?: string;
}

/**
 * Build worker Evidence from execution facts.
 * Never invents DoD PASS — callers must supply checkResults after real observation.
 */
export function buildWorkerEvidence(
  node: GraphNode,
  runId: string,
  providerId: string,
  durationMs: number,
  sideEffects?: WorkerEvidenceOptions,
): Evidence {
  const provided = sideEffects?.checkResults ?? [];
  const checks = node.definition_of_done.map((dod) => {
    const hit = provided.find((c) => c.dod_id === dod.id);
    return {
      dod_id: dod.id,
      result: (hit?.result ?? "skip") as "pass" | "fail" | "skip" | "manual",
      verification: dod.verification,
      details: hit?.details ?? (hit ? dod.check : "unverified_pending_runtime_proof"),
      command: hit?.command,
      exit_code: hit?.exit_code,
    };
  });

  const anyFail = checks.some((c) => c.result === "fail");
  const allPass = checks.length > 0 && checks.every((c) => c.result === "pass");
  const status: "complete" | "partial" | "failed" =
    sideEffects?.status ?? (anyFail ? "failed" : allPass ? "complete" : "partial");

  const payload: Extract<EvidencePayload, { type: "worker" }> = {
    type: "worker",
    artifacts: [],
    checks,
    side_effects: {
      files_created: sideEffects?.files_created ?? [],
      files_modified: sideEffects?.files_modified ?? [],
      commands_run: sideEffects?.commands_run ?? [],
    },
  };

  const meta = baseEvidence(node.id, runId, "worker", node.capability, providerId);
  if (sideEffects?.agent_id) {
    (meta as { agent_id?: string }).agent_id = sideEffects.agent_id;
  }

  const assumptions: string[] = [];
  if (sideEffects?.execution_id) assumptions.push(`execution_id:${sideEffects.execution_id}`);
  if (sideEffects?.agent_id) assumptions.push(`agent_id:${sideEffects.agent_id}`);

  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: meta,
    spec: {
      status,
      confidence: sideEffects?.confidence ?? (allPass ? 0.9 : 0.4),
      coverage: checks.length ? checks.filter((c) => c.result === "pass").length / checks.length : 0,
      assumptions,
      known_gaps: allPass
        ? []
        : [
            {
              id: "unverified_dod",
              severity: "major" as const,
              description: "One or more DoD checks lack runtime-verified pass results",
            },
          ],
      verdict: null,
      checks,
      duration_ms: durationMs,
      provider_version: "1.0.0",
      payload,
    },
  };
}

export function buildGateEvidence(
  node: GraphNode,
  runId: string,
  providerId: string,
  verdict: "passed" | "rejected" | "conditional",
  confidence: number,
  findings?: import("../types/index.js").EvidenceFinding[],
): Evidence {
  const checks = node.definition_of_done.map((dod) => ({
    dod_id: dod.id,
    result: (verdict === "passed" ? "pass" : "fail") as "pass" | "fail",
    verification: dod.verification,
  }));

  const payload: Extract<EvidencePayload, { type: "gate" }> = {
    type: "gate",
    verdict,
    findings: findings ?? [],
    artifacts: [],
  };

  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: baseEvidence(node.id, runId, "gate", node.capability, providerId),
    spec: {
      status: "complete",
      confidence,
      coverage: verdict === "passed" ? 1 : 0.5,
      assumptions: [],
      known_gaps: [],
      verdict,
      checks,
      findings,
      payload,
    },
  };
}

export function buildExecutionEvidence(
  nodeId: string,
  runId: string,
  providerId: string,
  capability: string,
  payload: Extract<EvidencePayload, { type: "execution" }>,
): Evidence {
  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: baseEvidence(nodeId, runId, "executor", capability, providerId),
    spec: {
      status: "complete",
      confidence: payload.timeout_hit || payload.cancelled ? 0.5 : 1,
      coverage: 1,
      assumptions: [],
      known_gaps: [],
      checks: [],
      duration_ms: payload.duration_ms,
      payload,
    },
  };
}

export function buildAuthorityEvidence(
  nodeId: string,
  runId: string,
  capability: string,
  auth: {
    decision: "allow" | "deny" | "confirm";
    reason: string;
    checked_at?: string;
    type?: "authority";
    handler_error?: string;
    capability?: string;
  },
  extra?: { handler_error?: string } | "complete" | "failed",
): Evidence {
  const handlerError =
    typeof extra === "object" && extra ? extra.handler_error : auth.handler_error;
  const status: "complete" | "failed" =
    typeof extra === "string"
      ? extra
      : auth.decision === "allow"
        ? "complete"
        : "failed";

  const payload: Extract<EvidencePayload, { type: "authority" }> = {
    type: "authority",
    decision: auth.decision,
    reason: auth.reason,
    capability: auth.capability ?? capability,
    handler_error: handlerError,
  };
  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: baseEvidence(nodeId, runId, "scheduler", capability, "capability-authority"),
    spec: {
      status,
      confidence: auth.decision === "allow" ? 1 : 0.5,
      coverage: 1,
      assumptions: [],
      known_gaps: [],
      checks: [],
      payload,
    },
  };
}

export function buildRetrievalEvidence(
  nodeId: string,
  runId: string,
  providerId: string,
  payload: Extract<EvidencePayload, { type: "retrieval" }>,
): Evidence {
  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: baseEvidence(nodeId, runId, "worker", "knowledge.search", providerId),
    spec: {
      status: "complete",
      confidence: payload.degraded ? 0.6 : 0.9,
      coverage: payload.hit_count > 0 ? 1 : 0.3,
      assumptions: payload.degraded ? [`degraded:${payload.degraded}`] : [],
      known_gaps: [],
      checks: [],
      payload,
    },
  };
}

export function buildSelectionPayload(
  capability: string,
  ranked: ProviderEntry[],
  selected: ProviderEntry,
  strategy: ProviderStrategy,
  constraintsMatched: boolean,
): Extract<EvidencePayload, { type: "selection" }> {
  return {
    type: "selection",
    capability,
    ranking_snapshot: ranked.map((p) => ({
      provider_id: p.id,
      score: (p.telemetry?.success_rate ?? 0.5) * p.quality_score,
      cost: p.cost,
      success_rate: p.telemetry?.success_rate ?? 0.5,
      selected: p.id === selected.id,
    })),
    strategy_applied: strategy,
    constraints_matched: constraintsMatched,
  };
}

export function validateEvidenceV21(
  evidence: Evidence | undefined,
  dodList: DoDCheck[],
  node: GraphNode,
  minConfidence = 0,
  lineage?: {
    run_id?: string;
    node_id?: string;
    execution_id?: string;
    agent_id?: string;
  },
): { valid: boolean; reason?: string } {
  if (!evidence) return { valid: false, reason: "evidence_incomplete" };
  if (evidence.spec.status !== "complete") return { valid: false, reason: "evidence_incomplete" };

  const confidence = evidence.spec.confidence ?? 0;
  if (confidence < minConfidence) return { valid: false, reason: "confidence_below_threshold" };

  const criticalGaps = evidence.spec.known_gaps?.filter((g) => g.severity === "critical") ?? [];
  if (criticalGaps.length > 0) return { valid: false, reason: "critical_gaps_declared" };

  for (const dod of dodList) {
    const matching = evidence.spec.checks.find((c) => c.dod_id === dod.id);
    if (!matching || matching.result !== "pass") {
      return { valid: false, reason: `dod_failed:${dod.id}` };
    }
  }

  if (node.type === "gate") {
    if (!evidence.spec.verdict) return { valid: false, reason: "gate_verdict_missing" };
    if (evidence.spec.verdict === "rejected") return { valid: false, reason: "gate_rejected" };
  }

  if (lineage?.run_id && evidence.metadata.run_id !== lineage.run_id) {
    return { valid: false, reason: "lineage_run_id_mismatch" };
  }
  if (lineage?.node_id && evidence.metadata.node_id !== lineage.node_id) {
    return { valid: false, reason: "lineage_node_id_mismatch" };
  }
  if (lineage?.execution_id) {
    const assumptions = evidence.spec.assumptions ?? [];
    if (!assumptions.includes(`execution_id:${lineage.execution_id}`)) {
      return { valid: false, reason: "lineage_execution_id_mismatch" };
    }
  }
  if (lineage?.agent_id) {
    const metaAgent = (evidence.metadata as { agent_id?: string }).agent_id;
    const assumptions = evidence.spec.assumptions ?? [];
    if (metaAgent !== lineage.agent_id && !assumptions.includes(`agent_id:${lineage.agent_id}`)) {
      return { valid: false, reason: "lineage_agent_id_mismatch" };
    }
  }

  return { valid: true };
}
