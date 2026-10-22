import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { redactSecrets } from "./secret-redaction.js";
import { assertFeatureIdConfined } from "../memory/filesystem-memory-store.js";
import type { Evidence, GraphNode } from "../types/index.js";
import { serializeEvidenceForPublish, serializeForPublish } from "./publish-sanitize.js";

export function resolveEvidenceDir(memoryRoot: string, featureId: string): string {
  assertFeatureIdConfined(memoryRoot, featureId);
  return join(memoryRoot, featureId, "evidence");
}

export function writeSanitizedJsonFile(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${serializeForPublish(data)}\n`, "utf-8");
}

export function writeSanitizedTextFile(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, redactSecrets(text), "utf-8");
}

export function gateEvidenceFilename(node: GraphNode): string | null {
  if (node.type !== "gate") return null;
  switch (node.capability) {
    case "testing":
      return "gate.testing.json";
    case "security-review":
      return "gate.security.json";
    case "po-acceptance":
      return "gate.po.json";
    case "design-stress-test":
      return "gate.grill-me.json";
    default:
      return `gate.${node.capability.replace(/[^a-z0-9-]+/gi, "-")}.json`;
  }
}

export function persistNodeEvidence(
  memoryRoot: string,
  featureId: string,
  node: GraphNode,
  evidence: Evidence,
): { nodePath: string; gatePath?: string } {
  const dir = resolveEvidenceDir(memoryRoot, featureId);
  mkdirSync(dir, { recursive: true });

  const nodePath = join(dir, `node.${node.id}.json`);
  writeFileSync(nodePath, `${serializeEvidenceForPublish(evidence)}\n`, "utf-8");

  let gatePath: string | undefined;
  const gateName = gateEvidenceFilename(node);
  if (gateName) {
    gatePath = join(dir, gateName);
    writeFileSync(gatePath, `${serializeEvidenceForPublish(evidence)}\n`, "utf-8");
  }

  return { nodePath, gatePath };
}

export function persistRunSummary(
  memoryRoot: string,
  featureId: string,
  summary: unknown,
): string {
  const dir = resolveEvidenceDir(memoryRoot, featureId);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "run-summary.json");
  writeSanitizedJsonFile(path, summary);
  return path;
}

/**
 * Copy external evidence into jobs-dir with redaction (run-jobs complete).
 */
export function copySanitizedEvidenceToJobsDir(
  jobsDir: string,
  runId: string,
  sourceEvidencePath: string,
): string {
  const abs = resolve(sourceEvidencePath);
  if (!existsSync(abs)) {
    throw new Error(`Evidence file not found: ${abs}`);
  }
  const raw = JSON.parse(readFileSync(abs, "utf-8")) as Evidence;
  const dest = join(jobsDir, `${runId}.evidence.json`);
  writeFileSync(dest, `${serializeEvidenceForPublish(raw)}\n`, "utf-8");
  return dest;
}

export function readSanitizedEvidence(path: string): Evidence {
  const abs = resolve(path);
  const raw = JSON.parse(readFileSync(abs, "utf-8")) as Evidence;
  return JSON.parse(serializeEvidenceForPublish(raw)) as Evidence;
}

/** Store sanitized basename reference in result.json */
export function evidencePathForResult(jobsDir: string, runId: string): string {
  return join(jobsDir, `${runId}.evidence.json`);
}

export function relativeJobsEvidencePath(runId: string): string {
  return `${runId}.evidence.json`;
}
