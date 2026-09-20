/**
 * Deterministic TaskGraphValidator — no LLM.
 */

import type { RequirementsSpec } from "../requirements/types.js";
import type { ArchitectureSpec } from "../architecture/types.js";
import type {
  EngineeringTask,
  EngineeringTaskGraph,
  TaskGraphExtractionInput,
  TaskGraphHealth,
  TaskGraphValidationIssue,
  TaskGraphValidationResult,
} from "./types.js";

const TASK_RE = /^TASK-\d{3,}(R\d+)?$/;
const SECRET_RE =
  /(password\s*=\s*\S+|api[_-]?key\s*=\s*\S+|secret\s*=\s*\S+|bearer\s+[a-z0-9._-]{8,}|sk-[a-z0-9]{10,})/i;

const FORBIDDEN_CAP =
  /\bunrestricted\.(shell|filesystem|network)\b|^\*$|filesystem\.\*|shell\.\*/i;

function push(
  list: TaskGraphValidationIssue[],
  severity: "error" | "warning",
  code: string,
  message: string,
  extra?: Partial<TaskGraphValidationIssue>,
): void {
  list.push({ code, message, severity, ...extra });
}

function findCycles(tasks: EngineeringTask[]): string[][] {
  const graph = new Map(tasks.map((t) => [t.id, t.dependencies.map((d) => d.task_id)]));
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      if (idx >= 0) cycles.push(stack.slice(idx).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const dep of graph.get(node) ?? []) {
      if (graph.has(dep)) dfs(dep);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const id of graph.keys()) dfs(id);
  return cycles;
}

function pathConflict(a: string, b: string): boolean {
  const na = a.replace(/\/\*$/, "/").replace(/\*$/, "");
  const nb = b.replace(/\/\*$/, "/").replace(/\*$/, "");
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
}

function isGodTask(t: EngineeringTask): boolean {
  return /entire|complete crm|whole (system|backend|frontend|application)/i.test(
    `${t.title} ${t.description}`,
  );
}

function isTrivialTask(t: EngineeringTask): boolean {
  return /^(open|read|save|edit)\s+(file|line)/i.test(t.title.trim());
}

export function deriveTaskGraphMetadata(graph: EngineeringTaskGraph): NonNullable<EngineeringTaskGraph["derived"]> {
  const edges = graph.tasks.flatMap((t) => t.dependencies.map((d) => `${d.task_id}->${t.id}`));
  const dependents = new Map<string, string[]>();
  const depsOf = new Map<string, string[]>();
  for (const t of graph.tasks) {
    depsOf.set(
      t.id,
      t.dependencies.map((d) => d.task_id),
    );
    for (const d of t.dependencies) {
      const list = dependents.get(d.task_id) ?? [];
      list.push(t.id);
      dependents.set(d.task_id, list);
    }
  }

  // Parallel groups: tasks with identical dependency sets and no mutual edges
  const byDepKey = new Map<string, string[]>();
  for (const t of graph.tasks) {
    const key = [...(depsOf.get(t.id) ?? [])].sort().join(",");
    const list = byDepKey.get(key) ?? [];
    list.push(t.id);
    byDepKey.set(key, list);
  }
  const parallelizable_groups = [...byDepKey.values()].filter((g) => g.length > 1);

  // Critical path heuristic: longest path by dependency depth (cycle-safe)
  const memo = new Map<string, string[]>();
  const visitingLong = new Set<string>();
  function longest(id: string): string[] {
    if (memo.has(id)) return memo.get(id)!;
    if (visitingLong.has(id)) return [id]; // cycle break
    visitingLong.add(id);
    const preds = depsOf.get(id) ?? [];
    if (!preds.length) {
      memo.set(id, [id]);
      visitingLong.delete(id);
      return [id];
    }
    let best: string[] = [];
    for (const p of preds) {
      const path = [...longest(p), id];
      if (path.length > best.length) best = path;
    }
    memo.set(id, best);
    visitingLong.delete(id);
    return best;
  }
  let critical_path: string[] = [];
  for (const t of graph.tasks) {
    const p = longest(t.id);
    if (p.length > critical_path.length) critical_path = p;
  }

  const risk_summary: Record<string, number> = {};
  for (const t of graph.tasks) {
    const r = t.risk ?? "LOW";
    risk_summary[r] = (risk_summary[r] ?? 0) + 1;
  }

  return {
    node_count: graph.tasks.length,
    edge_count: edges.length,
    parallelizable_groups,
    critical_path,
    risk_summary,
  };
}

