/**
 * RequirementsBuilder — normalize AgentDecision / raw proposal → RequirementsSpec.
 * No capability execution.
 */

import { computeRequirementHash } from "./hash.js";
import { validateRequirementsSpec } from "./validate.js";
import type { AgentDecision } from "../agent/types.js";
import type {
  OpenQuestion,
  OutOfScopeItem,
  Requirement,
  RequirementAssumption,
  RequirementConstraint,
  RequirementPriority,
  RequirementSource,
  RequirementStatus,
  RequirementType,
  RequirementsExtractionInput,
  RequirementsSpec,
  RequirementsValidationResult,
} from "./types.js";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function nowIso(): string {
  return new Date().toISOString();
}

const TYPES = new Set<RequirementType>([
  "FUNCTIONAL",
  "NON_FUNCTIONAL",
  "CONSTRAINT",
  "SECURITY",
  "DATA",
  "INTEGRATION",
  "UI",
  "API",
  "PERFORMANCE",
  "OPERATIONAL",
  "NEGATIVE",
  "TECHNICAL_CONSTRAINT",
  "TECHNICAL_PROPOSAL",
]);

const PRIORITIES = new Set<RequirementPriority>([
  "MUST",
  "SHOULD",
  "COULD",
  "OUT_OF_SCOPE",
  "MUST_NOT",
  "SHOULD_NOT",
]);

const STATUSES = new Set<RequirementStatus>([
  "PROPOSED",
  "ACCEPTED",
  "CLARIFICATION_REQUIRED",
  "REJECTED",
  "DEFERRED",
  "AMBIGUOUS",
  "DUPLICATE_CANDIDATE",
]);

function parseSource(raw: unknown, fallback: RequirementSource): RequirementSource {
  const o = asRecord(raw);
  if (!o || typeof o.type !== "string") return fallback;
  return {
    type: o.type as RequirementSource["type"],
    reference: typeof o.reference === "string" ? o.reference : undefined,
    artifact_id: typeof o.artifact_id === "string" ? o.artifact_id : undefined,
    section: typeof o.section === "string" ? o.section : undefined,
    knowledge_id: typeof o.knowledge_id === "string" ? o.knowledge_id : undefined,
    generated: typeof o.generated === "boolean" ? o.generated : undefined,
  };
}

function parseRequirement(raw: unknown, index: number): Requirement | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim()
      : `REQ-${String(index + 1).padStart(3, "0")}`;
  const title = typeof o.title === "string" ? o.title : "";
  const description = typeof o.description === "string" ? o.description : title;
  if (!title.trim() && !description.trim()) return null;

  const type = TYPES.has(o.type as RequirementType)
    ? (o.type as RequirementType)
    : "FUNCTIONAL";
  const priority = PRIORITIES.has(o.priority as RequirementPriority)
    ? (o.priority as RequirementPriority)
    : "SHOULD";
  const status = STATUSES.has(o.status as RequirementStatus)
    ? (o.status as RequirementStatus)
    : "PROPOSED";

  const req: Requirement = {
    id,
    title: title || description.slice(0, 80),
    description: description || title,
    type,
    priority,
    status,
    source: parseSource(o.source, { type: "INFERENCE", generated: true }),
    acceptance_criteria: Array.isArray(o.acceptance_criteria)
      ? o.acceptance_criteria.filter((x): x is string => typeof x === "string")
      : undefined,
    dependencies: Array.isArray(o.dependencies)
      ? o.dependencies.filter((x): x is string => typeof x === "string")
      : undefined,
    tags: Array.isArray(o.tags) ? o.tags.filter((x): x is string => typeof x === "string") : undefined,
    testability:
      typeof o.testability === "string"
        ? (o.testability as Requirement["testability"])
        : undefined,
    intent_id: typeof o.intent_id === "string" ? o.intent_id : undefined,
    notes: typeof o.notes === "string" ? o.notes : undefined,
    risk:
      o.risk === "low" || o.risk === "medium" || o.risk === "high" ? o.risk : undefined,
  };
  req.requirement_hash = computeRequirementHash(req);
  return req;
}

export function emptyRequirementsSpec(
  requirements_id: string,
  project?: string,
): RequirementsSpec {
  return {
    kind: "RequirementsSpec",
    apiVersion: "evolveloop.io/se/v1",
    requirements_id,
    version: 1,
    project,
    requirements: [],
    constraints: [],
    assumptions: [],
    open_questions: [],
    out_of_scope: [],
    created_at: nowIso(),
  };
}

