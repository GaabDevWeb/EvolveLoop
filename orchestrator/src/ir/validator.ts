import { randomUUID } from "node:crypto";
import type { CapabilityIR, IRLValidationError, IRNode } from "../types/index.js";

export function validateIR(ir: CapabilityIR, knownCapabilities?: Set<string>): IRLValidationError[] {
  const errors: IRLValidationError[] = [];
  const ids = new Set<string>();

  if (ir.apiVersion !== "capability-orchestrator.io/v2") {
    errors.push({ code: "IR_INVALID_API_VERSION", message: `Expected v2, got ${ir.apiVersion}` });
  }

  if (ir.kind !== "CapabilityGraph") {
    errors.push({ code: "IR_INVALID_KIND", message: `Expected CapabilityGraph, got ${ir.kind}` });
  }

  for (const node of ir.spec.nodes) {
    if (ids.has(node.id)) {
      errors.push({ code: "IR_DUPLICATE_ID", message: `Duplicate node id: ${node.id}`, node_id: node.id });
    }
    ids.add(node.id);

    if (!node.capability) {
      errors.push({ code: "IR_MISSING_CAPABILITY", message: `Node ${node.id} missing capability`, node_id: node.id });
    }

    if (node.type !== "worker" && node.type !== "gate") {
      errors.push({ code: "IR_INVALID_TYPE", message: `Node ${node.id} invalid type`, node_id: node.id });
    }

    if (knownCapabilities && !knownCapabilities.has(node.capability)) {
      errors.push({
        code: "IR_UNKNOWN_CAPABILITY",
        message: `Unknown capability: ${node.capability}`,
        node_id: node.id,
      });
    }
  }

  for (const node of ir.spec.nodes) {
    for (const dep of node.dependencies) {
      if (!ids.has(dep)) {
        errors.push({
          code: "IR_DANGLING_EDGE",
          message: `Node ${node.id} depends on unknown ${dep}`,
          node_id: node.id,
        });
      }
    }
  }

  if (detectCycle(ir.spec.nodes)) {
    errors.push({ code: "IR_CYCLE_DETECTED", message: "Cycle detected in dependency graph" });
  }

  return errors;
}

function detectCycle(nodes: IRNode[]): boolean {
  const graph = new Map<string, string[]>();
  for (const n of nodes) graph.set(n.id, n.dependencies);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dep of graph.get(id) ?? []) {
      if (dfs(dep)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return nodes.some((n) => dfs(n.id));
}

export function loadIRFromObject(data: unknown): CapabilityIR {
  return data as CapabilityIR;
}

export function newRunId(): string {
  return randomUUID();
}
