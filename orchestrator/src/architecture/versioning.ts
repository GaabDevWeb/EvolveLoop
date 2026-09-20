/**
 * Architecture versioning — immutable baselines + change sets.
 */

import type { ArchitectureChangeSet, ArchitectureSpec } from "./types.js";

export class ArchitectureImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchitectureImmutabilityError";
  }
}

export function cloneArchitectureSpec(spec: ArchitectureSpec): ArchitectureSpec {
  return structuredClone(spec);
}

export function createArchitectureBaseline(spec: ArchitectureSpec): ArchitectureSpec {
  if (spec.baseline) {
    throw new ArchitectureImmutabilityError(
      `Architecture ${spec.architecture_id}@v${spec.version} is already a baseline`,
    );
  }
  const snap = cloneArchitectureSpec(spec);
  snap.baseline = true;
  snap.baseline_at = new Date().toISOString();
  return snap;
}

export function assertArchitectureMutable(spec: ArchitectureSpec): void {
  if (spec.baseline) {
    throw new ArchitectureImmutabilityError(
      `Cannot mutate baseline ${spec.architecture_id}@v${spec.version}; create version+1`,
    );
  }
}

export function createNextArchitectureVersion(
  prior: ArchitectureSpec,
  patch: Partial<ArchitectureSpec>,
): ArchitectureSpec {
  const next: ArchitectureSpec = {
    ...cloneArchitectureSpec(prior),
    ...patch,
    architecture_id: prior.architecture_id,
    version: prior.version + 1,
    parent_version: prior.version,
    requirements_reference: patch.requirements_reference ?? prior.requirements_reference,
    components: patch.components ?? prior.components,
    interfaces: patch.interfaces ?? prior.interfaces,
    technology_choices: patch.technology_choices ?? prior.technology_choices,
    decisions: patch.decisions ?? prior.decisions,
    assumptions: patch.assumptions ?? prior.assumptions,
    open_questions: patch.open_questions ?? prior.open_questions,
    risks: patch.risks ?? prior.risks,
    traceability: patch.traceability ?? prior.traceability,
    baseline: false,
    baseline_at: undefined,
    artifact_id: undefined,
    created_at: new Date().toISOString(),
  };
  return next;
}

export function diffArchitectureVersions(
  from: ArchitectureSpec,
  to: ArchitectureSpec,
): ArchitectureChangeSet {
  const fromCmps = new Set(from.components.map((c) => c.id));
  const toCmps = new Set(to.components.map((c) => c.id));
  const fromIf = new Map(from.interfaces.map((i) => [i.interface_id, JSON.stringify(i)]));
  const toIf = new Map(to.interfaces.map((i) => [i.interface_id, JSON.stringify(i)]));
  const fromTech = new Map(from.technology_choices.map((t) => [t.technology_id, t.name]));
  const toTech = new Map(to.technology_choices.map((t) => [t.technology_id, t.name]));
  const fromDec = new Map(from.decisions.map((d) => [d.decision_id, d.chosen]));
  const toDec = new Map(to.decisions.map((d) => [d.decision_id, d.chosen]));

  const interfaces_changed: string[] = [];
  for (const [id, v] of toIf) {
    if (!fromIf.has(id) || fromIf.get(id) !== v) interfaces_changed.push(id);
  }
  for (const id of fromIf.keys()) {
    if (!toIf.has(id)) interfaces_changed.push(id);
  }

  const technologies_changed: string[] = [];
  for (const [id, name] of toTech) {
    if (fromTech.get(id) !== name) technologies_changed.push(id);
  }
  for (const id of fromTech.keys()) {
    if (!toTech.has(id)) technologies_changed.push(id);
  }

  const decisions_changed: string[] = [];
  for (const [id, chosen] of toDec) {
    if (fromDec.get(id) !== chosen) decisions_changed.push(id);
  }

  return {
    from_version: from.version,
    to_version: to.version,
    components_added: [...toCmps].filter((id) => !fromCmps.has(id)),
    components_removed: [...fromCmps].filter((id) => !toCmps.has(id)),
    interfaces_changed: [...new Set(interfaces_changed)],
    technologies_changed: [...new Set(technologies_changed)],
    decisions_changed,
  };
}

/** Handoff slice for future SE-03 Task Decomposition — no tasks generated. */
export interface TaskDecompositionHandoff {
  architecture_id: string;
  version: number;
  requirements_reference: ArchitectureSpec["requirements_reference"];
  components: ArchitectureSpec["components"];
  interfaces: ArchitectureSpec["interfaces"];
  dependencies: Array<{ from: string; to: string }>;
  decisions: ArchitectureSpec["decisions"];
  constraints: ArchitectureSpec["technology_choices"];
  nfr_responses: ArchitectureSpec["nfr_responses"];
  testing_strategy: ArchitectureSpec["testing_strategy"];
  dod_hints: Array<{ component_id: string; hints: string[] }>;
}

export function toTaskDecompositionHandoff(spec: ArchitectureSpec): TaskDecompositionHandoff {
  const dependencies: Array<{ from: string; to: string }> = [];
  for (const c of spec.components) {
    for (const d of c.dependencies ?? []) {
      dependencies.push({ from: c.id, to: d });
    }
  }
  return {
    architecture_id: spec.architecture_id,
    version: spec.version,
    requirements_reference: spec.requirements_reference,
    components: spec.components,
    interfaces: spec.interfaces,
    dependencies,
    decisions: spec.decisions,
    constraints: spec.technology_choices.filter((t) => t.kind === "CONSTRAINT"),
    nfr_responses: spec.nfr_responses,
    testing_strategy: spec.testing_strategy,
    dod_hints: spec.components
      .filter((c) => (c.dod_hints?.length ?? 0) > 0)
      .map((c) => ({ component_id: c.id, hints: c.dod_hints! })),
  };
}
