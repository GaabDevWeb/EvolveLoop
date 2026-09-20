/**
 * Provider bootstrap — discover → validate → register → expose.
 *
 * V2: real mode never silently falls back to MockProvider.
 * Mock mode is explicit (tests / fixtures / controlled evals).
 *
 * Fallback strategy (provider_strategy_fallback / manifest.fallbacks) is NOT
 * implemented here — reserved seam for GAP-B01 (see select failure path).
 */

import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  CapabilityIR,
  CapabilityRegistry,
  ProviderEntry,
  ProviderManifest,
} from "../types/index.js";
import type { AuthorityContext } from "../authority/capability-authority.js";
import { loadYamlFile, buildRegistryFromManifestFiles } from "../registry/manifest-loader.js";
import { PluginLoader, type PluginType } from "../plugins/plugin-loader.js";
import { JobFileExecutor } from "../plugins/cursor-skill-provider.js";
import {
  AutonomousSkillExecutor,
  canExecuteAutonomously,
} from "../plugins/autonomous-skill-executor.js";
import { ProviderRouter, createMockProvider } from "./mock-provider.js";
import type { SkillExecutor } from "../plugins/cursor-skill-provider.js";

/** Explicit execution provider mode — never inferred silently. */
export type ProviderMode = "mock" | "real";

export interface ProviderRegistration {
  id: string;
  plugin_type: PluginType | "synthetic-mock";
  provider_mode: ProviderMode;
}

export interface UnavailableProvider {
  id: string;
  code: "PROVIDER_UNAVAILABLE";
  reason: string;
}

export interface ProviderBootstrapOptions {
  mode: ProviderMode;
  manifests: ProviderManifest[];
  /** Base registry (usually from manifests). Mutated copy returned filtered in real mode. */
  registry: CapabilityRegistry;
  workspaceRoot: string;
  jobsDir?: string;
  authority?: AuthorityContext;
  /**
   * When mode=mock only: invent active providers for IR capabilities missing entries
   * (legacy CLI mock-run behaviour).
   */
  ir?: CapabilityIR;
  /**
   * cursor-skill execution path (orthogonal to provider-mode).
   * - external: JobFileExecutor (requires jobsDir)
   * - autonomous: AutonomousSkillExecutor (declared handlers only)
   */
  skillExecutor?: "external" | "autonomous";
  /** Directory containing provider.yaml folders (for autonomous module resolution). */
  providersDir?: string;
}

export interface ProviderBootstrapResult {
  router: ProviderRouter;
  registry: CapabilityRegistry;
  mode: ProviderMode;
  registered: ProviderRegistration[];
  unavailable: UnavailableProvider[];
}

