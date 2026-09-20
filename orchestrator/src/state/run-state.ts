/** Feature run state machine — contracts/runtime.md */

import type { FeatureRunState, GraphNode, NodeStatus } from "../types/index.js";

export function deriveRunState(nodes: GraphNode[], explicit?: FeatureRunState): FeatureRunState {
  if (explicit === "cancelled") return "cancelled";
  if (nodes.every((n) => n.status === "cancelled")) return "cancelled";
  if (nodes.every((n) => n.status === "satisfied" || n.status === "skipped")) return "completed";
  if (nodes.some((n) => n.status === "blocked" || (n.status === "failed"))) return "blocked";
  if (nodes.some((n) => n.status === "running" || n.status === "waiting")) return "active";
  return "active";
}

export function canTransition(from: NodeStatus, to: NodeStatus): boolean {
  const allowed: Record<NodeStatus, NodeStatus[]> = {
    pending: ["ready", "running", "skipped", "cancelled"],
    ready: ["running", "cancelled"],
    running: ["waiting", "satisfied", "failed", "blocked", "cancelled"],
    waiting: ["running", "satisfied", "failed", "blocked", "cancelled"],
    satisfied: [],
    failed: ["pending", "blocked", "cancelled"],
    blocked: ["pending", "cancelled"],
    skipped: [],
    cancelled: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export function transitionNode(node: GraphNode, to: NodeStatus): void {
  if (!canTransition(node.status, to)) {
    throw new Error(`Invalid transition ${node.status} → ${to} for node ${node.id}`);
  }
  node.status = to;
}
