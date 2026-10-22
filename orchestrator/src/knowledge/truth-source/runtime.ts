import type { EvidenceSet, KnowledgeHit } from "../../capabilities/results.js";
import { applyTruthFence, codeOverridesWiki } from "./fence.js";
import {
  detectCrossProjectLeakage,
  filterItemsToProjectScope,
  projectScopeId,
  serializeInjectionBundle,
} from "./isolation.js";
import { isProvenanceComplete } from "./provenance.js";
import type { TruthFenceResult, TruthSourcedItem, TruthSourceTier } from "./types.js";

export interface ProjectKnowledgeRuntimeOptions {
  projectRoot: string;
  dataDir?: string;
}

function hitToItem(hit: KnowledgeHit, tier: TruthSourceTier, topicKey: string): TruthSourcedItem {
  return {
    topic_key: topicKey,
    tier,
    provenance: {
      source_ref: hit.source?.trim() || "",
      content_hash: hit.chunk_id,
    },
    excerpt: hit.excerpt,
    ai_status: tier === "ai" ? "atual" : undefined,
  };
}

export class ProjectKnowledgeRuntime {
  readonly projectRoot: string;
  readonly scopeId: string;
  readonly dataDir?: string;
  private items: TruthSourcedItem[] = [];

  constructor(options: ProjectKnowledgeRuntimeOptions) {
    this.projectRoot = options.projectRoot;
    this.scopeId = projectScopeId(options.projectRoot);
    this.dataDir = options.dataDir;
  }

  clear(): void {
    this.items = [];
  }

  ingestRaw(items: TruthSourcedItem[]): void {
    this.items.push(...items);
  }

  ingestCode(hit: KnowledgeHit, topicKey: string): void {
    this.items.push(hitToItem(hit, "code", topicKey));
  }

  ingestAiPage(hit: KnowledgeHit, topicKey: string, status: TruthSourcedItem["ai_status"] = "atual"): void {
    this.items.push({ ...hitToItem(hit, "ai", topicKey), ai_status: status });
  }

  ingestVaultHits(set: EvidenceSet, topicPrefix = "vault"): void {
    for (const [i, hit] of set.hits.entries()) {
      this.items.push(hitToItem(hit, "vault", `${topicPrefix}:${i}:${hit.source}`));
    }
  }

  applyFence(): TruthFenceResult {
    const scoped = filterItemsToProjectScope(this.items, this.projectRoot);
    const code = scoped.filter((i) => i.tier === "code");
    const ai = scoped.filter((i) => i.tier === "ai");
    const rest = scoped.filter((i) => i.tier !== "code" && i.tier !== "ai");
    const demotedWiki = codeOverridesWiki(code, ai);
    const merged = [...code, ...rest, ...demotedWiki.filter((w) => !w.superseded)];
    return applyTruthFence(merged);
  }

  buildInjectionBundle(): string {
    const { accepted } = this.applyFence();
    return serializeInjectionBundle(accepted);
  }

  assertNoForeignCanary(foreignCanary: string, foreignRuntimeBundle: string): boolean {
    const report = detectCrossProjectLeakage(foreignCanary, foreignRuntimeBundle);
    return report.ok;
  }
}

/** Map wiki EvidenceSet hits into fenced, provenance-checked items (vault tier). */
export function fenceEvidenceSet(
  set: EvidenceSet,
  projectRoot: string,
): { fenced: TruthFenceResult; evidence: EvidenceSet } {
  const runtime = new ProjectKnowledgeRuntime({ projectRoot });
  runtime.ingestVaultHits(set);
  const fenced = runtime.applyFence();
  const hits: KnowledgeHit[] = fenced.accepted.map((item) => ({
    source: item.provenance.source_ref,
    excerpt: item.excerpt,
    chunk_id: item.provenance.content_hash,
    retrieval_method: `${set.retrieval_method}:truth_fence`,
    degraded: item.tier === "inferred" ? "inferred_hint" : undefined,
  }));
  const rejected = fenced.rejected.filter((r) => r.rejection_reason === "missing_provenance");
  return {
    fenced,
    evidence: {
      ...set,
      hits,
      degraded:
        rejected.length > 0
          ? `truth_fence_rejected:${rejected.length}`
          : (set.degraded ?? null),
    },
  };
}

export function assertEveryHitHasProvenance(set: EvidenceSet): boolean {
  return set.hits.every((h) => isProvenanceComplete({ source_ref: h.source ?? "" }));
}
