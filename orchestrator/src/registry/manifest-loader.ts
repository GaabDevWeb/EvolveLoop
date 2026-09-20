import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { CapabilityRegistry, ExecutionPolicy, ProviderManifest } from "../types/index.js";
import { buildRegistryFromManifests } from "../registry/registry-client.js";
import type { ProviderEntry } from "../types/index.js";

export function loadYamlFile<T>(path: string): T {
  const content = readFileSync(path, "utf-8");
  return parseYaml(content) as T;
}

export function manifestToRegistryEntries(manifest: ProviderManifest): Array<{ capability: string; provider: ProviderEntry }> {
  const entries: Array<{ capability: string; provider: ProviderEntry }> = [];

  for (const cap of manifest.spec.capabilities) {
    entries.push({
      capability: cap.id,
      provider: {
        id: manifest.metadata.name,
        manifest: manifest.metadata.name,
        priority: manifest.spec.priority ?? 100,
        cost: manifest.spec.runtime?.cost ?? "medium",
        quality_score: manifest.spec.telemetry?.key ? 0.85 : 0.75,
        availability: manifest.spec.availability ?? "active",
        version: manifest.metadata.version,
        contract: cap.contract,
        modes: cap.modes?.map((m) => m.name),
      },
    });
  }

  return entries;
}

export function buildRegistryFromManifestFiles(manifests: ProviderManifest[]): CapabilityRegistry {
  const allEntries = manifests.flatMap(manifestToRegistryEntries);
  return buildRegistryFromManifests(allEntries);
}

export function loadPolicy(path: string): ExecutionPolicy {
  return loadYamlFile<ExecutionPolicy>(path);
}

/** Load all ExecutionPolicy YAML files from a directory (overrides builtins by id). */
export function loadPoliciesFromDir(dir: string): ExecutionPolicy[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => loadPolicy(join(dir, f)));
}
