/**
 * Project checkpoint persistence — complements B04; AT_LEAST_ONCE.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { ProjectCheckpoint } from "./types.js";

export class ProjectCheckpointStore {
  constructor(private readonly rootDir: string) {
    mkdirSync(rootDir, { recursive: true });
  }

  pathFor(projectId: string): string {
    return join(this.rootDir, `${projectId}.project.json`);
  }

  save(cp: ProjectCheckpoint): void {
    const p = this.pathFor(cp.project_id);
    const tmp = p + ".tmp";
    writeFileSync(tmp, JSON.stringify(cp, null, 2), "utf-8");
    renameSync(tmp, p);
  }

  load(projectId: string): ProjectCheckpoint | null {
    const p = this.pathFor(projectId);
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as ProjectCheckpoint;
    } catch {
      return null;
    }
  }
}
