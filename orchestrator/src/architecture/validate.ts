/**
 * Deterministic ArchitectureValidator — no LLM.
 */

import type { RequirementsSpec } from "../requirements/types.js";
import type {
  ArchitectureComponent,
  ArchitectureExtractionInput,
  ArchitectureReadiness,
  ArchitectureSpec,
  ArchitectureValidationIssue,
  ArchitectureValidationResult,
} from "./types.js";

const CMP_RE = /^CMP-\d{3,}$/;
const IF_RE = /^IF-\d{3,}$/;
const DEC_RE = /^ADR-\d{3,}$/;
const TECH_RE = /^TECH-\d{3,}$/;
const SECRET_RE =
  /(password\s*=\s*\S+|api[_-]?key\s*=\s*\S+|secret\s*=\s*\S+|bearer\s+[a-z0-9._-]{8,}|sk-[a-z0-9]{10,}|private[_-]?key\s*=\s*\S+)/i;

const HEAVY_TECH =
  /\b(redis|kafka|kubernetes|k8s|service\s*mesh|microservices?|graphql|mongodb|elasticsearch)\b/i;

function push(
  list: ArchitectureValidationIssue[],
  severity: "error" | "warning",
  code: string,
  message: string,
  extra?: Partial<ArchitectureValidationIssue>,
): void {
  list.push({ code, message, severity, ...extra });
}