export interface BuildRequirementsResult {
  spec: RequirementsSpec;
  validation: RequirementsValidationResult;
}

/**
 * Build from a structured proposal object (LLM or deterministic extractor).
 */
export function buildRequirementsSpecFromProposal(
  proposal: unknown,
  input: RequirementsExtractionInput = {},
): BuildRequirementsResult {
  const o = asRecord(proposal) ?? {};
  const nested = asRecord(o.proposed_requirements_spec) ?? asRecord(o.spec) ?? o;

  const requirements_id =
    (typeof nested.requirements_id === "string" && nested.requirements_id) ||
    input.requirements_id ||
    (input.project ? `${input.project}-REQ` : "REQ-SPEC");

  const version =
    input.prior != null
      ? input.prior.version + 1
      : typeof nested.version === "number" && nested.version >= 1
        ? nested.version
        : 1;

  const rawReqs = Array.isArray(nested.requirements) ? nested.requirements : [];
  const requirements: Requirement[] = [];
  for (let i = 0; i < rawReqs.length; i++) {
    const r = parseRequirement(rawReqs[i], i);
    if (r) {
      if (input.intent_id && !r.intent_id) r.intent_id = input.intent_id;
      requirements.push(r);
    }
  }

  const constraints: RequirementConstraint[] = Array.isArray(nested.constraints)
    ? nested.constraints
        .map((c, i) => {
          const cr = asRecord(c);
          if (!cr || typeof cr.statement !== "string") return null;
          return {
            constraint_id:
              typeof cr.constraint_id === "string"
                ? cr.constraint_id
                : `C-${String(i + 1).padStart(3, "0")}`,
            statement: cr.statement,
            source: parseSource(cr.source, { type: "CONSTRAINT" }),
            related_requirement_ids: Array.isArray(cr.related_requirement_ids)
              ? cr.related_requirement_ids.filter((x): x is string => typeof x === "string")
              : undefined,
          } satisfies RequirementConstraint;
        })
        .filter((x): x is RequirementConstraint => x != null)
    : [];

  const assumptions: RequirementAssumption[] = Array.isArray(nested.assumptions)
    ? nested.assumptions
        .map((a, i) => {
          const ar = asRecord(a);
          if (!ar || typeof ar.statement !== "string") return null;
          return {
            assumption_id:
              typeof ar.assumption_id === "string"
                ? ar.assumption_id
                : `A-${String(i + 1).padStart(3, "0")}`,
            statement: ar.statement,
            reason: typeof ar.reason === "string" ? ar.reason : undefined,
            source: parseSource(ar.source, { type: "ASSUMPTION", generated: true }),
            risk:
              ar.risk === "low" || ar.risk === "medium" || ar.risk === "high"
                ? ar.risk
                : undefined,
            confidence: typeof ar.confidence === "number" ? ar.confidence : undefined,
            requirement_id:
              typeof ar.requirement_id === "string" ? ar.requirement_id : undefined,
          } satisfies RequirementAssumption;
        })
        .filter((x): x is RequirementAssumption => x != null)
    : [];

  const open_questions: OpenQuestion[] = Array.isArray(nested.open_questions)
    ? nested.open_questions
        .map((q, i) => {
          const qr = asRecord(q);
          if (!qr || typeof qr.text !== "string") return null;
          const priority =
            qr.priority === "BLOCKING" ||
            qr.priority === "HIGH" ||
            qr.priority === "MEDIUM" ||
            qr.priority === "LOW"
              ? qr.priority
              : "MEDIUM";
          return {
            question_id:
              typeof qr.question_id === "string"
                ? qr.question_id
                : `Q-${String(i + 1).padStart(3, "0")}`,
            text: qr.text,
            priority,
            related_requirement_ids: Array.isArray(qr.related_requirement_ids)
              ? qr.related_requirement_ids.filter((x): x is string => typeof x === "string")
              : undefined,
          } satisfies OpenQuestion;
        })
        .filter((x): x is OpenQuestion => x != null)
    : [];

  const out_of_scope: OutOfScopeItem[] = Array.isArray(nested.out_of_scope)
    ? nested.out_of_scope
        .map((item, i) => {
          const ir = asRecord(item);
          if (!ir || typeof ir.statement !== "string") return null;
          return {
            id: typeof ir.id === "string" ? ir.id : `OOS-${String(i + 1).padStart(3, "0")}`,
            statement: ir.statement,
            source: ir.source ? parseSource(ir.source, { type: "PRD" }) : undefined,
          } satisfies OutOfScopeItem;
        })
        .filter((x): x is OutOfScopeItem => x != null)
    : [];

  // Also pull OUT_OF_SCOPE priorities into out_of_scope list if missing
  for (const r of requirements) {
    if (r.priority === "OUT_OF_SCOPE") {
      if (!out_of_scope.some((o) => o.statement === r.description || o.id === r.id)) {
        out_of_scope.push({
          id: `OOS-${r.id}`,
          statement: r.description || r.title,
          source: r.source,
        });
      }
    }
  }

  const spec: RequirementsSpec = {
    kind: "RequirementsSpec",
    apiVersion: "evolveloop.io/se/v1",
    requirements_id,
    version,
    parent_version: input.prior?.version,
    project: input.project ?? (typeof nested.project === "string" ? nested.project : undefined),
    title: typeof nested.title === "string" ? nested.title : undefined,
    source: {
      brief: input.brief,
      prd_ref: input.prd ? "inline-prd" : undefined,
      intent_id: input.intent_id,
    },
    project_scope: asRecord(nested.project_scope)
      ? {
          in_scope: Array.isArray((nested.project_scope as Record<string, unknown>).in_scope)
            ? (
                (nested.project_scope as Record<string, unknown>).in_scope as unknown[]
              ).filter((x): x is string => typeof x === "string")
            : undefined,
          out_of_scope: Array.isArray(
            (nested.project_scope as Record<string, unknown>).out_of_scope,
          )
            ? (
                (nested.project_scope as Record<string, unknown>).out_of_scope as unknown[]
              ).filter((x): x is string => typeof x === "string")
            : undefined,
        }
      : undefined,
    requirements,
    constraints,
    assumptions,
    open_questions,
    out_of_scope,
    created_at: nowIso(),
  };

  // Merge input constraints text as TECHNICAL_CONSTRAINT if not present
  if (input.constraints?.length) {
    for (let i = 0; i < input.constraints.length; i++) {
      const statement = input.constraints[i]!;
      if (!constraints.some((c) => c.statement.toLowerCase() === statement.toLowerCase())) {
        constraints.push({
          constraint_id: `C-IN-${String(i + 1).padStart(3, "0")}`,
          statement,
          source: { type: "CONSTRAINT" },
        });
      }
    }
    spec.constraints = constraints;
  }

  const validation = validateRequirementsSpec(spec, {
    preserved_constraints: input.constraints,
    deny_policy_overrides: true,
  });
  if (validation.conflicts.length) spec.conflicts = validation.conflicts;
  if (validation.duplicates.length) spec.duplicates = validation.duplicates;

  return { spec, validation };
}

