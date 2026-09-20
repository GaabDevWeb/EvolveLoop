import { createHash } from "node:crypto";
import type { CapabilityIR, GraphNode, IRNode } from "../types/index.js";

/** Deterministic hash of executable plan shape (not runtime status). */
export function hashCapabilityIR(ir: CapabilityIR): string {
  const nodes = [...ir.spec.nodes]
    .map((n) => ({
      id: n.id,
      capability: n.capability,
      type: n.type,
      dependencies: [...(n.dependencies ?? [])].sort(),
      constraints: n.constraints ?? {},
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const payload = JSON.stringify({
    kind: ir.kind,
    policy_ref: ir.metadata.policy_ref,
    nodes,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function stampPlanLineage(
  ir: CapabilityIR,
  opts: {
    execution_id: string;
    plan_version: number;
    parent_plan_id?: string;
    replan_id?: string;
    replan_reason?: string;
  },
): CapabilityIR {
  const plan_hash = hashCapabilityIR(ir);
  return {
    ...ir,
    metadata: {
      ...ir.metadata,
      execution_id: opts.execution_id,
      plan_version: opts.plan_version,
      parent_plan_id: opts.parent_plan_id,
      replan_id: opts.replan_id,
      replan_reason: opts.replan_reason,
      plan_hash,
    },
  };
}

export function failureSignature(failedNode: GraphNode | undefined, failureClass: string): string {
  return `${failedNode?.id ?? "?"}::${failedNode?.capability ?? "?"}::${failureClass}`;
}

export function nodesEquivalent(a: IRNode, b: IRNode): boolean {
  return a.id === b.id && a.capability === b.capability && a.type === b.type;
}
