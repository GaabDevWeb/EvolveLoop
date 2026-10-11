import type { MemoryEntry } from "../types/index.js";

export interface FeatureMemoryMeta {
  ir_id: string;
  policy: string;
  started_at?: string;
  user_request?: string;
}

interface FeatureMemory {
  meta?: FeatureMemoryMeta;
  entries: MemoryEntry[];
}

function isPreference(entry: MemoryEntry): boolean {
  return entry.type === "preference" || entry.type === "rejection_feedback";
}

function isDecision(entry: MemoryEntry): boolean {
  return entry.type === "decision";
}

/**
 * In-memory contextual store scoped per feature (V2 API).
 * Append-only entries; preferences vs decisions filtered by `type`.
 */
export class MemoryStore {
  protected features = new Map<string, FeatureMemory>();

  constructor() {}

  initFeature(featureId: string, meta: { ir_id: string; policy: string }): void {
    const existing = this.features.get(featureId);
    this.features.set(featureId, {
      meta: {
        ir_id: meta.ir_id,
        policy: meta.policy,
        started_at: existing?.meta?.started_at ?? new Date().toISOString(),
        user_request: existing?.meta?.user_request,
      },
      entries: existing?.entries ?? [],
    });
  }

  append(featureId: string, entry: MemoryEntry): void {
    let feat = this.features.get(featureId);
    if (!feat) {
      feat = { entries: [] };
      this.features.set(featureId, feat);
    }
    feat.entries.push({ ...entry });
  }

  getPreferences(featureId: string): MemoryEntry[] {
    const feat = this.features.get(featureId);
    if (!feat) return [];
    return feat.entries.filter(isPreference).map((e) => ({ ...e }));
  }

  getDecisions(featureId: string): MemoryEntry[] {
    const feat = this.features.get(featureId);
    if (!feat) return [];
    return feat.entries.filter(isDecision).map((e) => ({ ...e }));
  }

  /** Hydrate a feature scope (used by filesystem reload). */
  protected hydrateFeature(
    featureId: string,
    meta: FeatureMemoryMeta | undefined,
    entries: MemoryEntry[],
  ): void {
    this.features.set(featureId, {
      meta,
      entries: entries.map((e) => ({ ...e })),
    });
  }

  protected getFeatureMeta(featureId: string): FeatureMemoryMeta | undefined {
    return this.features.get(featureId)?.meta;
  }

  protected getAllEntries(featureId: string): MemoryEntry[] {
    return this.features.get(featureId)?.entries ?? [];
  }
}
