import type { CapabilityIR, GraphNode } from "../types/index.js";
import { GraphStore } from "../graph/graph-store.js";
import { nodesEquivalent } from "./plan-identity.js";

/**
 * Build next graph from candidate IR, preserving satisfied/skipped nodes with matching ids.
 * Side-effect risk: does not assume failed = no side effect (documented limitation).
 */
export function applyReplanPreservingCompleted(
  previous: GraphStore,
  candidateIr: CapabilityIR,
): GraphStore {
  const next = new GraphStore(candidateIr);
  for (const old of previous.getAllNodes()) {
    if (old.status !== "satisfied" && old.status !== "skipped") continue;
    const neu = next.getNode(old.id);
    if (!neu) continue;
    if (!nodesEquivalent(neu, old as unknown as GraphNode)) continue;
    next.setNodeStatus(old.id, old.status);
    if (old.evidence) next.setNodeEvidence(old.id, old.evidence);
    if (old.provider_id && old.run_id) {
      next.setProvider(old.id, old.provider_id, old.run_id);
    }
  }
  return next;
}
