/**
 * Deterministic RequirementsValidator — no LLM.
 */

import type {
  Requirement,
  RequirementConflict,
  RequirementDuplicate,
  RequirementsSpec,
  RequirementsValidationIssue,
  RequirementsValidationResult,
  RequirementsReadiness,
} from "./types.js";

const ID_RE = /^REQ-\d{3,}$/;
const ASSUMPTION_ID_RE = /^A-\d{3,}$/;
const QUESTION_ID_RE = /^Q-\d{3,}$/;
const CONSTRAINT_ID_RE = /^C-\d{3,}$/;

const AMBIGUOUS_TERMS =
  /\b(fast|secure|easy to use|scalable|professional|simple|robust|modern|best)\b/i;

export interface RequirementsValidatorOptions {
  /** When true, MUST without acceptance_criteria → error (default: warning) */
  require_acceptance_for_must?: boolean;
  /** Existing workspace / policy constraints that must not be dropped */
  preserved_constraints?: string[];
  /** Runtime policy flags that PRD cannot override */
  deny_policy_overrides?: boolean;
}

function push(
  list: RequirementsValidationIssue[],
  severity: "error" | "warning",
  code: string,
  message: string,
  requirement_id?: string,
): void {
  list.push({ code, message, severity, requirement_id });
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeText(s).split(" ").filter((t) => t.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Detect PostgreSQL vs SQLite (and similar) stack conflicts. */
export function detectStackConflicts(requirements: Requirement[]): RequirementConflict[] {
  const conflicts: RequirementConflict[] = [];
  const dbMentions: Array<{ id: string; db: string }> = [];
  for (const r of requirements) {
    const text = `${r.title} ${r.description}`.toLowerCase();
    if (/\bpostgres(ql)?\b/.test(text)) dbMentions.push({ id: r.id, db: "postgresql" });
    if (/\bsqlite\b/.test(text)) dbMentions.push({ id: r.id, db: "sqlite" });
    if (/\bmysql\b/.test(text)) dbMentions.push({ id: r.id, db: "mysql" });
  }
  const byDb = new Map<string, string[]>();
  for (const m of dbMentions) {
    const list = byDb.get(m.db) ?? [];
    list.push(m.id);
    byDb.set(m.db, list);
  }
  const dbs = [...byDb.keys()];
  if (dbs.length >= 2) {
    const ids = [...new Set(dbMentions.map((m) => m.id))];
    conflicts.push({
      conflict_id: `CONF-DB-${dbs.sort().join("-")}`,
      requirement_ids: ids,
      description: `Conflicting database constraints: ${dbs.join(" vs ")}`,
      code: "REQUIREMENT_CONFLICT",
    });
  }
  return conflicts;
}

export function detectDuplicateCandidates(requirements: Requirement[]): RequirementDuplicate[] {
  const out: RequirementDuplicate[] = [];
  for (let i = 0; i < requirements.length; i++) {
    for (let j = i + 1; j < requirements.length; j++) {
      const a = requirements[i]!;
      const b = requirements[j]!;
      if (a.priority === "OUT_OF_SCOPE" || b.priority === "OUT_OF_SCOPE") continue;
      const sim = jaccard(
        tokenSet(`${a.title} ${a.description}`),
        tokenSet(`${b.title} ${b.description}`),
      );
      if (sim >= 0.72) {
        out.push({
          group_id: `DUP-${a.id}-${b.id}`,
          requirement_ids: [a.id, b.id],
          reason: `Semantic similarity ${(sim * 100).toFixed(0)}%`,
          code: "DUPLICATE_CANDIDATE",
        });
      }
    }
  }
  return out;
}

function detectDependencyConflicts(requirements: Requirement[]): RequirementConflict[] {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  const conflicts: RequirementConflict[] = [];
  for (const r of requirements) {
    for (const dep of r.dependencies ?? []) {
      const d = byId.get(dep);
      if (!d) continue;
      if (
        d.priority === "OUT_OF_SCOPE" &&
        (r.priority === "MUST" || r.priority === "MUST_NOT" || r.priority === "SHOULD")
      ) {
        conflicts.push({
          conflict_id: `CONF-DEP-${r.id}-${dep}`,
          requirement_ids: [r.id, dep],
          description: `${r.id} (${r.priority}) depends on OUT_OF_SCOPE ${dep}`,
          code: "REQUIREMENT_CONFLICT",
        });
      }
      if (d.status === "REJECTED" && r.priority === "MUST") {
        conflicts.push({
          conflict_id: `CONF-REJ-${r.id}-${dep}`,
          requirement_ids: [r.id, dep],
          description: `${r.id} MUST depends on REJECTED ${dep}`,
          code: "REQUIREMENT_CONFLICT",
        });
      }
    }
  }
  return conflicts;
}

function looksLikeArchitectureLeak(r: Requirement): boolean {
  if (r.type === "TECHNICAL_CONSTRAINT" || r.type === "CONSTRAINT") return false;
  if (!r.source?.type) return false;
  const text = `${r.title} ${r.description}`;
  const techProposal =
    /\b(use|adopt|choose|implement with)\s+(redis|kafka|mongodb|graphql|kubernetes|docker)\b/i.test(
      text,
    );
  return techProposal && r.type === "FUNCTIONAL" && r.source.type === "INFERENCE";
}

function policyOverrideAttempt(text: string): boolean {
  return (
    /\b(disable|skip|ignore)\s+(security|evidence|tests?|policy|gates?|authorization)\b/i.test(
      text,
    ) ||
    /\ballow unrestricted (filesystem|shell|network)\b/i.test(text) ||
    /\bignore all (project )?constraints\b/i.test(text)
  );
}

export function validateRequirementsSpec(
  spec: RequirementsSpec,
  options: RequirementsValidatorOptions = {},
): RequirementsValidationResult {
  const errors: RequirementsValidationIssue[] = [];
  const warnings: RequirementsValidationIssue[] = [];

  if (spec.kind !== "RequirementsSpec") {
    push(errors, "error", "SCHEMA", "kind must be RequirementsSpec");
  }
  if (spec.apiVersion !== "evolveloop.io/se/v1") {
    push(errors, "error", "SCHEMA", "apiVersion must be evolveloop.io/se/v1");
  }
  if (!spec.requirements_id?.trim()) {
    push(errors, "error", "SCHEMA", "requirements_id is required");
  }
  if (!Number.isInteger(spec.version) || spec.version < 1) {
    push(errors, "error", "SCHEMA", "version must be integer >= 1");
  }
  if (!Array.isArray(spec.requirements)) {
    push(errors, "error", "SCHEMA", "requirements must be an array");
    return {
      ok: false,
      readiness: "NOT_READY",
      errors,
      warnings,
      conflicts: [],
      duplicates: [],
    };
  }

  const seenIds = new Set<string>();
  for (const r of spec.requirements) {
    if (!r.id || !ID_RE.test(r.id)) {
      push(errors, "error", "IDENTITY", `Invalid requirement id: ${r.id}`, r.id);
    }
    if (seenIds.has(r.id)) {
      push(errors, "error", "ID_COLLISION", `Duplicate requirement id: ${r.id}`, r.id);
    }
    seenIds.add(r.id);

    if (!r.title?.trim() || !r.description?.trim()) {
      push(errors, "error", "SCHEMA", "title and description required", r.id);
    }
    if (!r.source?.type) {
      push(errors, "error", "SOURCE_MISSING", "source.type is required", r.id);
    }
    if (r.source?.generated && r.source.type !== "INFERENCE" && r.source.type !== "ASSUMPTION") {
      push(
        warnings,
        "warning",
        "GENERATED_SOURCE",
        "generated=true should use INFERENCE or ASSUMPTION source",
        r.id,
      );
    }

    for (const dep of r.dependencies ?? []) {
      if (!seenIds.has(dep) && !spec.requirements.some((x) => x.id === dep)) {
        // forward refs ok if present later — check after loop
      }
    }

    if (
      (r.priority === "MUST" || r.priority === "MUST_NOT") &&
      (!r.acceptance_criteria || r.acceptance_criteria.length === 0)
    ) {
      const sev = options.require_acceptance_for_must ? "error" : "warning";
      push(
        sev === "error" ? errors : warnings,
        sev,
        "MISSING_ACCEPTANCE",
        "MUST/MUST_NOT should have acceptance criteria",
        r.id,
      );
    }

    if (AMBIGUOUS_TERMS.test(`${r.title} ${r.description}`) && r.status !== "AMBIGUOUS") {
      if (!r.source.generated && r.status !== "CLARIFICATION_REQUIRED") {
        push(
          warnings,
          "warning",
          "AMBIGUOUS_LANGUAGE",
          "Ambiguous language without AMBIGUOUS/CLARIFICATION_REQUIRED status",
          r.id,
        );
      }
    }

    if (looksLikeArchitectureLeak(r)) {
      push(
        warnings,
        "warning",
        "ARCHITECTURE_LEAK",
        "Technical proposal classified as FUNCTIONAL without user constraint",
        r.id,
      );
    }

    if (options.deny_policy_overrides !== false) {
      const blob = `${r.title} ${r.description}`;
      if (policyOverrideAttempt(blob)) {
        push(
          errors,
          "error",
          "POLICY_BOUNDARY",
          "Requirement attempts to override runtime policy (A03/B01/evidence)",
          r.id,
        );
      }
    }
  }

  // Dependency existence
  for (const r of spec.requirements) {
    for (const dep of r.dependencies ?? []) {
      if (!seenIds.has(dep)) {
        push(errors, "error", "INVALID_DEPENDENCY", `Unknown dependency ${dep}`, r.id);
      }
    }
  }

  for (const a of spec.assumptions ?? []) {
    if (!ASSUMPTION_ID_RE.test(a.assumption_id)) {
      push(errors, "error", "IDENTITY", `Invalid assumption_id: ${a.assumption_id}`);
    }
  }
  for (const q of spec.open_questions ?? []) {
    if (!QUESTION_ID_RE.test(q.question_id)) {
      push(errors, "error", "IDENTITY", `Invalid question_id: ${q.question_id}`);
    }
  }
  for (const c of spec.constraints ?? []) {
    if (!CONSTRAINT_ID_RE.test(c.constraint_id)) {
      push(errors, "error", "IDENTITY", `Invalid constraint_id: ${c.constraint_id}`);
    }
  }

  if (options.preserved_constraints?.length) {
    const corpus = [
      ...spec.constraints.map((c) => c.statement),
      ...spec.requirements.map((r) => `${r.title} ${r.description}`),
    ]
      .join("\n")
      .toLowerCase();
    for (const pc of options.preserved_constraints) {
      if (!corpus.includes(pc.toLowerCase())) {
        push(
          errors,
          "error",
          "CONSTRAINT_DROPPED",
          `Preserved constraint missing from spec: ${pc}`,
        );
      }
    }
  }

  const conflicts = [
    ...detectStackConflicts(spec.requirements),
    ...detectDependencyConflicts(spec.requirements),
    ...(spec.conflicts ?? []),
  ];
  // Dedupe by conflict_id
  const conflictMap = new Map(conflicts.map((c) => [c.conflict_id, c]));
  const uniqueConflicts = [...conflictMap.values()];

  const duplicates = [
    ...detectDuplicateCandidates(spec.requirements),
    ...(spec.duplicates ?? []),
  ];
  const dupMap = new Map(duplicates.map((d) => [d.group_id, d]));
  const uniqueDuplicates = [...dupMap.values()];

  for (const c of uniqueConflicts) {
    push(errors, "error", "REQUIREMENT_CONFLICT", c.description, c.requirement_ids[0]);
  }
  for (const d of uniqueDuplicates) {
    push(
      warnings,
      "warning",
      "DUPLICATE_CANDIDATE",
      d.reason,
      d.requirement_ids[0],
    );
  }

  const readiness = computeReadiness(spec, errors, uniqueConflicts);
  const ok = errors.length === 0 && (readiness === "READY" || readiness === "READY_WITH_ASSUMPTIONS");

  return {
    ok,
    readiness,
    errors,
    warnings,
    conflicts: uniqueConflicts,
    duplicates: uniqueDuplicates,
  };
}

export function computeReadiness(
  spec: RequirementsSpec,
  errors: RequirementsValidationIssue[],
  conflicts: RequirementConflict[],
): RequirementsReadiness {
  if (!spec.requirements_id || spec.requirements.length === 0) {
    const briefEmpty =
      !spec.source?.brief?.trim() &&
      !spec.title?.trim() &&
      (spec.open_questions?.length ?? 0) === 0;
    if (briefEmpty || spec.requirements.length === 0) {
      return "NOT_READY";
    }
  }

  const blockingQs = (spec.open_questions ?? []).filter((q) => q.priority === "BLOCKING");
  if (blockingQs.length > 0) return "HUMAN_REQUIRED";

  const needsClarify = spec.requirements.some(
    (r) => r.status === "CLARIFICATION_REQUIRED" || r.status === "AMBIGUOUS",
  );
  if (needsClarify) return "HUMAN_REQUIRED";

  if (conflicts.length > 0) return "NOT_READY";

  const hardErrors = errors.filter(
    (e) => e.code !== "REQUIREMENT_CONFLICT" && e.severity === "error",
  );
  if (hardErrors.length > 0) return "NOT_READY";

  const hasAssumptions =
    (spec.assumptions?.length ?? 0) > 0 ||
    spec.requirements.some((r) => r.source.type === "ASSUMPTION" || r.source.generated);

  const mustCount = spec.requirements.filter(
    (r) => r.priority === "MUST" || r.priority === "MUST_NOT",
  ).length;
  if (mustCount === 0 && spec.requirements.every((r) => r.priority === "OUT_OF_SCOPE")) {
    return "NOT_READY";
  }

  if (hasAssumptions) return "READY_WITH_ASSUMPTIONS";
  return "READY";
}

/** Gate: may architecture planning start? */
export function requirementsGateAllowsArchitecture(
  result: RequirementsValidationResult,
  policyAllowWithAssumptions = true,
): boolean {
  if (result.readiness === "READY") return result.ok || result.errors.length === 0;
  if (result.readiness === "READY_WITH_ASSUMPTIONS") return policyAllowWithAssumptions;
  return false;
}
