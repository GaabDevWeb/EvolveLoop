import { join } from "node:path";

export interface DataPaths {
  root: string;
  eventsDir: string;
  knowledgeDir: string;
  memoryDir: string;
  /** EvolveLoop longitudinal state (signals/needs/outcomes) — not knowledge/memory/telemetry */
  evolutionDir: string;
}

export function resolveDataPaths(root: string): DataPaths {
  return {
    root,
    eventsDir: join(root, "telemetry", "events"),
    knowledgeDir: join(root, "knowledge"),
    memoryDir: join(root, "memory"),
    evolutionDir: join(root, "evolution"),
  };
}
