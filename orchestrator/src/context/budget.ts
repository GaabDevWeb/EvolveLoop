import type {
  ContextBudgetApplyResult,
  ContextBudgetLimits,
  ContextBudgetTelemetry,
  ContextOwnerId,
  ContextSlice,
  ContextSliceKind,
} from "./types.js";
import { condenseExtractive } from "./extractive-condenser.js";
import { countTokens } from "./tokenizer.js";
import { isExtractiveCompactionEnabled } from "../v22/feature-flags.js";

const PROTECTED_KINDS: Set<ContextSliceKind> = new Set([
  "acceptance_criteria",
  "security_restriction",
  "evidence",
  "gate_bundle",
]);

const DEFAULT_LIMITS: ContextBudgetLimits = {
  max_paths: 15,
  max_pages: 5,
  max_tokens: 128_000,
};

function isPagePath(path: string): boolean {
  return path.includes(".ai/") && path.endsWith(".md");
}

function sortByPriorityAsc(slices: ContextSlice[]): ContextSlice[] {
  return [...slices].sort((a, b) => a.priority - b.priority);
}

export interface ApplyContextBudgetOptions {
  ownerId: ContextOwnerId;
  limits?: ContextBudgetLimits;
  /** Paths already in evidence — skip re-read (dedup). */
  evidence_paths?: string[];
}

/**
 * Apply retrieval budget: drop whole files/pages first; never truncate protected slices mid-content.
 */
export function applyContextBudget(
  slices: ContextSlice[],
  options: ApplyContextBudgetOptions,
): ContextBudgetApplyResult {
  const limits: ContextBudgetLimits = { ...DEFAULT_LIMITS, ...options.limits };
  const seenPaths = new Set<string>();
  let redundant_paths_skipped = 0;

  const deduped: ContextSlice[] = [];
  for (const s of slices) {
    if (options.evidence_paths?.includes(s.path)) {
      redundant_paths_skipped += 1;
      continue;
    }
    if (seenPaths.has(s.path)) {
      redundant_paths_skipped += 1;
      continue;
    }
    seenPaths.add(s.path);
    deduped.push(s);
  }

  const protectedSlices = deduped.filter((s) => PROTECTED_KINDS.has(s.kind));
  const droppable = deduped.filter((s) => !PROTECTED_KINDS.has(s.kind));

  const maxPaths = limits.max_paths ?? DEFAULT_LIMITS.max_paths!;
  const maxPages = limits.max_pages ?? DEFAULT_LIMITS.max_pages!;

  const kept: ContextSlice[] = [...protectedSlices];
  const pathSet = () => new Set(kept.map((s) => s.path));
  const pageCount = () => kept.filter((s) => isPagePath(s.path)).length;

  for (const s of sortByPriorityAsc(droppable).reverse()) {
    const paths = pathSet();
    const newPath = !paths.has(s.path);
    if (newPath && paths.size >= maxPaths) continue;
    if (newPath && isPagePath(s.path) && pageCount() >= maxPages) continue;
    kept.push(s);
  }

  const dropped = deduped.filter((s) => !kept.includes(s));

  let context_text = kept.map((s) => `--- path:${s.path} ---\n${s.content}`).join("\n");
  let { tokens: tokens_measured, tokenizer } = countTokens(context_text);
  const maxTokens = limits.max_tokens ?? DEFAULT_LIMITS.max_tokens!;
  let overflow = tokens_measured > maxTokens;

  if (overflow && maxTokens > 0) {
    const shrinkOrder = sortByPriorityAsc(kept.filter((s) => !PROTECTED_KINDS.has(s.kind)));
    for (const remove of shrinkOrder) {
      if (tokens_measured <= maxTokens) break;
      const idx = kept.indexOf(remove);
      if (idx === -1) continue;
      kept.splice(idx, 1);
      dropped.push(remove);
      context_text = kept.map((s) => `--- path:${s.path} ---\n${s.content}`).join("\n");
      const m = countTokens(context_text);
      tokens_measured = m.tokens;
      tokenizer = m.tokenizer;
    }
    overflow = tokens_measured > maxTokens;
  }

  if (isExtractiveCompactionEnabled()) {
    let changed = false;
    for (let index = 0; index < kept.length; index += 1) {
      const slice = kept[index];
      if (!slice || PROTECTED_KINDS.has(slice.kind)) continue;
      const condensed = condenseExtractive({ text: slice.content, mustKeep: [] }, true).after_text;
      if (condensed !== slice.content) {
        kept[index] = { ...slice, content: condensed };
        changed = true;
      }
    }
    if (changed) {
      context_text = kept.map((s) => `--- path:${s.path} ---\n${s.content}`).join("\n");
      const measured = countTokens(context_text);
      tokens_measured = measured.tokens;
      tokenizer = measured.tokenizer;
      overflow = tokens_measured > maxTokens;
    }
  }

  const paths_read = [...new Set(kept.map((s) => s.path))];
  const pages_read = paths_read.filter(isPagePath).length;

  const telemetry: ContextBudgetTelemetry = {
    context_owner_id: options.ownerId,
    tokenizer,
    tokens_measured,
    paths_read,
    pages_read,
    slices_kept: kept.length,
    slices_dropped: dropped.length,
    redundant_paths_skipped,
    budget_limits: limits,
    overflow,
    protected_slices_preserved: protectedSlices.length,
    timestamp: new Date().toISOString(),
  };

  return { kept, dropped, paths_read, context_text, telemetry };
}

export function sliceFromFile(
  path: string,
  content: string,
  kind: ContextSliceKind = "generic",
  priority = 10,
): ContextSlice {
  return { path, content, kind, priority };
}
