import type { DoDCheck, Evidence, EvidenceFinding, GraphNode } from "../types/index.js";
import {
  validateEvidenceV21,
  buildWorkerEvidence,
  buildGateEvidence,
} from "./builders.js";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateEvidence(
  evidence: Evidence | undefined,
  dodList: DoDCheck[],
  node: GraphNode,
  minConfidence = 0,
): ValidationResult {
  return validateEvidenceV21(evidence, dodList, node, minConfidence);
}

export function buildSuccessEvidence(
  node: GraphNode,
  runId: string,
  providerId: string,
  durationMs: number,
): Evidence {
  if (node.type === "gate") {
    return buildGateEvidence(node, runId, providerId, "passed", 0.9);
  }
  return buildWorkerEvidence(node, runId, providerId, durationMs);
}

export function buildRejectedGateEvidence(
  node: GraphNode,
  runId: string,
  providerId: string,
  findings: EvidenceFinding[] | undefined,
): Evidence {
  return buildGateEvidence(node, runId, providerId, "rejected", 0.8, findings);
}