/**
 * Convert AgentDecision REQUIREMENTS_PROPOSAL → RequirementsSpec.
 * LLM cannot mark baseline / ACCEPTED silently — statuses stay PROPOSED unless already set.
 */
export function buildRequirementsFromAgentDecision(
  decision: AgentDecision,
  input: RequirementsExtractionInput = {},
): BuildRequirementsResult {
  if (decision.decision_type !== "REQUIREMENTS_PROPOSAL") {
    const empty = emptyRequirementsSpec(input.requirements_id ?? "REQ-SPEC", input.project);
    empty.open_questions = [
      {
        question_id: "Q-001",
        text: `Expected REQUIREMENTS_PROPOSAL, got ${decision.decision_type}`,
        priority: "BLOCKING",
      },
    ];
    const validation = validateRequirementsSpec(empty);
    return { spec: empty, validation };
  }

  const result = buildRequirementsSpecFromProposal(
    { proposed_requirements_spec: decision.proposed_requirements_spec },
    input,
  );

  // Runtime authority: strip illicit ACCEPTED transitions without evidence
  for (const r of result.spec.requirements) {
    if (r.status === "ACCEPTED" && r.source.type === "INFERENCE") {
      r.status = "PROPOSED";
    }
    if (r.status === "CLARIFICATION_REQUIRED") {
      // cannot silently upgrade — leave as-is
    }
  }
  result.spec.baseline = false;
  delete result.spec.baseline_at;

  result.validation = validateRequirementsSpec(result.spec, {
    preserved_constraints: input.constraints,
    deny_policy_overrides: true,
  });
  return result;
}
