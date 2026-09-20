/**
 * Requirements versioning — immutable baselines + change sets.
 */

import { computeRequirementHash } from "./hash.js";
import type {
  Requirement,
  RequirementsChangeSet,
  RequirementsSpec,
  RequirementStatus,
} from "./types.js";

export class RequirementsImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequirementsImmutabilityError";
  }
}

/** Deep-ish clone for safe snapshots */
export function cloneRequirementsSpec(spec: RequirementsSpec): RequirementsSpec {
  return structuredClone(spec);
}

/**
 * Mark version as immutable baseline. Returns a frozen snapshot (caller must persist).
 */
export function createRequirementsBaseline(spec: RequirementsSpec): RequirementsSpec {
  if (spec.baseline) {
    throw new RequirementsImmutabilityError(
      `Requirements ${spec.requirements_id}@v${spec.version} is already a baseline`,
    );
  }
  const snap = cloneRequirementsSpec(spec);
  snap.baseline = true;
  snap.baseline_at = new Date().toISOString();
  // Accept proposed MUST that passed validation externally — status left to caller
  return snap;
}

/**
 * Attempt to mutate a baseline in-place — forbidden.
 */
export function assertMutable(spec: RequirementsSpec): void {
  if (spec.baseline) {
    throw new RequirementsImmutabilityError(
      `Cannot mutate baseline ${spec.requirements_id}@v${spec.version}; create version+1`,
    );
  }
}

/**
 * Create next version from prior baseline + updated requirements list.
 * Preserves lineage: parent_version = prior.version.
 */
export function createNextRequirementsVersion(
  prior: RequirementsSpec,
  nextRequirements: Requirement[],
  extras?: Partial<
    Pick<
      RequirementsSpec,
      "constraints" | "assumptions" | "open_questions" | "out_of_scope" | "title" | "project_scope"
    >
  >,
): RequirementsSpec {
  if (!prior.baseline && prior.version >= 1) {
    // Allow bumping non-baseline drafts too, but prefer baseline for production path
  }
  const next: RequirementsSpec = {
    ...cloneRequirementsSpec(prior),
    version: prior.version + 1,
    parent_version: prior.version,
    requirements: nextRequirements.map((r) => ({
      ...r,
      requirement_hash: computeRequirementHash(r),
    })),
    constraints: extras?.constraints ?? prior.constraints,
    assumptions: extras?.assumptions ?? prior.assumptions,
    open_questions: extras?.open_questions ?? prior.open_questions,
    out_of_scope: extras?.out_of_scope ?? prior.out_of_scope,
    title: extras?.title ?? prior.title,
    project_scope: extras?.project_scope ?? prior.project_scope,
    baseline: false,
    baseline_at: undefined,
    artifact_id: undefined,
    created_at: new Date().toISOString(),
    conflicts: undefined,
    duplicates: undefined,
  };
  return next;
}

function contentKey(r: Requirement): string {
  return r.requirement_hash ?? computeRequirementHash(r);
}

export function diffRequirementsVersions(
  from: RequirementsSpec,
  to: RequirementsSpec,
): RequirementsChangeSet {
  const fromMap = new Map(from.requirements.map((r) => [r.id, r]));
  const toMap = new Map(to.requirements.map((r) => [r.id, r]));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  const status_changed: Array<{ id: string; from: RequirementStatus; to: RequirementStatus }> =
    [];

  for (const id of toMap.keys()) {
    if (!fromMap.has(id)) added.push(id);
  }
  for (const id of fromMap.keys()) {
    if (!toMap.has(id)) removed.push(id);
  }
  for (const [id, next] of toMap) {
    const prev = fromMap.get(id);
    if (!prev) continue;
    if (contentKey(prev) !== contentKey(next)) {
      modified.push(id);
    }
    if (prev.status !== next.status) {
      status_changed.push({ id, from: prev.status, to: next.status });
    }
  }

  return {
    from_version: from.version,
    to_version: to.version,
    added,
    removed,
    modified,
    status_changed,
  };
}

/** Architecture handoff slice — no raw PRD-only dependency. */
export interface ArchitectureHandoff {
  requirements_id: string;
  version: number;
  accepted_requirements: Requirement[];
  constraints: RequirementsSpec["constraints"];
  assumptions: RequirementsSpec["assumptions"];
  open_questions: RequirementsSpec["open_questions"];
  out_of_scope: RequirementsSpec["out_of_scope"];
  conflicts: RequirementsSpec["conflicts"];
  traceability: Array<{
    requirement_id: string;
    source_type: string;
    reference?: string;
    intent_id?: string;
  }>;
}

export function toArchitectureHandoff(spec: RequirementsSpec): ArchitectureHandoff {
  const accepted = spec.requirements.filter(
    (r) =>
      r.status === "ACCEPTED" ||
      r.status === "PROPOSED" ||
      (r.priority === "MUST" && r.status !== "REJECTED"),
  );
  return {
    requirements_id: spec.requirements_id,
    version: spec.version,
    accepted_requirements: accepted.filter((r) => r.priority !== "OUT_OF_SCOPE"),
    constraints: spec.constraints,
    assumptions: spec.assumptions,
    open_questions: spec.open_questions,
    out_of_scope: spec.out_of_scope,
    conflicts: spec.conflicts,
    traceability: spec.requirements.map((r) => ({
      requirement_id: r.id,
      source_type: r.source.type,
      reference: r.source.reference ?? r.source.section,
      intent_id: r.intent_id,
    })),
  };
}
