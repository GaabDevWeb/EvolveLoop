/**
 * V22-GOAL-004 — verifiable session continuity (checkpoint + memory decisions + next action).
 */

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { GraphSnapshot, MemoryEntry } from "../types/index.js";
import { assertFeatureIdConfined } from "../memory/filesystem-memory-store.js";
import { writeSanitizedJsonFile } from "../evidence/evidence-bus.js";
import type { MemoryStore } from "../memory/memory-store.js";

export const SESSION_CONTINUITY_VERSION = "capability-orchestrator.io/v2.2/session-continuity@1";

export interface SessionNextAction {
  node_id: string;
  capability: string;
  run_id?: string;
  reason: "awaiting_external_job";
}

export interface SessionContinuitySnapshot {
  apiVersion: typeof SESSION_CONTINUITY_VERSION;
  feature_id: string;
  ir_id: string;
  policy_id: string;
  saved_at: string;
  decisions: MemoryEntry[];
  next_action: SessionNextAction | null;
  /** External job run_ids already applied to satisfied nodes (do not re-ingest). */
  satisfied_job_run_ids: string[];
}

function continuityPath(memoryRoot: string, featureId: string): string {
  assertFeatureIdConfined(memoryRoot, featureId);
  return join(memoryRoot, featureId, "session-continuity.json");
}

export function continuityEvidencePath(memoryRoot: string, featureId: string): string {
  return join(memoryRoot, featureId, "evidence", "continuity.json");
}

export function collectSatisfiedJobRunIds(graph: GraphSnapshot): string[] {
  const ids: string[] = [];
  for (const node of graph.nodes) {
    if (node.status === "satisfied" && node.run_id) ids.push(node.run_id);
  }
  return ids.sort();
}

export function buildSessionContinuitySnapshot(input: {
  featureId: string;
  irId: string;
  policyId: string;
  graph: GraphSnapshot;
  memory: MemoryStore;
  waitingNode?: { id: string; capability: string; run_id?: string };
}): SessionContinuitySnapshot {
  const next_action: SessionNextAction | null = input.waitingNode
    ? {
        node_id: input.waitingNode.id,
        capability: input.waitingNode.capability,
        run_id: input.waitingNode.run_id,
        reason: "awaiting_external_job",
      }
    : null;

  return {
    apiVersion: SESSION_CONTINUITY_VERSION,
    feature_id: input.featureId,
    ir_id: input.irId,
    policy_id: input.policyId,
    saved_at: new Date().toISOString(),
    decisions: input.memory.getDecisions(input.featureId),
    next_action,
    satisfied_job_run_ids: collectSatisfiedJobRunIds(input.graph),
  };
}

export function persistSessionContinuity(
  memoryRoot: string,
  snapshot: SessionContinuitySnapshot,
): { statePath: string; evidencePath: string } {
  const statePath = continuityPath(memoryRoot, snapshot.feature_id);
  writeSanitizedJsonFile(statePath, snapshot);
  const evidencePath = continuityEvidencePath(memoryRoot, snapshot.feature_id);
  writeSanitizedJsonFile(evidencePath, snapshot);
  return { statePath, evidencePath };
}

export function loadSessionContinuity(
  memoryRoot: string,
  featureId: string,
): SessionContinuitySnapshot | null {
  const path = continuityPath(memoryRoot, featureId);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as SessionContinuitySnapshot;
}

export function clearSessionContinuity(memoryRoot: string, featureId: string): void {
  const path = continuityPath(memoryRoot, featureId);
  if (existsSync(path)) unlinkSync(path);
}

export function applySessionContinuityToMemory(
  memory: MemoryStore,
  featureId: string,
  snapshot: SessionContinuitySnapshot,
): void {
  const existing = new Set(memory.getDecisions(featureId).map((d) => d.content));
  for (const decision of snapshot.decisions) {
    if (existing.has(decision.content)) continue;
    memory.append(featureId, { ...decision });
    existing.add(decision.content);
  }
}
