import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { GraphSnapshot } from "../types/index.js";

export interface EngineCheckpoint {
  apiVersion: "capability-orchestrator.io/v2";
  kind: "EngineCheckpoint";
  feature_id: string;
  policy_id: string;
  ir_id: string;
  graph: GraphSnapshot;
  saved_at: string;
}

export function checkpointPath(jobsDir: string, featureId: string): string {
  return join(jobsDir, "checkpoints", `${featureId}.json`);
}

export function saveCheckpoint(
  jobsDir: string,
  data: Omit<EngineCheckpoint, "apiVersion" | "kind" | "saved_at">,
): string {
  const path = checkpointPath(jobsDir, data.feature_id);
  mkdirSync(join(jobsDir, "checkpoints"), { recursive: true });
  const doc: EngineCheckpoint = {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "EngineCheckpoint",
    saved_at: new Date().toISOString(),
    ...data,
  };
  writeFileSync(path, JSON.stringify(doc, null, 2));
  return path;
}

export function loadCheckpoint(jobsDir: string, featureId: string): EngineCheckpoint | null {
  const path = checkpointPath(jobsDir, featureId);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as EngineCheckpoint;
}

export function clearCheckpoint(jobsDir: string, featureId: string): void {
  const path = checkpointPath(jobsDir, featureId);
  if (existsSync(path)) unlinkSync(path);
}
