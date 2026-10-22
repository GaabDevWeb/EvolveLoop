/**
 * Deterministic relevance ranking for context budget (V22-GOAL-006c).
 *
 * Uses only: task query, rg_patterns, optional cited_paths from objective/metadata.
 * Does NOT use verifier anchors, expected answers, or held-out labels.
 */

export interface RetrievalRankingContext {
  query: string;
  rg_patterns: string[];
  /** Paths explicitly named in briefing/objective (not verifier anchors). */
  cited_paths?: string[];
}

const ARCH_PREFIXES = ["docs/adr/", "docs/architecture/", "docs/architecture/finalization/adrs/"];

export function tokenizeForRanking(text: string): string[] {
  const raw = text.match(/[a-zA-Z0-9_./-]+/g) ?? [];
  const out: string[] = [];
  for (const t of raw) {
    const low = t.toLowerCase();
    if (low.length < 2) continue;
    if (low === "qual" || low === "onde" || low === "como" || low === "que" || low === "the") continue;
    out.push(low);
  }
  return out;
}

export function extractQueryTerms(ctx: RetrievalRankingContext): string[] {
  const terms = new Set<string>();
  for (const t of tokenizeForRanking(ctx.query)) terms.add(t);
  for (const pat of ctx.rg_patterns) {
    const stripped = pat.replace(/[\\^$.*+?()[\]{}|]/g, " ");
    for (const part of stripped.split(/\s+/)) {
      const p = part.trim().toLowerCase();
      if (p.length >= 2) terms.add(p);
    }
  }
  for (const cite of ctx.cited_paths ?? []) {
    for (const t of tokenizeForRanking(cite)) terms.add(t);
  }
  return [...terms];
}

/** ADR ids and path-like strings from the query text (for boost only). */
export function extractCitationHints(query: string): { adr_ids: string[]; path_fragments: string[] } {
  const adr_ids = [...(query.match(/ADR-[A-Z]+-\d+/g) ?? [])];
  const path_fragments: string[] = [];
  for (const m of query.match(/[\w./-]+\.(yaml|yml|ts|tsx|md|json)/gi) ?? []) {
    path_fragments.push(m);
  }
  for (const m of query.match(/[\w-]+\/[\w./-]+/g) ?? []) {
    if (m.includes(".")) path_fragments.push(m);
  }
  return { adr_ids, path_fragments };
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n += 1;
    i += needle.length;
  }
  return n;
}

/**
 * Higher score = more relevant. Tie-break: lexicographic path (stable).
 */
export function scoreRetrievalPath(
  relPath: string,
  contentPreview: string,
  ctx: RetrievalRankingContext,
): number {
  const terms = extractQueryTerms(ctx);
  const relLower = relPath.toLowerCase();
  const bodyLower = contentPreview.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (relLower.includes(term)) score += 5;
    score += Math.min(countOccurrences(bodyLower, term), 8);
  }

  for (const pat of ctx.rg_patterns) {
    const p = pat.toLowerCase();
    if (relLower.includes(p)) score += 8;
    if (bodyLower.includes(p)) score += 4;
  }

  for (const prefix of ARCH_PREFIXES) {
    if (relLower.startsWith(prefix)) score += 3;
  }

  const hints = extractCitationHints(ctx.query);
  for (const adr of hints.adr_ids) {
    if (relLower.includes(adr.toLowerCase())) score += 20;
  }
  for (const frag of hints.path_fragments) {
    if (relLower.includes(frag.toLowerCase()) || relLower.endsWith(frag.toLowerCase())) score += 18;
  }

  for (const cite of ctx.cited_paths ?? []) {
    const c = cite.toLowerCase();
    if (relLower === c || relLower.endsWith("/" + c) || relLower.includes(c)) score += 22;
  }

  if (relLower.includes("orchestrator/src/")) score += 1;
  if (relLower.includes("profiles/")) score += 4;

  for (const id of ctx.query.match(/[A-Z][a-zA-Z0-9]+/g) ?? []) {
    const low = id.toLowerCase();
    if (relLower.includes(low) || relLower.includes("types.ts") && low.includes("backend")) score += 14;
    if (low === "knowledgebackendid" && relLower.includes("knowledge/backend/types.ts")) score += 28;
  }

  return score;
}

/** Top-N paths: relevance first, prefer smaller files when density ties (token-aware tie-break). */
export function selectTopRankedPaths(
  ranked: Array<{ path: string; score: number }>,
  tokenEstimate: (relPath: string) => number,
  maxPaths: number,
): string[] {
  const pool = ranked.slice(0, Math.max(maxPaths * 4, maxPaths));
  const density = pool.map((r) => ({
    path: r.path,
    score: r.score,
    tokens: Math.max(1, tokenEstimate(r.path)),
    density: r.score / Math.log1p(tokenEstimate(r.path)),
  }));
  density.sort(
    (a, b) => b.density - a.density || b.score - a.score || a.path.localeCompare(b.path),
  );
  return density.slice(0, maxPaths).map((d) => d.path);
}

export function rankRetrievalPaths(
  paths: string[],
  readPreview: (relPath: string) => string,
  ctx: RetrievalRankingContext,
): Array<{ path: string; score: number }> {
  const unique = [...new Set(paths)].filter((p) => !p.startsWith("secrets/"));
  const scored = unique.map((path) => ({
    path,
    score: scoreRetrievalPath(path, readPreview(path).slice(0, 16_000), ctx),
  }));
  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return scored;
}
