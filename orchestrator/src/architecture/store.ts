/**
 * Filesystem YAML artifact store for ArchitectureSpec versions.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { ArchitectureSpec } from "./types.js";
import { ArchitectureImmutabilityError, cloneArchitectureSpec } from "./versioning.js";

export interface ArchitectureArtifactMeta {
  architecture_id: string;
  version: number;
  artifact_id: string;
  requirements_id: string;
  requirements_version: number;
  created_at: string;
  updated_at: string;
  baseline?: boolean;
  path: string;
}

export class ArchitectureArtifactStore {
  constructor(private readonly rootDir: string) {
    mkdirSync(this.rootDir, { recursive: true });
  }

  private dirFor(id: string): string {
    return join(this.rootDir, id);
  }

  private fileFor(id: string, version: number): string {
    return join(this.dirFor(id), `v${version}.yaml`);
  }

  artifactId(id: string, version: number): string {
    return `architecture://${id}@${version}`;
  }

  save(spec: ArchitectureSpec): ArchitectureArtifactMeta {
    const dir = this.dirFor(spec.architecture_id);
    mkdirSync(dir, { recursive: true });
    const path = this.fileFor(spec.architecture_id, spec.version);
    if (existsSync(path)) {
      throw new ArchitectureImmutabilityError(
        `Artifact already exists: ${path} (versions are immutable once written)`,
      );
    }
    const toWrite = cloneArchitectureSpec(spec);
    toWrite.artifact_id = this.artifactId(spec.architecture_id, spec.version);
    writeFileSync(path, stringifyYaml(toWrite), "utf-8");
    return {
      architecture_id: spec.architecture_id,
      version: spec.version,
      artifact_id: toWrite.artifact_id!,
      requirements_id: spec.requirements_reference.requirements_id,
      requirements_version: spec.requirements_reference.requirements_version,
      created_at: toWrite.created_at,
      updated_at: new Date().toISOString(),
      baseline: toWrite.baseline,
      path,
    };
  }

  load(architecture_id: string, version: number): ArchitectureSpec | null {
    const path = this.fileFor(architecture_id, version);
    if (!existsSync(path)) return null;
    return parseYaml(readFileSync(path, "utf-8")) as ArchitectureSpec;
  }

  listVersions(architecture_id: string): number[] {
    const dir = this.dirFor(architecture_id);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => /^v\d+\.yaml$/.test(f))
      .map((f) => Number(f.slice(1, -5)))
      .sort((a, b) => a - b);
  }
}
