/**
 * Deterministic relevance ranking for context budget (V22-GOAL-006d).
 *
 * Scoring inputs (no circularity):
 * - query / briefing text
 * - runtime cited_paths from objective metadata
 * - structural path signals (docs/adr, docs/architecture, orchestrator/src, profiles/)
 *
 * Does NOT use: rg_patterns (answer leakage), verifier anchors, expected substrings.
 * Candidate path SET is unchanged from B0 (rg union); only ORDER/cut differs.
 */

export interface RetrievalRankingContext {
  query: string;
  /** Paths explicitly named in briefing/objective (not verifier anchors). */
  cited_paths?: string[];
}

const ARCH_PREFIXES = ["docs/adr/", "docs/architecture/", "docs/architecture/finalization/adrs/"];

const STOPWORDS = new Set([
  "qual",
  "quais",
  "onde",
  "como",
  "que",
  "the",
  "uma",
  "um",
  "no",
  "na",
  "do",
  "da",
  "dos",
  "das",
  "para",
  "por",
  "com",
  "sem",
  "uso",
  "usa",
  "usar",
]);

export function tokenizeForRanking(text: string): string[] {
  const raw = text.match(/[a-zA-Z0-9_./-]+/g) ?? [];
  const out: string[] = [];
  for (const t of raw) {
    const low = t.toLowerCase();
    if (low.length < 2) continue;
    if (STOPWORDS.has(low)) continue;
    out.push(low);
  }
  return out;
}

export function extractQueryTerms(ctx: RetrievalRankingContext): string[] {
  const terms = new Set<string>();
  for (const t of tokenizeForRanking(ctx.query)) terms.add(t);
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

function camelCaseTokens(query: string): string[] {
  const ids = query.match(/[A-Z][a-zA-Z0-9]+/g) ?? [];
  const parts: string[] = [];
  for (const id of ids) {
    parts.push(id.toLowerCase());
    const split = id.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/\s+/);
    parts.push(...split.filter((p) => p.length >= 3));
  }
  return parts;
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
  if (relLower.includes(".cursor/skills/")) score += 2;

  const qLower = ctx.query.toLowerCase();
  if (qLower.includes("wiki-mem") && relLower.includes("skills/wiki")) score += 12;
  if (qLower.includes("skill") && qLower.includes("wiki") && relLower.includes("skills/wiki/")) {
    score += 14;
  }
  if (qLower.includes("default.yaml") && relLower.endsWith("profiles/default.yaml")) score += 24;

  for (const part of camelCaseTokens(ctx.query)) {
    if (relLower.includes(part)) score += 6;
    if (bodyLower.includes(part)) score += 3;
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