export function validateTaskGraph(
  graph: EngineeringTaskGraph,
  requirements: RequirementsSpec,
  architecture: ArchitectureSpec,
  options: Pick<TaskGraphExtractionInput, "known_capabilities" | "allow_warnings_as_ready"> = {},
): TaskGraphValidationResult {
  const errors: TaskGraphValidationIssue[] = [];
  const warnings: TaskGraphValidationIssue[] = [];

  if (graph.kind !== "EngineeringTaskGraph") {
    push(errors, "error", "SCHEMA", "kind must be EngineeringTaskGraph");
  }
  if (graph.apiVersion !== "evolveloop.io/se/v1") {
    push(errors, "error", "SCHEMA", "apiVersion must be evolveloop.io/se/v1");
  }
  if (!graph.task_graph_id?.trim()) {
    push(errors, "error", "SCHEMA", "task_graph_id is required");
  }
  if (!Number.isInteger(graph.version) || graph.version < 1) {
    push(errors, "error", "SCHEMA", "version must be integer >= 1");
  }

  if (
    !graph.requirements_reference?.requirements_id ||
    !graph.requirements_reference.requirements_version
  ) {
    push(errors, "error", "MISSING_REQUIREMENTS_REFERENCE", "requirements_reference mandatory");
  } else if (
    graph.requirements_reference.requirements_id !== requirements.requirements_id ||
    graph.requirements_reference.requirements_version !== requirements.version
  ) {
    push(errors, "error", "REQUIREMENTS_BINDING_MISMATCH", "Task graph requirements binding mismatch");
  }

  if (
    !graph.architecture_reference?.architecture_id ||
    !graph.architecture_reference.architecture_version
  ) {
    push(errors, "error", "MISSING_ARCHITECTURE_REFERENCE", "architecture_reference mandatory");
  } else if (
    graph.architecture_reference.architecture_id !== architecture.architecture_id ||
    graph.architecture_reference.architecture_version !== architecture.version
  ) {
    push(errors, "error", "ARCHITECTURE_BINDING_MISMATCH", "Task graph architecture binding mismatch");
  }

  const ids = new Set<string>();
  const edgeSet = new Set<string>();

  for (const t of graph.tasks ?? []) {
    if (!TASK_RE.test(t.id)) {
      push(errors, "error", "IDENTITY", `Invalid task id: ${t.id}`, { task_id: t.id });
    }
    if (ids.has(t.id)) {
      push(errors, "error", "ID_COLLISION", `Duplicate task id: ${t.id}`, { task_id: t.id });
    }
    ids.add(t.id);

    if (!t.title?.trim() || !t.description?.trim()) {
      push(errors, "error", "SCHEMA", "title and description required", { task_id: t.id });
    }

    if (
      !t.requirement_ids?.length &&
      !t.architecture_component_ids?.length &&
      !t.notes?.includes("project-objective")
    ) {
      push(errors, "error", "ORPHAN_TASK", `Task ${t.id} lacks requirement/architecture linkage`, {
        task_id: t.id,
      });
    }

    if (t.priority === "MUST" && (!t.definition_of_done || t.definition_of_done.length === 0)) {
      push(errors, "error", "MISSING_DOD", `MUST task ${t.id} requires definition_of_done`, {
        task_id: t.id,
      });
    }

    if (isGodTask(t)) {
      push(errors, "error", "UNDER_DECOMPOSED", `Task ${t.id} is too coarse`, { task_id: t.id });
    }
    if (isTrivialTask(t)) {
      push(warnings, "warning", "OVER_DECOMPOSED", `Task ${t.id} looks trivially fine-grained`, {
        task_id: t.id,
      });
    }

    for (const dep of t.dependencies ?? []) {
      if (dep.task_id === t.id) {
        push(errors, "error", "SELF_DEPENDENCY", `${t.id} depends on itself`, { task_id: t.id });
      }
      const edge = `${dep.task_id}->${t.id}`;
      if (edgeSet.has(edge)) {
        push(warnings, "warning", "DUPLICATE_EDGE", `Duplicate edge ${edge}`, { task_id: t.id });
      }
      edgeSet.add(edge);
    }

    for (const cap of t.required_capabilities ?? []) {
      if (FORBIDDEN_CAP.test(cap) || /unrestricted/i.test(cap)) {
        push(
          errors,
          "error",
          "FORBIDDEN_CAPABILITY",
          `Task ${t.id} declares forbidden capability ${cap}`,
          { task_id: t.id },
        );
      }
      if (options.known_capabilities && !options.known_capabilities.includes(cap)) {
        push(
          warnings,
          "warning",
          "UNKNOWN_CAPABILITY",
          `Capability ${cap} not in known catalog (proposal only)`,
          { task_id: t.id },
        );
      }
    }

    if (/kubernetes|k8s cluster/i.test(`${t.title} ${t.description}`)) {
      const justified =
        architecture.technology_choices.some((x) => /kubernetes|k8s/i.test(x.name)) ||
        architecture.components.some((c) => /kubernetes|k8s/i.test(c.name));
      if (!justified) {
        push(
          errors,
          "error",
          "ORPHAN_TASK",
          `Task ${t.id} injects unjustified infrastructure`,
          { task_id: t.id },
        );
      }
    }

    if (/disable (security|evidence|tests|gates?)/i.test(`${t.title} ${t.description}`)) {
      push(
        errors,
        "error",
        "POLICY_BOUNDARY",
        `Task ${t.id} attempts to relax runtime policy`,
        { task_id: t.id },
      );
    }

    if (t.side_effects?.includes("DEPLOYMENT") && /production/i.test(`${t.title} ${t.description}`)) {
      push(
        warnings,
        "warning",
        "NO_AUTO_DEPLOY",
        `Production deploy task ${t.id} remains subject to A03/B01 — not auto-authorized`,
        { task_id: t.id },
      );
    }
  }

  for (const t of graph.tasks ?? []) {
    for (const dep of t.dependencies ?? []) {
      if (!ids.has(dep.task_id)) {
        push(
          errors,
          "error",
          "UNKNOWN_TASK_DEPENDENCY",
          `${t.id} depends on unknown ${dep.task_id}`,
          { task_id: t.id },
        );
      }
    }
  }

  for (const cy of findCycles(graph.tasks ?? [])) {
    push(errors, "error", "DEPENDENCY_CYCLE", `Cycle: ${cy.join(" → ")}`);
  }

  // Scope conflicts among parallel tasks
  for (let i = 0; i < (graph.tasks?.length ?? 0); i++) {
    for (let j = i + 1; j < graph.tasks.length; j++) {
      const a = graph.tasks[i]!;
      const b = graph.tasks[j]!;
      const aPaths = [...(a.owned_paths ?? []), ...(a.scope ?? [])];
      const bPaths = [...(b.owned_paths ?? []), ...(b.scope ?? [])];
      let conflict = false;
      for (const pa of aPaths) {
        for (const pb of bPaths) {
          if (pathConflict(pa, pb)) conflict = true;
        }
      }
      if (!conflict) continue;
      const aDepsB = a.dependencies.some((d) => d.task_id === b.id);
      const bDepsA = b.dependencies.some((d) => d.task_id === a.id);
      if (!aDepsB && !bDepsA) {
        push(
          errors,
          "error",
          "TASK_SCOPE_CONFLICT",
          `${a.id} and ${b.id} share scope/paths without serialization`,
          { task_id: a.id },
        );
      }
    }
  }

  // Out-of-scope mobile/desktop tasks
  const oos = [
    ...requirements.out_of_scope.map((o) => o.statement.toLowerCase()),
    ...requirements.requirements
      .filter((r) => r.priority === "OUT_OF_SCOPE")
      .map((r) => `${r.title} ${r.description}`.toLowerCase()),
  ];
  for (const t of graph.tasks ?? []) {
    const blob = `${t.title} ${t.description}`.toLowerCase();
    for (const stmt of oos) {
      if (
        (/\bmobile\b/.test(stmt) && /\bmobile\b/.test(blob)) ||
        (/\bdesktop\b/.test(stmt) && /\bdesktop\b/.test(blob))
      ) {
        push(
          errors,
          "error",
          "OUT_OF_SCOPE_TASK",
          `Task ${t.id} targets out-of-scope work`,
          { task_id: t.id },
        );
      }
    }
  }

  if (SECRET_RE.test(JSON.stringify(graph))) {
    push(errors, "error", "SECRET_MATERIAL", "Task graph contains secret-like material");
  }

  // Requirement coverage
  const coveredReqs = new Set<string>();
  for (const t of graph.tasks ?? []) {
    for (const r of t.requirement_ids ?? []) coveredReqs.add(r);
  }
  for (const j of graph.coverage_justifications ?? []) {
    if (j.requirement_id) coveredReqs.add(j.requirement_id);
  }

  const unmapped_must: string[] = [];
  for (const r of requirements.requirements) {
    if (r.priority !== "MUST" && r.priority !== "MUST_NOT") continue;
    if (r.priority === "OUT_OF_SCOPE") continue;
    if (r.status === "REJECTED" || r.status === "DEFERRED") continue;
    if (!coveredReqs.has(r.id)) {
      unmapped_must.push(r.id);
      push(
        errors,
        "error",
        "UNMAPPED_MUST_REQUIREMENT",
        `MUST requirement ${r.id} has no task`,
        { requirement_id: r.id },
      );
    }
  }

  // Architecture coverage — relevant PROPOSED components
  const coveredCmp = new Set<string>();
  for (const t of graph.tasks ?? []) {
    for (const c of t.architecture_component_ids ?? []) coveredCmp.add(c);
  }
  for (const j of graph.coverage_justifications ?? []) {
    if (j.component_id) coveredCmp.add(j.component_id);
  }

  const unimplemented_components: string[] = [];
  for (const c of architecture.components) {
    if (c.origin === "EXISTING" && (!c.requirement_ids || c.requirement_ids.length === 0)) {
      // existing without change — justify or skip
      if (!coveredCmp.has(c.id)) {
        // allow if justification present later; otherwise warning if no change needed
        const justified = (graph.coverage_justifications ?? []).some(
          (j) => j.component_id === c.id && j.reason === "existing-no-change",
        );
        if (!justified) {
          // Auto-ok EXISTING with no pending reqs as warning only if we add justification in extract
          push(
            warnings,
            "warning",
            "UNIMPLEMENTED_COMPONENT",
            `Existing component ${c.id} has no task/justification`,
            { component_id: c.id },
          );
        }
      }
      continue;
    }
    if (c.origin === "EXISTING") {
      // modification expected if has requirements
      if ((c.requirement_ids?.length ?? 0) > 0 && !coveredCmp.has(c.id)) {
        unimplemented_components.push(c.id);
        push(
          errors,
          "error",
          "UNIMPLEMENTED_COMPONENT",
          `Existing component ${c.id} needs modification tasks`,
          { component_id: c.id },
        );
      }
      continue;
    }
    if (!coveredCmp.has(c.id)) {
      unimplemented_components.push(c.id);
      push(
        errors,
        "error",
        "UNIMPLEMENTED_COMPONENT",
        `Proposed component ${c.id} has no implementing task`,
        { component_id: c.id },
      );
    }
  }

  // Under-decomposition: few tasks vs many components
  const proposedCount = architecture.components.filter((c) => c.origin === "PROPOSED").length;
  if ((graph.tasks?.length ?? 0) === 1 && proposedCount >= 4) {
    push(errors, "error", "UNDER_DECOMPOSED", "Single task for many architecture components");
  }

  // Over-decomposition heuristic
  if ((graph.tasks?.length ?? 0) > 0) {
    const trivial = graph.tasks.filter(isTrivialTask).length;
    if (trivial >= 4 && trivial / graph.tasks.length >= 0.5) {
      push(errors, "error", "OVER_DECOMPOSED", "Majority of tasks are trivially fine-grained");
    }
  }

  const health = computeTaskGraphHealth(errors, warnings, options.allow_warnings_as_ready !== false);
  const ok = health === "READY" || health === "READY_WITH_WARNINGS";

  return {
    ok,
    health,
    errors,
    warnings,
    unmapped_must,
    unimplemented_components,
  };
}