function findCycles(components: ArchitectureComponent[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const c of components) {
    graph.set(c.id, c.dependencies ?? []);
  }
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

function blobHasSecrets(spec: ArchitectureSpec): string[] {
  const hits: string[] = [];
  const text = JSON.stringify(spec);
  if (SECRET_RE.test(text)) hits.push("ArchitectureSpec contains secret-like material");
  return hits;
}

function constraintDb(reqs: RequirementsSpec): string | null {
  const corpus = [
    ...reqs.constraints.map((c) => c.statement),
    ...reqs.requirements
      .filter((r) => r.type === "TECHNICAL_CONSTRAINT" || r.type === "CONSTRAINT")
      .map((r) => `${r.title} ${r.description}`),
  ]
    .join("\n")
    .toLowerCase();
  if (/\bpostgres(ql)?\b/.test(corpus)) return "postgresql";
  if (/\bsqlite\b/.test(corpus)) return "sqlite";
  if (/\bmysql\b/.test(corpus)) return "mysql";
  return null;
}

function archDatabases(spec: ArchitectureSpec): string[] {
  const corpus = [
    ...spec.technology_choices.map((t) => t.name),
    spec.data_model?.persistence ?? "",
    ...spec.components.flatMap((c) => c.technology ?? []),
    ...spec.decisions.map((d) => `${d.chosen} ${d.statement}`),
    spec.deployment?.model ?? "",
  ]
    .join("\n")
    .toLowerCase();
  const found: string[] = [];
  if (/\bpostgres(ql)?\b/.test(corpus)) found.push("postgresql");
  if (/\bsqlite\b/.test(corpus)) found.push("sqlite");
  if (/\bmysql\b/.test(corpus)) found.push("mysql");
  return [...new Set(found)];
}

function outOfScopeStatements(reqs: RequirementsSpec): string[] {
  return [
    ...reqs.out_of_scope.map((o) => o.statement.toLowerCase()),
    ...reqs.requirements
      .filter((r) => r.priority === "OUT_OF_SCOPE")
      .map((r) => `${r.title} ${r.description}`.toLowerCase()),
  ];
}

export function validateArchitectureSpec(
  spec: ArchitectureSpec,
  requirements: RequirementsSpec,
  options: Pick<ArchitectureExtractionInput, "allow_cycles" | "allow_assumptions"> = {},
): ArchitectureValidationResult {
  const errors: ArchitectureValidationIssue[] = [];
  const warnings: ArchitectureValidationIssue[] = [];

  if (spec.kind !== "ArchitectureSpec") {
    push(errors, "error", "SCHEMA", "kind must be ArchitectureSpec");
  }
  if (spec.apiVersion !== "evolveloop.io/se/v1") {
    push(errors, "error", "SCHEMA", "apiVersion must be evolveloop.io/se/v1");
  }
  if (!spec.architecture_id?.trim()) {
    push(errors, "error", "SCHEMA", "architecture_id is required");
  }
  if (!Number.isInteger(spec.version) || spec.version < 1) {
    push(errors, "error", "SCHEMA", "version must be integer >= 1");
  }
  if (!spec.requirements_reference?.requirements_id || !spec.requirements_reference.requirements_version) {
    push(errors, "error", "MISSING_REQUIREMENTS_REFERENCE", "requirements_reference is mandatory");
  } else {
    if (spec.requirements_reference.requirements_id !== requirements.requirements_id) {
      push(
        errors,
        "error",
        "REQUIREMENTS_BINDING_MISMATCH",
        `Architecture binds ${spec.requirements_reference.requirements_id} but got ${requirements.requirements_id}`,
      );
    }
    if (spec.requirements_reference.requirements_version !== requirements.version) {
      push(
        errors,
        "error",
        "REQUIREMENTS_BINDING_MISMATCH",
        `Architecture binds v${spec.requirements_reference.requirements_version} but requirements are v${requirements.version}`,
      );
    }
  }

  const cmpIds = new Set<string>();
  for (const c of spec.components ?? []) {
    if (!CMP_RE.test(c.id)) {
      push(errors, "error", "IDENTITY", `Invalid component id: ${c.id}`, { component_id: c.id });
    }
    if (cmpIds.has(c.id)) {
      push(errors, "error", "ID_COLLISION", `Duplicate component id: ${c.id}`, { component_id: c.id });
    }
    cmpIds.add(c.id);
    if (!c.responsibility?.trim() || /handles everything/i.test(c.responsibility)) {
      push(
        errors,
        "error",
        "GOD_COMPONENT",
        `Component ${c.id} lacks a clear responsibility boundary`,
        { component_id: c.id },
      );
    }
    for (const dep of c.dependencies ?? []) {
      if (dep === c.id) {
        push(errors, "error", "SELF_DEPENDENCY", `${c.id} depends on itself`, { component_id: c.id });
      }
      if (!cmpIds.has(dep) && !(spec.components ?? []).some((x) => x.id === dep)) {
        // checked after full set
      }
    }
    if (
      (!c.requirement_ids || c.requirement_ids.length === 0) &&
      c.origin === "PROPOSED" &&
      !c.interfaces?.length
    ) {
      push(
        warnings,
        "warning",
        "ORPHAN_COMPONENT",
        `Component ${c.id} has weak linkage (no requirements / interfaces)`,
        { component_id: c.id },
      );
    }
  }

  for (const c of spec.components ?? []) {
    for (const dep of c.dependencies ?? []) {
      if (!cmpIds.has(dep)) {
        push(
          errors,
          "error",
          "UNKNOWN_COMPONENT_DEPENDENCY",
          `${c.id} depends on unknown ${dep}`,
          { component_id: c.id },
        );
      }
    }
  }

  const ifIds = new Set<string>();
  for (const iface of spec.interfaces ?? []) {
    if (!IF_RE.test(iface.interface_id)) {
      push(errors, "error", "IDENTITY", `Invalid interface id: ${iface.interface_id}`, {
        interface_id: iface.interface_id,
      });
    }
    if (ifIds.has(iface.interface_id)) {
      push(errors, "error", "ID_COLLISION", `Duplicate interface id: ${iface.interface_id}`, {
        interface_id: iface.interface_id,
      });
    }
    ifIds.add(iface.interface_id);
    if (!cmpIds.has(iface.provider) || !cmpIds.has(iface.consumer)) {
      push(
        errors,
        "error",
        "UNKNOWN_INTERFACE_ENDPOINT",
        `Interface ${iface.interface_id} references unknown provider/consumer`,
        { interface_id: iface.interface_id },
      );
    }
  }

  const decIds = new Set<string>();
  for (const d of spec.decisions ?? []) {
    if (!DEC_RE.test(d.decision_id)) {
      push(errors, "error", "IDENTITY", `Invalid decision id: ${d.decision_id}`);
    }
    if (decIds.has(d.decision_id)) {
      push(errors, "error", "ID_COLLISION", `Duplicate decision id: ${d.decision_id}`);
    }
    decIds.add(d.decision_id);
  }

  if (!options.allow_cycles) {
    const cycles = findCycles(spec.components ?? []);
    for (const cy of cycles) {
      push(
        errors,
        "error",
        "DEPENDENCY_CYCLE",
        `Dependency cycle: ${cy.join(" → ")}`,
      );
    }
  }

  // Unmapped MUST requirements
  const covered = new Set<string>();
  for (const t of spec.traceability ?? []) {
    covered.add(t.requirement_id);
    for (const cid of t.component_ids ?? []) covered.add(cid);
  }
  for (const c of spec.components ?? []) {
    for (const rid of c.requirement_ids ?? []) covered.add(rid);
  }
  for (const d of spec.decisions ?? []) {
    for (const rid of d.requirement_ids ?? []) covered.add(rid);
  }
  for (const n of spec.nfr_responses ?? []) {
    if (n.requirement_id) covered.add(n.requirement_id);
  }

  const unmapped_must: string[] = [];
  for (const r of requirements.requirements) {
    if (r.priority !== "MUST" && r.priority !== "MUST_NOT") continue;
    if (r.priority === "OUT_OF_SCOPE") continue;
    if (r.status === "REJECTED" || r.status === "DEFERRED") continue;
    if (!covered.has(r.id)) {
      unmapped_must.push(r.id);
      push(
        errors,
        "error",
        "UNMAPPED_REQUIREMENT",
        `MUST requirement ${r.id} has no architectural response`,
        { requirement_id: r.id },
      );
    }
  }

  // Out-of-scope compliance
  const oos = outOfScopeStatements(requirements);
  for (const c of spec.components ?? []) {
    const name = `${c.name} ${c.responsibility}`.toLowerCase();
    for (const stmt of oos) {
      if (
        (/\bmobile\b/.test(stmt) && /\bmobile\b/.test(name)) ||
        (/\bdesktop\b/.test(stmt) && /\bdesktop\b/.test(name))
      ) {
        push(
          errors,
          "error",
          "ARCHITECTURE_SCOPE_VIOLATION",
          `Component ${c.id} introduces out-of-scope capability: ${c.name}`,
          { component_id: c.id },
        );
      }
    }
  }

  // Stack constraint vs architecture
  const reqDb = constraintDb(requirements);
  const archDbs = archDatabases(spec);
  if (reqDb && archDbs.length > 0 && !archDbs.includes(reqDb)) {
    push(
      errors,
      "error",
      "ARCHITECTURE_CONSTRAINT_VIOLATION",
      `Requirements require ${reqDb} but architecture uses ${archDbs.join(",")}`,
    );
  } else if (reqDb && archDbs.some((d) => d !== reqDb)) {
    push(
      errors,
      "error",
      "ARCHITECTURE_CONSTRAINT_VIOLATION",
      `Requirements require ${reqDb} but architecture also uses ${archDbs.filter((d) => d !== reqDb).join(",")}`,
    );
  }

  // Node.js constraint example
  const reqCorpus = [
    ...requirements.constraints.map((c) => c.statement),
    ...requirements.requirements.map((r) => `${r.title} ${r.description}`),
  ]
    .join("\n")
    .toLowerCase();
  const archCorpus = JSON.stringify(spec).toLowerCase();
  if (/\bnode(\.js)?\b/.test(reqCorpus) && /\bpython\b/.test(archCorpus) && !/\bnode(\.js)?\b/.test(archCorpus)) {
    push(
      errors,
      "error",
      "ARCHITECTURE_CONSTRAINT_VIOLATION",
      "Requirements require Node.js but architecture proposes Python-only backend",
    );
  }

  // REST vs GraphQL contradiction
  const wantsRest =
    /\brest\b/.test(reqCorpus) ||
    spec.interfaces.some((i) => /rest/i.test(i.protocol)) ||
    spec.technology_choices.some((t) => /rest/i.test(t.name));
  const wantsGql =
    spec.interfaces.some((i) => /graphql/i.test(i.protocol)) ||
    spec.technology_choices.some((t) => /graphql/i.test(t.name));
  if (wantsRest && wantsGql && /\brest\b/.test(reqCorpus) && !/\bgraphql\b/.test(reqCorpus)) {
    push(
      errors,
      "error",
      "ARCHITECTURE_CONFLICT",
      "Requirements specify REST but architecture introduces GraphQL without requirement basis",
    );
  }

  // Unjustified heavy tech
  for (const t of spec.technology_choices ?? []) {
    if (!t.justified && HEAVY_TECH.test(t.name)) {
      push(
        errors,
        "error",
        "UNJUSTIFIED_TECHNOLOGY",
        `Technology ${t.name} lacks documented justification`,
      );
    } else if (!t.justified && t.kind === "ARCHITECTURAL_PROPOSAL") {
      push(
        warnings,
        "warning",
        "UNJUSTIFIED_TECHNOLOGY",
        `Technology ${t.name} proposal not clearly justified`,
      );
    }
    if (!TECH_RE.test(t.technology_id)) {
      push(errors, "error", "IDENTITY", `Invalid technology_id: ${t.technology_id}`);
    }
  }

  // Under-architecture: single god component with many MUST reqs
  const mustCount = requirements.requirements.filter(
    (r) => r.priority === "MUST" || r.priority === "MUST_NOT",
  ).length;
  if ((spec.components?.length ?? 0) === 1 && mustCount >= 4) {
    push(
      warnings,
      "warning",
      "UNDER_ARCHITECTURE",
      "Single component for many MUST requirements — consider clearer boundaries",
    );
  }

  // Policy hostility in architecture text
  if (
    /\bunrestricted (filesystem|shell|network)\b/i.test(archCorpus) ||
    /\bdisable (security|evidence|gates?|authentication)\b/i.test(archCorpus)
  ) {
    push(
      errors,
      "error",
      "POLICY_BOUNDARY",
      "Architecture attempts to relax runtime policy (A03/B01/B04)",
    );
  }

  for (const hit of blobHasSecrets(spec)) {
    push(errors, "error", "SECRET_MATERIAL", hit);
  }

  // Security: auth requirements need security response
  const needsAuth = requirements.requirements.some(
    (r) =>
      (r.priority === "MUST" || r.priority === "MUST_NOT") &&
      /auth/i.test(`${r.title} ${r.description}`),
  );
  if (needsAuth && !spec.security?.authentication && !spec.components.some((c) => /auth/i.test(c.name))) {
    push(
      errors,
      "error",
      "SECURITY_BOUNDARY_MISSING",
      "Authentication requirements lack security architecture response",
    );
  }

  const blockingQs = (spec.open_questions ?? []).filter((q) => q.priority === "BLOCKING");
  if (blockingQs.length > 0) {
    // readiness BLOCKED unless assumptions explicitly cover and policy allows — still BLOCKED by default
  }

  const readiness = computeArchitectureReadiness(spec, errors, blockingQs.length > 0, options.allow_assumptions);
  const ok =
    errors.length === 0 &&
    (readiness === "READY" || readiness === "READY_WITH_ASSUMPTIONS");

  return { ok, readiness, errors, warnings, unmapped_must };
}

export function computeArchitectureReadiness(
  spec: ArchitectureSpec,
  errors: ArchitectureValidationIssue[],
  hasBlockingQuestions: boolean,
  allowAssumptions = true,
): ArchitectureReadiness {
  if (errors.length > 0) return "INVALID";
  if (hasBlockingQuestions) return "BLOCKED";
  if ((spec.assumptions?.length ?? 0) > 0) {
    return allowAssumptions ? "READY_WITH_ASSUMPTIONS" : "BLOCKED";
  }
  return "READY";
}

export function architectureGateAllowsTaskDecomposition(
  result: ArchitectureValidationResult,
  policyAllowWithAssumptions = true,
): boolean {
  if (result.readiness === "READY") return result.errors.length === 0;
  if (result.readiness === "READY_WITH_ASSUMPTIONS") return policyAllowWithAssumptions;
  return false;
}
