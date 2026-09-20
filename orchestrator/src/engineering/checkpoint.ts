/**
 * Worker checkpoint persistence — complements B04; does not replace JobStore.
 * Semantics: AT_LEAST_ONCE for effects (idempotent fingerprints).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { EngineeringWorkerCheckpoint } from "./types.js";

export class WorkerCheckpointStore {
  constructor(private readonly rootDir: string) {
    mkdirSync(rootDir, { recursive: true });
  }

  pathFor(workId: string): string {
    return join(this.rootDir, `${workId}.checkpoint.json`);
  }

  save(cp: EngineeringWorkerCheckpoint): void {
    const p = this.pathFor(cp.work_id);
    const tmp = p + ".tmp";
    writeFileSync(tmp, JSON.stringify(cp, null, 2), "utf-8");
    renameSync(tmp, p);
  }

  load(workId: string): EngineeringWorkerCheckpoint | null {
    const p = this.pathFor(workId);
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as EngineeringWorkerCheckpoint;
    } catch {
      return null;
    }
  }
}