export function loadProviderManifests(providersDir: string): ProviderManifest[] {
  const manifests: ProviderManifest[] = [];
  for (const name of readdirSync(providersDir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const path = join(providersDir, name.name, "provider.yaml");
    try {
      manifests.push(loadYamlFile<ProviderManifest>(path));
    } catch {
      /* skip dirs without provider.yaml */
    }
  }
  return manifests;
}

function collectProviderIds(registry: CapabilityRegistry): Set<string> {
  const ids = new Set<string>();
  for (const cap of Object.values(registry.capabilities)) {
    for (const p of cap.providers) ids.add(p.id);
  }
  return ids;
}

function syntheticProvider(id: string): ProviderEntry {
  return {
    id,
    priority: 100,
    cost: "medium",
    quality_score: 0.85,
    availability: "active",
    version: "1.0.0",
  };
}

/** Legacy mock-run registry padding — mock mode only. */
export function padRegistryForMock(
  registry: CapabilityRegistry,
  ir?: CapabilityIR,
): CapabilityRegistry {
  const capabilities = { ...registry.capabilities };

  if (ir) {
    for (const cap of new Set(ir.spec.nodes.map((n) => n.capability))) {
      if (!capabilities[cap]) {
        capabilities[cap] = { providers: [syntheticProvider(cap)] };
      }
    }
  }

  for (const [capId, cap] of Object.entries(capabilities)) {
    const hasActive = cap.providers.some(
      (p) => p.availability !== "experimental" && p.availability !== "deprecated",
    );
    if (!hasActive) {
      capabilities[capId] = { providers: [syntheticProvider(capId)] };
    }
  }

  return { ...registry, capabilities };
}

/**
 * Remove provider ids from registry that failed to load (real mode honesty).
 */
function filterRegistryProviders(
  registry: CapabilityRegistry,
  availableIds: Set<string>,
): CapabilityRegistry {
  const capabilities: CapabilityRegistry["capabilities"] = {};
  for (const [capId, cap] of Object.entries(registry.capabilities)) {
    capabilities[capId] = {
      providers: cap.providers.filter((p) => availableIds.has(p.id)),
    };
  }
  return { ...registry, capabilities };
}

export function bootstrapProviders(options: ProviderBootstrapOptions): ProviderBootstrapResult {
  const {
    mode,
    manifests,
    workspaceRoot,
    jobsDir,
    authority,
    ir,
    skillExecutor = "external",
    providersDir,
  } = options;

  let registry = options.registry;
  const router = new ProviderRouter();
  const registered: ProviderRegistration[] = [];
  const unavailable: UnavailableProvider[] = [];
  const manifestByName = new Map(manifests.map((m) => [m.metadata.name, m]));

  if (mode === "mock") {
    registry = padRegistryForMock(registry, ir);
    const ids = collectProviderIds(registry);
    for (const id of ids) {
      router.register(createMockProvider(id));
      registered.push({ id, plugin_type: "synthetic-mock", provider_mode: "mock" });
    }
    return { router, registry, mode, registered, unavailable };
  }

  // ——— real mode ———
  const loader = new PluginLoader(workspaceRoot, { authorityContext: authority });
  const externalExecutor = jobsDir ? new JobFileExecutor(resolve(jobsDir)) : undefined;
  const autonomousExecutor = new AutonomousSkillExecutor({
    workspaceRoot,
    resolveProviderDir: (manifest) => {
      if (providersDir) return join(providersDir, manifest.metadata.name);
      return join(workspaceRoot, "orchestrator", "providers", manifest.metadata.name);
    },
  });
  const ids = collectProviderIds(registry);
  const availableIds = new Set<string>();

  for (const id of ids) {
    const manifest = manifestByName.get(id);
    if (!manifest) {
      unavailable.push({
        id,
        code: "PROVIDER_UNAVAILABLE",
        reason: `No provider.yaml manifest for registry provider id "${id}" — refusing silent mock`,
      });
      continue;
    }

    const pluginType = manifest.spec.plugin?.type as PluginType | undefined;

    if (pluginType === "mock") {
      router.register(loader.load(manifest));
      registered.push({ id, plugin_type: "mock", provider_mode: "real" });
      availableIds.add(id);
      continue;
    }

    if (pluginType === "cursor-skill") {
      let executor: SkillExecutor | undefined;

      if (skillExecutor === "autonomous") {
        const providerFolder = providersDir
          ? join(providersDir, manifest.metadata.name)
          : join(workspaceRoot, "orchestrator", "providers", manifest.metadata.name);
        const can = canExecuteAutonomously(manifest, providerFolder);
        if (!can.ok) {
          unavailable.push({
            id,
            code: "PROVIDER_UNAVAILABLE",
            reason: `EXECUTOR_UNAVAILABLE: ${can.reason}`,
          });
          continue;
        }
        executor = autonomousExecutor;
      } else {
        if (!externalExecutor) {
          unavailable.push({
            id,
            code: "PROVIDER_UNAVAILABLE",
            reason: `cursor-skill provider "${id}" requires --jobs-dir for external executor (or --skill-executor autonomous)`,
          });
          continue;
        }
        executor = externalExecutor;
      }

      try {
        router.register(loader.load(manifest, executor));
        registered.push({ id, plugin_type: "cursor-skill", provider_mode: "real" });
        availableIds.add(id);
      } catch (err) {
        unavailable.push({
          id,
          code: "PROVIDER_UNAVAILABLE",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    if (pluginType === "deterministic" || pluginType === "shell") {
      try {
        router.register(loader.load(manifest));
        registered.push({
          id,
          plugin_type: pluginType,
          provider_mode: "real",
        });
        availableIds.add(id);
      } catch (err) {
        unavailable.push({
          id,
          code: "PROVIDER_UNAVAILABLE",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    unavailable.push({
      id,
      code: "PROVIDER_UNAVAILABLE",
      reason: `Unsupported or missing plugin type for "${id}" (got ${pluginType ?? "undefined"})`,
    });
  }

  registry = filterRegistryProviders(registry, availableIds);

  // GAP-B01 seam: on select failure, future code should try provider_strategy_fallback
  // / manifest.fallbacks BEFORE marking PROVIDER_UNAVAILABLE — do not mock here.

  return { router, registry, mode, registered, unavailable };
}

export function buildRegistryFromProvidersDir(providersDir: string): {
  manifests: ProviderManifest[];
  registry: CapabilityRegistry;
} {
  const manifests = loadProviderManifests(providersDir);
  const registry = buildRegistryFromManifestFiles(manifests);
  return { manifests, registry };
}
