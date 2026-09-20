/**
 * Filesystem YAML artifact store for RequirementsSpec versions.
 * Does not create a new database — mirrors knowledge store pattern.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { RequirementsSpec } from "./types.js";
import { RequirementsImmutabilityError, cloneRequirementsSpec } from "./versioning.js";

export interface RequirementsArtifactMeta {
  requirements_id: string;
  version: number;
  artifact_id: string;
  created_at: string;
  updated_at: string;
  source?: RequirementsSpec["source"];
  baseline?: boolean;
  path: string;
}

export class RequirementsArtifactStore {
  constructor(private readonly rootDir: string) {
    mkdirSync(this.rootDir, { recursive: true });
  }

  private dirFor(id: string): string {
    return join(this.rootDir, id);
  }

  private fileFor(id: string, version: number): string {
    return join(this.dirFor(id), `v${version}.yaml`);
  }

  private indexPath(id: string): string {
    return join(this.dirFor(id), "index.yaml");
  }

  artifactId(id: string, version: number): string {
    return `requirements://${id}@${version}`;
  }

  /**
   * Persist a version. Refuses overwrite of existing baseline or any existing file
   * (immutability of written versions).
   */
  save(spec: RequirementsSpec): RequirementsArtifactMeta {
    const dir = this.dirFor(spec.requirements_id);
    mkdirSync(dir, { recursive: true });
    const path = this.fileFor(spec.requirements_id, spec.version);
    if (existsSync(path)) {
      throw new RequirementsImmutabilityError(
        `Artifact already exists: ${path} (versions are immutable once written)`,
      );
    }

    const toWrite = cloneRequirementsSpec(spec);
    toWrite.artifact_id = this.artifactId(spec.requirements_id, spec.version);
    const body = stringifyYaml(toWrite);
    writeFileSync(path, body, "utf-8");

    const meta: RequirementsArtifactMeta = {
      requirements_id: spec.requirements_id,
      version: spec.version,
      artifact_id: toWrite.artifact_id!,
      created_at: toWrite.created_at,
      updated_at: new Date().toISOString(),
      source: toWrite.source,
      baseline: toWrite.baseline,
      path,
    };
    this.updateIndex(meta);
    return meta;
  }

  load(requirements_id: string, version: number): RequirementsSpec | null {
    const path = this.fileFor(requirements_id, version);
    if (!existsSync(path)) return null;
    const raw = parseYaml(readFileSync(path, "utf-8")) as RequirementsSpec;
    return raw;
  }

  listVersions(requirements_id: string): number[] {
    const dir = this.dirFor(requirements_id);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => /^v\d+\.yaml$/.test(f))
      .map((f) => Number(f.slice(1, -5)))
      .sort((a, b) => a - b);
  }

  private updateIndex(meta: RequirementsArtifactMeta): void {
    const idxPath = this.indexPath(meta.requirements_id);
    let entries: RequirementsArtifactMeta[] = [];
    if (existsSync(idxPath)) {
      const parsed = parseYaml(readFileSync(idxPath, "utf-8")) as {
        entries?: RequirementsArtifactMeta[];
      };
      entries = parsed.entries ?? [];
    }
    entries = entries.filter(
      (e) => !(e.requirements_id === meta.requirements_id && e.version === meta.version),
    );
    entries.push(meta);
    writeFileSync(idxPath, stringifyYaml({ entries }), "utf-8");
  }
}
