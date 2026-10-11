import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { GraphSnapshot } from "../types/index.js";

const API_VERSION = "capability-orchestrator.io/v2";
const ENVELOPE_KIND = "EngineCheckpointEnvelope";
const PAYLOAD_KIND = "EngineCheckpoint";
const ENVELOPE_VERSION = 1;
const ALG = "HMAC-SHA256";
const CANONICAL = "sorted-json-v1";
const KEY_ENV = "EVOLVELOOP_CHECKPOINT_HMAC_KEY";
const MIN_KEY_BYTES = 32;

export class CheckpointError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CheckpointError";
    this.code = code;
  }
}

export interface EngineCheckpoint {
  apiVersion: typeof API_VERSION;
  kind: typeof PAYLOAD_KIND;
  feature_id: string;
  policy_id: string;
  ir_id: string;
  graph: GraphSnapshot;
  saved_at: string;
}

export interface CheckpointLoadOptions {
  ir_id?: string;
  policy_id?: string;
  key?: Buffer;
}

interface CheckpointEnvelope {
  apiVersion: typeof API_VERSION;
  kind: typeof ENVELOPE_KIND;
  envelope_version: typeof ENVELOPE_VERSION;
  alg: typeof ALG;
  canonical: typeof CANONICAL;
  payload: EngineCheckpoint;
  mac: string;
}

function assertFeatureId(featureId: string): void {
  if (
    featureId.length === 0 ||
    featureId.includes("/") ||
    featureId.includes("\\") ||
    featureId.includes("..") ||
    featureId.includes("\0")
  ) {
    throw new CheckpointError("CHECKPOINT_PATH_DENIED", "feature_id is not a safe checkpoint name");
  }
}

function checkpointsDir(jobsDir: string): string {
  return join(resolve(jobsDir), "checkpoints");
}

function checkpointPath(jobsDir: string, featureId: string): string {
  assertFeatureId(featureId);
  const dir = checkpointsDir(jobsDir);
  const path = join(dir, `${featureId}.json`);
  const root = dir.endsWith(sep) ? dir : dir + sep;
  if (!path.startsWith(root)) {
    throw new CheckpointError("CHECKPOINT_PATH_DENIED", "checkpoint path escapes the jobs directory");
  }
  return path;
}

function refuseSymlink(path: string): void {
  if (!existsSync(path)) return;
  if (lstatSync(path).isSymbolicLink()) {
    throw new CheckpointError("CHECKPOINT_PATH_DENIED", "checkpoint path is a symlink");
  }
}

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new CheckpointError("KEY_ABSENT", `${KEY_ENV} is not set`);
  }
  const decoded = Buffer.from(trimmed, "base64");
  const roundTrip = decoded.toString("base64").replace(/=+$/, "") === trimmed.replace(/=+$/, "");
  if (roundTrip && decoded.length >= MIN_KEY_BYTES) return decoded;
  const utf8 = Buffer.from(trimmed, "utf8");
  if (utf8.length >= MIN_KEY_BYTES) return utf8;
  throw new CheckpointError("KEY_INVALID", `${KEY_ENV} must be at least ${MIN_KEY_BYTES} bytes`);
}

