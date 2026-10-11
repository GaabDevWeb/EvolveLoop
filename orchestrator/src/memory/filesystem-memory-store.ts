import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { pathEscapesWorkspace } from "../authority/capability-authority.js";
import { PathEscapeError } from "../providers/deterministic/paths.js";
import { MemoryStore, type FeatureMemoryMeta } from "./memory-store.js";
import type { MemoryEntry } from "../types/index.js";

/**
 * SEC-002 — confine featureId under rootDir.
 * Reject `/`, `\`, `..`, or any id whose resolve escapes rootDir.
 */
export function assertFeatureIdConfined(rootDir: string, featureId: string): void {
  if (typeof featureId !== "string" || featureId.trim().length === 0) {
    throw new PathEscapeError("featureId must be a non-empty string");
  }
  if (featureId.includes("/") || featureId.includes("\\") || featureId.includes("..")) {
    throw new PathEscapeError(`featureId escapes memory root: ${featureId}`);
  }
  if (pathEscapesWorkspace(featureId, rootDir)) {
    throw new PathEscapeError(`featureId escapes memory root: ${featureId}`);
  }
}

interface EntriesFile {
  entries: MemoryEntry[];
}

interface ContextFile {
  feature_id: string;
  ir_id: string;
  policy: string;
  started_at?: string;
  user_request?: string;
}

function readEntriesFile(path: string): MemoryEntry[] {
  if (!existsSync(path)) return [];
  const raw = parseYaml(readFileSync(path, "utf-8")) as EntriesFile | null;
  if (!raw || !Array.isArray(raw.entries)) return [];
  return raw.entries.map((e) => ({
    timestamp: String(e.timestamp ?? ""),
    source: String(e.source ?? ""),
    type: String(e.type ?? ""),
    content: String(e.content ?? ""),
  }));
}

function writeEntriesFile(path: string, entries: MemoryEntry[]): void {
  const payload: EntriesFile = { entries };
  writeFileSync(path, stringifyYaml(payload), "utf-8");
}

function loadFeatureFromDisk(
  featureDir: string,
  featureId: string,
): { meta?: FeatureMemoryMeta; entries: MemoryEntry[] } {
  const contextPath = join(featureDir, "context.yaml");
  let meta: FeatureMemoryMeta | undefined;

  if (existsSync(contextPath)) {
    const ctx = parseYaml(readFileSync(contextPath, "utf-8")) as ContextFile;
    meta = {
      ir_id: ctx.ir_id ?? featureId,
      policy: ctx.policy ?? "",
      started_at: ctx.started_at,
      user_request: ctx.user_request,
    };
  }

  const preferences = readEntriesFile(join(featureDir, "preferences.yaml"));
  const decisions = readEntriesFile(join(featureDir, "decisions.yaml"));
  return { meta, entries: [...preferences, ...decisions] };
}

function loadAllFromDisk(rootDir: string): Map<string, { meta?: FeatureMemoryMeta; entries: MemoryEntry[] }> {
  const result = new Map<string, { meta?: FeatureMemoryMeta; entries: MemoryEntry[] }>();
  if (!existsSync(rootDir)) return result;

  for (const name of readdirSync(rootDir)) {
    try {
      assertFeatureIdConfined(rootDir, name);
    } catch {
      continue; // skip escape / traversal names on disk
    }
    const featureDir = join(rootDir, name);
    if (!statSync(featureDir).isDirectory()) continue;
    result.set(name, loadFeatureFromDisk(featureDir, name));
  }
  return result;
}

/**
 * Filesystem-backed MemoryStore.
 * Layout: `<rootDir>/<featureId>/{context,preferences,decisions}.yaml`
 */
export class FilesystemMemoryStore extends MemoryStore {
  constructor(private rootDir: string) {
    super();
    for (const [featureId, data] of loadAllFromDisk(rootDir)) {
      this.hydrateFeature(featureId, data.meta, data.entries);
    }
  }

  override initFeature(featureId: string, meta: { ir_id: string; policy: string }): void {
    assertFeatureIdConfined(this.rootDir, featureId);
    super.initFeature(featureId, meta);
    this.persistContext(featureId);
  }

  override append(featureId: string, entry: MemoryEntry): void {
    assertFeatureIdConfined(this.rootDir, featureId);
    super.append(featureId, entry);
    this.persistEntries(featureId);
  }

  private featureDir(featureId: string): string {
    assertFeatureIdConfined(this.rootDir, featureId);
    return join(this.rootDir, featureId);
  }

  private persistContext(featureId: string): void {
    const meta = this.getFeatureMeta(featureId);
    if (!meta) return;

    const dir = this.featureDir(featureId);
    mkdirSync(dir, { recursive: true });

    const ctx: ContextFile = {
      feature_id: featureId,
      ir_id: meta.ir_id,
      policy: meta.policy,
      started_at: meta.started_at,
      user_request: meta.user_request,
    };
    writeFileSync(join(dir, "context.yaml"), stringifyYaml(ctx), "utf-8");
  }

  private persistEntries(featureId: string): void {
    const dir = this.featureDir(featureId);
    mkdirSync(dir, { recursive: true });

    const all = this.getAllEntries(featureId);
    const preferences = all.filter(
      (e) => e.type === "preference" || e.type === "rejection_feedback",
    );
    const decisions = all.filter((e) => e.type === "decision");

    writeEntriesFile(join(dir, "preferences.yaml"), preferences);
    if (decisions.length > 0) {
      writeEntriesFile(join(dir, "decisions.yaml"), decisions);
    }
  }
}
