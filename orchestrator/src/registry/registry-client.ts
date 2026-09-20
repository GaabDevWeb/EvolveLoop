import type {
  CapabilityRegistry,
  Evidence,
  ExecuteResult,
  ProviderEntry,
  ProviderStrategy,
  ProviderManifest,
  SelectResult,
} from "../types/index.js";
import type { ContractRegistry } from "../contracts/contract-registry.js";
import { manifestToRegistryEntries } from "./manifest-loader.js";
import { buildSelectionEvidence, buildSelectionPayload } from "../evidence/builders.js";
import { newRunId } from "../ir/validator.js";

const COST_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };

export class RegistryClient {
  private registry: CapabilityRegistry;
  private runtimeStats = new Map<string, ProviderEntry["telemetry"]>();

  constructor(
    registry: CapabilityRegistry,
    private contracts?: ContractRegistry,
  ) {
    this.registry = registry;
    for (const cap of Object.values(registry.capabilities)) {
      for (const p of cap.providers) {
        this.runtimeStats.set(p.id, { ...p.telemetry });
      }
    }
  }

  getCapability(id: string) {
    return this.registry.capabilities[id];
  }

  /** Register a discovered provider at runtime */
  registerFromManifest(manifest: ProviderManifest): void {
    for (const { capability, provider } of manifestToRegistryEntries(manifest)) {
      if (!this.registry.capabilities[capability]) {
        this.registry.capabilities[capability] = { providers: [] };
      }
      const existing = this.registry.capabilities[capability].providers.find((p) => p.id === provider.id);
      if (!existing) {
        this.registry.capabilities[capability].providers.push(provider);
      }
    }
  }

  listProviders(capability: string): ProviderEntry[] {
    return this.registry.capabilities[capability]?.providers ?? [];
  }

  listCapabilityIds(): string[] {
    return Object.keys(this.registry.capabilities);
  }

  select(
    capability: string,
    strategy: ProviderStrategy,
    constraints?: Record<string, unknown>,
    options?: { capability_version?: string },
  ): ProviderEntry {
    return this.selectWithEvidence(capability, strategy, constraints, options).provider;
  }

  selectWithEvidence(
    capability: string,
    strategy: ProviderStrategy,
    constraints?: Record<string, unknown>,
    options?: { capability_version?: string },
  ): SelectResult {
    const allCandidates = this.listProviders(capability).filter((p) => p.availability !== "deprecated");
    let candidates = allCandidates.filter((p) => {
      if (strategy !== "experimental" && p.availability === "experimental") return false;
      if (!this.matchesConstraints(p, constraints)) return false;
      if (this.contracts && options?.capability_version && p.contract) {
        const check = this.contracts.isCompatible(options.capability_version, p.contract);
        if (!check.compatible) return false;
      }
      return true;
    });

    const rejected: Array<{ id: string; reason: string }> = allCandidates
      .filter((p) => !candidates.includes(p))
      .map((p) => ({
        id: p.id,
        reason: strategy !== "experimental" && p.availability === "experimental"
          ? "experimental_excluded"
          : "constraints_or_contract_mismatch",
      }));

    if (candidates.length === 0) {
      throw new Error(`No provider for capability: ${capability}`);
    }

    const ranked = this.rank(candidates, strategy, constraints);
    const selected = this.withUpdatedStats(ranked[0]);
    const runId = newRunId();
    const payload = buildSelectionPayload(
      capability,
      ranked,
      selected,
      strategy,
      this.matchesConstraints(selected, constraints),
    );

    return {
      provider: selected,
      evidence: buildSelectionEvidence(capability, runId, payload),
      rejected,
    };
  }

  private matchesConstraints(provider: ProviderEntry, constraints?: Record<string, unknown>): boolean {
    if (!constraints) return true;

    const excluded = constraints.exclude_providers;
    if (Array.isArray(excluded) && excluded.includes(provider.id)) {
      return false;
    }

    if (!constraints.stack || !provider.constraints?.stack) {
      // prefer_provider is advisory for ranking, not a hard filter here
      return true;
    }
    const required = constraints.stack as string[];
    const available = provider.constraints.stack as string[];
    return required.every((s) => available.includes(s));
  }