export function computeTaskGraphHealth(
  errors: TaskGraphValidationIssue[],
  warnings: TaskGraphValidationIssue[],
  allowWarnings = true,
): TaskGraphHealth {
  if (errors.length > 0) {
    const onlyBlockingCoverage = errors.every(
      (e) =>
        e.code === "UNMAPPED_MUST_REQUIREMENT" ||
        e.code === "UNIMPLEMENTED_COMPONENT" ||
        e.code === "TASK_SCOPE_CONFLICT",
    );
    if (onlyBlockingCoverage) return "BLOCKED";
    return "INVALID";
  }
  if (warnings.length > 0) return allowWarnings ? "READY_WITH_WARNINGS" : "BLOCKED";
  return "READY";
}

export function taskGraphGateAllowsExecution(result: TaskGraphValidationResult): boolean {
  return result.health === "READY" || result.health === "READY_WITH_WARNINGS";
}

/** Future IR mapping — does not produce CapabilityIR */
export function toIrMappingHints(graph: EngineeringTaskGraph): import("./types.js").TaskToIrMappingHint[] {
  return graph.tasks.map((t) => ({
    task_id: t.id,
    capabilities: t.required_capabilities,
    dependencies: t.dependencies.map((d) => d.task_id),
    definition_of_done: t.definition_of_done,
    scope: t.scope,
    requirement_ids: t.requirement_ids,
  }));
}
