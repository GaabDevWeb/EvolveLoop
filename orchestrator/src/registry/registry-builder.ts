import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { EventEnvelope, ProviderManifest } from "../types/index.js";
import { manifestToRegistryEntries } from "./manifest-loader.js";
import { buildRegistryFromManifests } from "./registry-client.js";
import type { CapabilityRegistry, ProviderEntry } from "../types/index.js";
import { contractRefId, contractRefVersion } from "../contracts/semver.js";

export interface ProviderTelemetryStats {
  total_runs: number;
  success_rate: number;
  average_duration_ms: number;
  last_success?: string;
  last_failure?: string;
  rework_rate: number;
}

export interface RegistryBuilderOptions {
  manifests: ProviderManifest[];
  telemetryEventsDir?: string;
  generator?: string;
}

function emptyStats(): ProviderTelemetryStats {
  return { total_runs: 0, success_rate: 1, average_duration_ms: 0, rework_rate: 0 };
}

function loadEventsFromDir(dir: string): EventEnvelope[] {
  if (!existsSync(dir)) return [];
  const events: EventEnvelope[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".jsonl")) continue;
    const lines = readFileSync(join(dir, file), "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        events.push(JSON.parse(line) as EventEnvelope);
      } catch {
        // skip malformed lines
      }
    }
  }
  return events;
}

export function aggregateProviderStats(events: EventEnvelope[]): Map<string, ProviderTelemetryStats> {
  const stats = new Map<string, ProviderTelemetryStats>();
  const durations = new Map<string, number[]>();
  const retries = new Map<string, number>();

  const get = (id: string) => {
    if (!stats.has(id)) stats.set(id, emptyStats());
    return stats.get(id)!;
  };

  for (const event of events) {
    const providerId = event.payload.provider_id as string | undefined;
    if (!providerId) continue;

    const s = get(providerId);

    if (event.type === "NodeCompleted") {
      s.total_runs++;
      s.last_success = event.timestamp;
      const dur = event.payload.duration_ms as number | undefined;
      if (dur !== undefined) {
        if (!durations.has(providerId)) durations.set(providerId, []);
        durations.get(providerId)!.push(dur);
      }
    }

    if (event.type === "NodeFailed") {
      s.total_runs++;
      s.last_failure = event.timestamp;
    }

    if (event.type === "RetryScheduled") {
      retries.set(providerId, (retries.get(providerId) ?? 0) + 1);
    }
  }

  for (const [id, s] of stats) {
    const completed = events.filter(
      (e) => e.type === "NodeCompleted" && e.payload.provider_id === id,
    ).length;
    const failed = events.filter(
      (e) => e.type === "NodeFailed" && e.payload.provider_id === id,
    ).length;
    const total = completed + failed;
    s.success_rate = total > 0 ? completed / total : 1;
    s.rework_rate = s.total_runs > 0 ? (retries.get(id) ?? 0) / s.total_runs : 0;
    const durs = durations.get(id) ?? [];
    s.average_duration_ms = durs.length > 0 ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
  }

  return stats;
}

function applyTelemetry(providers: ProviderEntry[], stats: Map<string, ProviderTelemetryStats>): ProviderEntry[] {
  return providers.map((p) => {
    const t = stats.get(p.id);
    if (!t || t.total_runs === 0) return p;
    return {
      ...p,
      quality_score: computeQualityScore(t, p.quality_score),
      telemetry: { ...p.telemetry, ...t },
    };
  });
}

function computeQualityScore(t: ProviderTelemetryStats, base: number): number {
  const score =
    0.4 * t.success_rate +
    0.25 * (1 - t.rework_rate) +
    0.2 * 0.9 +
    0.1 * t.success_rate +
    0.05 * 0.5;
  return Math.round(Math.min(1, Math.max(base * 0.5, score)) * 100) / 100;
}

export function buildRegistry(options: RegistryBuilderOptions): CapabilityRegistry {
  const entries = options.manifests.flatMap(manifestToRegistryEntries);
  let registry = buildRegistryFromManifests(entries);

  const stats = options.telemetryEventsDir
    ? aggregateProviderStats(loadEventsFromDir(options.telemetryEventsDir))
    : new Map<string, ProviderTelemetryStats>();

  const capabilities: CapabilityRegistry["capabilities"] = {};

  for (const [capId, cap] of Object.entries(registry.capabilities)) {
    const contractRef = cap.providers.find((p) => p.contract)?.contract;
    const schemaVersion = contractRef ?? undefined;
    capabilities[capId] = {
      schema_version: schemaVersion,
      providers: applyTelemetry(cap.providers, stats),
    };
  }

  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityRegistry",
    metadata: {
      generated_at: new Date().toISOString(),
      generator: options.generator ?? "registry-builder/1.0.0",
    },
    capabilities,
  };
}

export function schemaVersionFromContract(ref: string): string {
  const id = contractRefId(ref);
  const version = contractRefVersion(ref);
  return version ? `contracts/${id}@${version}` : ref;
}
