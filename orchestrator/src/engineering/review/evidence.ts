import { createHash } from "node:crypto";
import { buildPlanningEvidence } from "../../evidence/builders.js";
import type { Evidence } from "../../types/index.js";
import type { EngineeringReviewRequest, EngineeringReviewResult } from "./types.js";

export function fingerprintReview(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 24);
}

export function buildReviewEvidence(
  req: EngineeringReviewRequest,
  result: EngineeringReviewResult,
): Evidence {
  const evidence = buildPlanningEvidence(
    req.implementation_execution_id,
    {
      type: "planning",
      decomposition_confidence: result.status === "APPROVED" ? 0.9 : 0.4,
      unresolved_dependencies: result.findings.filter((f) => f.blocking).map((f) => f.finding_id),
      critical_path: [req.task_id, req.review_id, req.implementation_version],
      out_of_scope: result.findings
        .filter((f) => f.category === "scope_violation")
        .map((f) => f.file ?? f.finding_id),
    },
    [
      `review=${result.review_id}`,
      `status=${result.status}`,
      `reviewer=${result.reviewer_identity.reviewer_id}@${result.reviewer_identity.reviewer_version}`,
      `impl=${result.review_lineage.implementation_version}`,
      `findings=${result.findings.length}`,
    ],
  );
  evidence.metadata.capability = "engineering.review";
  evidence.metadata.node_id = `review:${result.review_id}`;
  evidence.spec.checks = [
    {
      dod_id: "review_status",
      result: result.status === "APPROVED" ? "pass" : "fail",
      details: result.status,
    },
    {
      dod_id: "blockers",
      result: result.findings.some((f) => f.blocking) ? "fail" : "pass",
      details: String(result.findings.filter((f) => f.blocking).length),
    },
  ];
  return evidence;
}
