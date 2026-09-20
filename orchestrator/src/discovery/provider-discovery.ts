import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadYamlFile, manifestToRegistryEntries } from "../registry/manifest-loader.js";
import type { ProviderManifest } from "../types/index.js";

export interface DiscoveryOptions {
  /** Root containing `.cursor/skills/` or skills dir directly */
  agentsRoot: string;
  /** Also scan orchestrator bundled providers */
  orchestratorProvidersDir?: string;
}

function scanProviderYaml(dir: string): ProviderManifest[] {
  const found: ProviderManifest[] = [];
  if (!existsSync(dir)) return found;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(dir, entry.name, "provider.yaml");
    if (!existsSync(manifestPath)) {
      const skillPath = join(dir, entry.name, "SKILL.md");
      if (existsSync(skillPath)) continue;
    }
    try {
      if (existsSync(manifestPath)) {
        found.push(loadYamlFile<ProviderManifest>(manifestPath));
      }
    } catch {
      // skip invalid manifests
    }
  }
  return found;
}

/** Scan skills + orchestrator provider dirs for all manifests */
export function discoverAllManifests(options: DiscoveryOptions): ProviderManifest[] {
  const skillsDir = existsSync(join(options.agentsRoot, ".cursor", "skills"))
    ? join(options.agentsRoot, ".cursor", "skills")
    : join(options.agentsRoot, "skills");

  const manifests = scanProviderYaml(skillsDir);
  if (options.orchestratorProvidersDir) {
    manifests.push(...scanProviderYaml(options.orchestratorProvidersDir));
  }
  return dedupeByName(manifests);
}

/** Find first manifest implementing a capability */
export function discoverManifestForCapability(
  capability: string,
  options: DiscoveryOptions,
): ProviderManifest | null {
  for (const manifest of discoverAllManifests(options)) {
    if (manifest.spec.capabilities.some((c) => c.id === capability)) {
      return manifest;
    }
  }
  return null;
}

/** Infer provider.yaml from SKILL.md when sidecar missing */
export function inferManifestFromSkill(skillDir: string, capability: string): ProviderManifest | null {
  const skillPath = join(skillDir, "SKILL.md");
  if (!existsSync(skillPath)) return null;

  const content = readFileSync(skillPath, "utf-8");
  const nameMatch = content.match(/^name:\s*(\S+)/m);
  const name = nameMatch?.[1] ?? capability;

  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "Provider",
    metadata: { name, version: "0.0.0-inferred", description: "Inferred from SKILL.md" },
    spec: {
      plugin: { type: "cursor-skill", entrypoint: join(skillDir, "SKILL.md").replace(/\\/g, "/") },
      capabilities: [{ id: capability, type: "worker" }],
      availability: "experimental",
      priority: 50,
    },
  };
}

function dedupeByName(manifests: ProviderManifest[]): ProviderManifest[] {
  const byName = new Map<string, ProviderManifest>();
  for (const m of manifests) byName.set(m.metadata.name, m);
  return [...byName.values()];
}

export function manifestEntries(manifest: ProviderManifest) {
  return manifestToRegistryEntries(manifest);
}
