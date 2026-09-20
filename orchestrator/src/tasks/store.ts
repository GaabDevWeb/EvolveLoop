import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { EngineeringTaskGraph } from "./types.js";
import { TaskGraphImmutabilityError, cloneTaskGraph } from "./versioning.js";

export interface TaskGraphArtifactMeta {
  task_graph_id: string;
  version: number;
  artifact_id: string;
  requirements_id: string;
  requirements_version: number;
  architecture_id: string;
  architecture_version: number;
  created_at: string;
  updated_at: string;
  baseline?: boolean;
  path: string;
}

export class TaskGraphArtifactStore {
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
    return `taskgraph://${id}@${version}`;
  }

  save(graph: EngineeringTaskGraph): TaskGraphArtifactMeta {
    const dir = this.dirFor(graph.task_graph_id);
    mkdirSync(dir, { recursive: true });
    const path = this.fileFor(graph.task_graph_id, graph.version);
    if (existsSync(path)) {
      throw new TaskGraphImmutabilityError(
        `Artifact already exists: ${path} (versions are immutable once written)`,
      );
    }
    const toWrite = cloneTaskGraph(graph);
    toWrite.artifact_id = this.artifactId(graph.task_graph_id, graph.version);
    writeFileSync(path, stringifyYaml(toWrite), "utf-8");
    return {
      task_graph_id: graph.task_graph_id,
      version: graph.version,
      artifact_id: toWrite.artifact_id!,
      requirements_id: graph.requirements_reference.requirements_id,
      requirements_version: graph.requirements_reference.requirements_version,
      architecture_id: graph.architecture_reference.architecture_id,
      architecture_version: graph.architecture_reference.architecture_version,
      created_at: toWrite.created_at,
      updated_at: new Date().toISOString(),
      baseline: toWrite.baseline,
      path,
    };
  }

  load(task_graph_id: string, version: number): EngineeringTaskGraph | null {
    const path = this.fileFor(task_graph_id, version);
    if (!existsSync(path)) return null;
    return parseYaml(readFileSync(path, "utf-8")) as EngineeringTaskGraph;
  }

  listVersions(task_graph_id: string): number[] {
    const dir = this.dirFor(task_graph_id);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => /^v\d+\.yaml$/.test(f))
      .map((f) => Number(f.slice(1, -5)))
      .sort((a, b) => a - b);
  }
}