function resolveKey(explicit?: Buffer): Buffer {
  if (explicit) {
    if (explicit.length < MIN_KEY_BYTES) {
      throw new CheckpointError("KEY_INVALID", "checkpoint key must be at least 32 bytes");
    }
    return explicit;
  }
  const raw = process.env[KEY_ENV];
  if (raw === undefined || raw.trim().length === 0) {
    throw new CheckpointError("KEY_ABSENT", `${KEY_ENV} is not set`);
  }
  return decodeKey(raw);
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

function macHex(key: Buffer, payload: EngineCheckpoint): string {
  const material = canonicalize({
    alg: ALG,
    canonical: CANONICAL,
    envelope_version: ENVELOPE_VERSION,
    payload,
  });
  return createHmac("sha256", key).update(material).digest("hex");
}

function macsMatch(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  if (expected.length === 0 || expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPayload(payload: unknown, featureId: string, options?: CheckpointLoadOptions): EngineCheckpoint {
  if (!isRecord(payload)) {
    throw new CheckpointError("CORRUPT", "checkpoint payload is not an object");
  }
  if (payload.kind !== PAYLOAD_KIND || payload.apiVersion !== API_VERSION) {
    throw new CheckpointError("UNSUPPORTED_INTEGRITY", "checkpoint payload version is not supported");
  }
  if (payload.feature_id !== featureId) {
    throw new CheckpointError("FEATURE_MISMATCH", "checkpoint feature_id does not match the requested feature");
  }
  if (typeof payload.policy_id !== "string" || typeof payload.ir_id !== "string" || typeof payload.saved_at !== "string") {
    throw new CheckpointError("CORRUPT", "checkpoint payload is missing required fields");
  }
  if (!isRecord(payload.graph) || payload.graph.feature_id !== payload.ir_id || !Array.isArray(payload.graph.nodes)) {
    throw new CheckpointError("CORRUPT", "checkpoint graph does not match the IR");
  }
  if (options?.ir_id !== undefined && payload.ir_id !== options.ir_id) {
    throw new CheckpointError("CONTEXT_MISMATCH", "checkpoint ir_id does not match the resume request");
  }
  if (options?.policy_id !== undefined && payload.policy_id !== options.policy_id) {
    throw new CheckpointError("CONTEXT_MISMATCH", "checkpoint policy_id does not match the resume request");
  }
  return payload as unknown as EngineCheckpoint;
}

export function saveCheckpoint(
  jobsDir: string,
  data: Omit<EngineCheckpoint, "apiVersion" | "kind" | "saved_at">,
  options?: { key?: Buffer },
): string {
  const key = resolveKey(options?.key);
  if (data.graph.feature_id !== data.ir_id) {
    throw new CheckpointError("CORRUPT", "checkpoint graph does not match the IR");
  }
  const path = checkpointPath(jobsDir, data.feature_id);
  refuseSymlink(path);
  const payload = JSON.parse(
    JSON.stringify({
      apiVersion: API_VERSION,
      kind: PAYLOAD_KIND,
      feature_id: data.feature_id,
      policy_id: data.policy_id,
      ir_id: data.ir_id,
      graph: data.graph,
      saved_at: new Date().toISOString(),
    }),
  ) as EngineCheckpoint;
  const envelope: CheckpointEnvelope = {
    apiVersion: API_VERSION,
    kind: ENVELOPE_KIND,
    envelope_version: ENVELOPE_VERSION,
    alg: ALG,
    canonical: CANONICAL,
    payload,
    mac: macHex(key, payload),
  };
  const dir = checkpointsDir(jobsDir);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = join(dir, `.${data.feature_id}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(tmp, `${JSON.stringify(envelope)}\n`, { encoding: "utf-8", mode: 0o600 });
  renameSync(tmp, path);
  return path;
}

export function loadCheckpoint(
  jobsDir: string,
  featureId: string,
  options?: CheckpointLoadOptions,
): EngineCheckpoint | null {
  const path = checkpointPath(jobsDir, featureId);
  if (!existsSync(path)) return null;
  refuseSymlink(path);
  const text = readFileSync(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CheckpointError("CORRUPT", "checkpoint JSON is truncated or invalid");
  }
  if (!isRecord(parsed)) {
    throw new CheckpointError("CORRUPT", "checkpoint JSON is not an object");
  }
  if (parsed.kind === PAYLOAD_KIND || typeof parsed.mac !== "string") {
    throw new CheckpointError("SIGNATURE_ABSENT", "checkpoint has no integrity envelope");
  }
  if (parsed.kind !== ENVELOPE_KIND) {
    throw new CheckpointError("UNSUPPORTED_INTEGRITY", "checkpoint integrity envelope is not supported");
  }
  if (
    parsed.envelope_version !== ENVELOPE_VERSION ||
    parsed.alg !== ALG ||
    parsed.canonical !== CANONICAL ||
    parsed.apiVersion !== API_VERSION
  ) {
    throw new CheckpointError("UNSUPPORTED_INTEGRITY", "checkpoint integrity envelope is not supported");
  }
  if (!isRecord(parsed.payload)) {
    throw new CheckpointError("CORRUPT", "checkpoint payload is not an object");
  }
  const key = resolveKey(options?.key);
  const expected = macHex(key, parsed.payload as unknown as EngineCheckpoint);
  if (!macsMatch(expected, parsed.mac)) {
    throw new CheckpointError("SIGNATURE_INVALID", "checkpoint MAC does not match the payload");
  }
  return assertPayload(parsed.payload, featureId, options);
}

export function clearCheckpoint(jobsDir: string, featureId: string): void {
  const path = checkpointPath(jobsDir, featureId);
  if (!existsSync(path)) return;
  refuseSymlink(path);
  unlinkSync(path);
}