  private rank(candidates: ProviderEntry[], strategy: ProviderStrategy, constraints?: Record<string, unknown>): ProviderEntry[] {
    let enriched = candidates.map((p) => this.withUpdatedStats(p));

    const prefer = constraints?.prefer_provider;
    if (typeof prefer === "string") {
      const preferred = enriched.filter((p) => p.id === prefer);
      if (preferred.length > 0) enriched = preferred;
    }

    switch (strategy) {
      case "highest_quality":
        return [...enriched].sort(
          (a, b) => b.quality_score - a.quality_score || (b.telemetry?.success_rate ?? 0) - (a.telemetry?.success_rate ?? 0),
        );
      case "fastest":
        return [...enriched].sort(
          (a, b) =>
            (a.telemetry?.average_duration_ms ?? Infinity) - (b.telemetry?.average_duration_ms ?? Infinity),
        );
      case "cheapest":
        return [...enriched].sort(
          (a, b) =>
            (COST_ORDER[a.cost] ?? 1) - (COST_ORDER[b.cost] ?? 1) || b.priority - a.priority,
        );
      case "experimental": {
        const exp = enriched.filter((p) => p.availability === "experimental");
        return exp.length > 0 ? exp : this.rank(enriched, "stable");
      }
      case "priority":
        return [...enriched].sort((a, b) => b.priority - a.priority);
      case "stable":
      default:
        return [...enriched].sort(
          (a, b) =>
            (b.telemetry?.success_rate ?? 0.5) * b.quality_score -
            (a.telemetry?.success_rate ?? 0.5) * a.quality_score ||
            b.priority - a.priority,
        );
    }
  }

  recordSuccess(providerId: string, run: ExecuteResult): void {
    const stats = this.getOrCreateStats(providerId);
    stats.total_runs = (stats.total_runs ?? 0) + 1;
    const prevRate = stats.success_rate ?? 1;
    const n = stats.total_runs;
    stats.success_rate = (prevRate * (n - 1) + 1) / n;
    stats.last_success = new Date().toISOString();
    stats.rework_rate = Math.max(0, (stats.rework_rate ?? 0) - 0.02);
    if (run.duration_ms) {
      const prevAvg = stats.average_duration_ms ?? run.duration_ms;
      stats.average_duration_ms = (prevAvg * (n - 1) + run.duration_ms) / n;
    }
    this.updateProviderQualityScore(providerId);
  }

  recordFailure(providerId: string, _run: ExecuteResult): void {
    const stats = this.getOrCreateStats(providerId);
    stats.total_runs = (stats.total_runs ?? 0) + 1;
    const n = stats.total_runs;
    const prevRate = stats.success_rate ?? 1;
    stats.success_rate = (prevRate * (n - 1)) / n;
    stats.last_failure = new Date().toISOString();
    stats.rework_rate = Math.min(1, (stats.rework_rate ?? 0) + 0.1);
    this.updateProviderQualityScore(providerId);
  }

  private updateProviderQualityScore(providerId: string): void {
    const stats = this.runtimeStats.get(providerId);
    if (!stats) return;
    const successRate = stats.success_rate ?? 0.5;
    const reworkRate = stats.rework_rate ?? 0;
    const qualityScore = successRate * (1 - reworkRate);
    for (const cap of Object.values(this.registry.capabilities)) {
      const provider = cap.providers.find((p) => p.id === providerId);
      if (provider) {
        provider.quality_score = Math.round(qualityScore * 1000) / 1000;
        if (stats.total_runs) provider.telemetry = { ...provider.telemetry, ...stats };
      }
    }
  }

  private getOrCreateStats(providerId: string) {
    if (!this.runtimeStats.has(providerId)) {
      this.runtimeStats.set(providerId, { total_runs: 0, success_rate: 1 });
    }
    return this.runtimeStats.get(providerId)!;
  }

  private withUpdatedStats(provider: ProviderEntry): ProviderEntry {
    const stats = this.runtimeStats.get(provider.id);
    return stats ? { ...provider, telemetry: { ...provider.telemetry, ...stats } } : provider;
  }
}

export function buildRegistryFromManifests(
  entries: Array<{ capability: string; provider: ProviderEntry }>,
): CapabilityRegistry {
  const capabilities: CapabilityRegistry["capabilities"] = {};

  for (const { capability, provider } of entries) {
    if (!capabilities[capability]) {
      capabilities[capability] = { providers: [] };
    }
    capabilities[capability].providers.push(provider);
  }

  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityRegistry",
    metadata: { generated_at: new Date().toISOString(), generator: "buildRegistryFromManifests" },
    capabilities,
  };
}
