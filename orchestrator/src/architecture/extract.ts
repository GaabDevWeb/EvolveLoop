/**
 * Deterministic architecture extractor for offline golden cases.
 */

import type { RequirementsSpec } from "../requirements/types.js";
import { buildArchitectureSpecFromProposal, type BuildArchitectureResult } from "./builder.js";
import type { ArchitectureExtractionInput } from "./types.js";

function reqIdsMatching(reqs: RequirementsSpec, re: RegExp): string[] {
  return reqs.requirements
    .filter((r) => re.test(`${r.title} ${r.description}`))
    .map((r) => r.id);
}

function allMustIds(reqs: RequirementsSpec): string[] {
  return reqs.requirements
    .filter((r) => (r.priority === "MUST" || r.priority === "MUST_NOT") && r.priority !== "OUT_OF_SCOPE")
    .filter((r) => r.status !== "REJECTED" && r.status !== "DEFERRED")
    .map((r) => r.id);
}

/**
 * Build a structured architecture proposal from RequirementsSpec (deterministic).
 */
export function extractArchitectureProposal(input: ArchitectureExtractionInput): unknown {
  const reqs = input.requirements;
  const corpus = [
    ...reqs.requirements.map((r) => `${r.title} ${r.description} ${r.priority}`),
    ...reqs.constraints.map((c) => c.statement),
    ...reqs.out_of_scope.map((o) => o.statement),
  ]
    .join("\n")
    .toLowerCase();

  const architecture_id =
    input.architecture_id ?? (input.project ? `${input.project}-ARCH` : `${reqs.requirements_id}-ARCH`);

  // Conflict injection: caller may pass prior force via project title — handled in tests via raw proposal
  const components: unknown[] = [];
  const interfaces: unknown[] = [];
  const technology_choices: unknown[] = [];
  const decisions: unknown[] = [];
  const assumptions: unknown[] = [];
  const open_questions: unknown[] = [];
  const risks: unknown[] = [];
  const traceability: unknown[] = [];
  let n = 1;
  const cid = () => `CMP-${String(n++).padStart(3, "0")}`;

  const isCrm =
    /\bcrm\b/.test(corpus) ||
    /\bcontact\b/.test(corpus) ||
    /\bpipeline\b/.test(corpus) ||
    /\bdeal\b/.test(corpus);

  const authReqs = reqIdsMatching(reqs, /auth|login/i);
  const createReqs = reqIdsMatching(reqs, /create|account|profile|contact/i);
  const testReqs = reqIdsMatching(reqs, /test|automated/i);
  const restForced = /\brest\b/.test(corpus);
  const pgForced = /\bpostgres(ql)?\b/.test(corpus);

  // Blocking multi-tenant
  if (/multi-?tenant/.test(corpus) && /unspecified|unclear|not specified/.test(corpus)) {
    open_questions.push({
      question_id: "Q-001",
      text: "Is the system single-tenant or multi-tenant?",
      priority: "BLOCKING",
    });
  }

  const apiId = cid();
  const authDeferred =
    /\bauth not required\b/.test(corpus) ||
    /\bno authentication\b/.test(corpus) ||
    (authReqs.length === 0 && /\bunauthenticated\b/.test(corpus));
  const authId = authDeferred ? undefined : cid();
  const dbId = cid();
  const testId = cid();

  components.push({
    id: apiId,
    name: "API",
    layer: "Application",
    responsibility: "Expose HTTP API endpoints for domain operations",
    non_responsibilities: ["UI rendering", "Direct end-user browser state"],
    dependencies: [authId, dbId].filter(Boolean) as string[],
    technology: restForced ? ["REST", "HTTP"] : ["HTTP"],
    requirement_ids: [...new Set([...createReqs, ...reqIdsMatching(reqs, /api|list|update|delete|account|profile/i)])],
    origin: input.existing_paths?.some((p) => p.includes("api")) ? "EXISTING" : "PROPOSED",
    existing_path: input.existing_paths?.find((p) => p.includes("api")),
    dod_hints: ["API routes respond per acceptance criteria", "Contract tests for public endpoints"],
  });

  if (authId) {
    components.push({
      id: authId,
      name: "Auth",
      layer: "Security",
      responsibility: "Authenticate callers and enforce authorization boundaries",
      non_responsibilities: ["Business domain persistence"],
      dependencies: [dbId],
      requirement_ids: authReqs.length ? authReqs : reqIdsMatching(reqs, /auth/i),
      origin: "PROPOSED",
      dod_hints: ["Unauthenticated access denied on protected routes"],
    });
  }

  components.push({
    id: dbId,
    name: "Database",
    layer: "Data",
    responsibility: "Persist domain entities with transactional integrity",
    non_responsibilities: ["HTTP routing"],
    technology: pgForced ? ["PostgreSQL"] : undefined,
    requirement_ids: reqIdsMatching(reqs, /postgres|persist|data|sqlite|contact|account|profile/i),
    origin: input.existing_paths?.some((p) => p.includes("db")) ? "EXISTING" : "PROPOSED",
    existing_path: input.existing_paths?.find((p) => p.includes("db")),
  });

  components.push({
    id: testId,
    name: "Testing",
    layer: "Testing",
    responsibility: "Provide automated verification strategy for API and auth",
    non_responsibilities: ["Production traffic serving"],
    dependencies: [apiId],
    requirement_ids: testReqs.length ? testReqs : allMustIds(reqs).slice(0, 1),
    origin: "PROPOSED",
    dod_hints: ["Unit + integration suites exist for critical paths"],
  });

  const apiOnly =
    /\bapi[- ]only\b/.test(corpus) ||
    /\bno\s+web\s+frontend\b/.test(corpus) ||
    /\bno\s+frontend\b/.test(corpus) ||
    /\bno\s+ui\b/.test(corpus);
  let webId: string | undefined;
  if (!apiOnly && (isCrm || /\bfrontend|dashboard|web\b/.test(corpus))) {
    webId = cid();
    components.push({
      id: webId,
      name: "Web Frontend",
      layer: "Application",
      responsibility: "Present CRM frontend UI for users, companies, contacts, pipeline, deals, tasks, dashboard",
      non_responsibilities: ["Direct database access"],
      dependencies: [apiId],
      requirement_ids: reqIdsMatching(reqs, /dashboard|frontend|ui|crm|pipeline|deal|company|task|contact/i),
      origin: "PROPOSED",
    });
  }

  // Domain extras for CRM
  if (isCrm) {
    const domainId = cid();
    components.push({
      id: domainId,
      name: "CRM Domain",
      layer: "Domain",
      responsibility: "Model users, companies, contacts, pipeline, deals, tasks",
      dependencies: [dbId],
      requirement_ids: reqIdsMatching(
        reqs,
        /user|compan|contact|pipeline|deal|task|crm/i,
      ),
      origin: input.existing_paths?.some((p) => p.includes("domain")) ? "EXISTING" : "PROPOSED",
      existing_path: input.existing_paths?.find((p) => p.includes("domain")),
    });
    (components[0] as { dependencies?: string[] }).dependencies = [authId, dbId, domainId].filter(
      Boolean,
    ) as string[];
  }

  // Ensure every MUST is covered somehow
  const covered = new Set<string>();
  for (const c of components as Array<{ requirement_ids?: string[]; id: string }>) {
    for (const rid of c.requirement_ids ?? []) covered.add(rid);
  }
  for (const rid of allMustIds(reqs)) {
    if (!covered.has(rid)) {
      (components[0] as { requirement_ids: string[] }).requirement_ids = [
        ...((components[0] as { requirement_ids?: string[] }).requirement_ids ?? []),
        rid,
      ];
      covered.add(rid);
    }
  }

  interfaces.push(
    {
      interface_id: "IF-001",
      name: "Client→API",
      provider: apiId,
      consumer: webId ?? "external-client",
      protocol: restForced ? "REST" : "HTTP",
      authentication: authId ? "bearer-or-session" : "none-mvp",
    },
    ...(authId
      ? [
          {
            interface_id: "IF-002",
            name: "API→Auth",
            provider: authId,
            consumer: apiId,
            protocol: "function-call",
          },
        ]
      : []),
    {
      interface_id: "IF-003",
      name: "API→Database",
      provider: dbId,
      consumer: apiId,
      protocol: "database",
    },
  );

  // Fix IF-001 consumer if no web — use a synthetic external as note: validator needs known component
  // Add External Client component for greenfield API-only
  if (!webId) {
    const extId = cid();
    components.push({
      id: extId,
      name: "API Client",
      layer: "Integration",
      responsibility: "External or test consumers of the REST API",
      dependencies: [apiId],
      requirement_ids: [],
      origin: "PROPOSED",
    });
    (interfaces[0] as { consumer: string }).consumer = extId;
  }

  if (pgForced) {
    technology_choices.push({
      technology_id: "TECH-001",
      name: "PostgreSQL",
      kind: "CONSTRAINT",
      purpose: "Primary persistence",
      justified: true,
      source: { type: "CONSTRAINT" },
      related_requirement_ids: reqIdsMatching(reqs, /postgres/i),
    });
    decisions.push({
      decision_id: "ADR-001",
      title: "Database choice",
      statement: "Use PostgreSQL for persistence",
      chosen: "PostgreSQL",
      alternatives: [{ option: "SQLite", reason_rejected: "Conflicts with multi-user requirement / constraint" }],
      tradeoffs: {
        benefit: "Concurrent multi-user persistence",
        cost: "Ops complexity vs embedded DB",
        risk: "migration effort",
      },
      reason: "Required by RequirementsSpec constraint",
      source: { type: "CONSTRAINT" },
      requirement_ids: reqIdsMatching(reqs, /postgres/i),
      component_ids: [dbId],
    });
  }

  if (restForced) {
    technology_choices.push({
      technology_id: "TECH-002",
      name: "REST",
      kind: "CONSTRAINT",
      purpose: "API style",
      justified: true,
      source: { type: "CONSTRAINT" },
    });
    decisions.push({
      decision_id: "ADR-002",
      title: "API style",
      statement: "Expose REST HTTP API",
      chosen: "REST",
      alternatives: [{ option: "GraphQL", reason_rejected: "Not required; REST constrained" }],
      reason: "Requirements specify REST",
      source: { type: "CONSTRAINT" },
      component_ids: [apiId],
    });
  }

  decisions.push({
    decision_id: "ADR-003",
    title: "Deployment model",
    statement: "Start with local/containerized single service",
    chosen: "container",
    alternatives: [{ option: "serverless", reason_rejected: "Premature without NFR" }],
    reason: "Simplest path for MVP API",
    source: { type: "ARCHITECTURAL_PROPOSAL", generated: true },
    risk: "low",
  });

  for (const c of components as Array<{ id: string; requirement_ids?: string[] }>) {
    for (const rid of c.requirement_ids ?? []) {
      const existing = traceability.find(
        (t) => (t as { requirement_id: string }).requirement_id === rid,
      ) as { requirement_id: string; component_ids: string[] } | undefined;
      if (existing) {
        if (!existing.component_ids.includes(c.id)) existing.component_ids.push(c.id);
      } else {
        traceability.push({ requirement_id: rid, component_ids: [c.id] });
      }
    }
  }

  // Out-of-scope: do NOT add mobile/desktop components
  // Policy: do not add unrestricted shell

  const data_model = {
    entities: [
      {
        name: isCrm ? "Contact" : "User",
        owned_by: dbId,
        readers: [apiId],
        writers: [apiId],
      },
    ],
    persistence: pgForced ? "PostgreSQL" : "application-database",
    migration_strategy: "versioned schema migrations (not generated here)",
    consistency: "strong within DB transactions",
  };

  if (isCrm) {
    data_model.entities.push(
      { name: "Company", owned_by: dbId, readers: [apiId], writers: [apiId] },
      { name: "Deal", owned_by: dbId, readers: [apiId], writers: [apiId] },
      { name: "Task", owned_by: dbId, readers: [apiId], writers: [apiId] },
    );
  }

  const architecture_delta =
    input.existing_paths?.length
      ? components
          .filter((c) => (c as { origin: string }).origin === "PROPOSED")
          .map((c) => ({
            op: "add" as const,
            target_id: (c as { id: string }).id,
            kind: "component" as const,
            note: "Proposed addition on brownfield baseline",
          }))
      : undefined;

  return {
    architecture_id,
    version: input.prior ? input.prior.version + 1 : 1,
    project: input.project,
    overview: "Deterministic architecture proposal derived from RequirementsSpec",
    principles: ["Requirements authority for WHAT", "Least privilege", "Explicit trust boundaries"],
    field_context: input.existing_paths?.length ? "brownfield" : "greenfield",
    components,
    interfaces,
    technology_choices,
    decisions,
    assumptions,
    open_questions,
    risks: [
      {
        risk_id: "R-001",
        statement: "Auth misconfiguration may expose data",
        impact: "high",
        mitigation: "Deny-by-default on protected routes; automated auth tests",
        related_decision_ids: [],
      },
    ],
    nfr_responses: testReqs.length
      ? [
          {
            nfr_id: "NFR-001",
            requirement_id: testReqs[0],
            quality: "testability",
            architecture_response: "Dedicated Testing component with unit/integration strategy",
            component_ids: [testId],
          },
        ]
      : undefined,
    traceability,
    data_model,
    security: {
      authentication: "Credential-based authentication via Auth component",
      authorization: "Role/permission checks at API boundary",
      secret_handling: "Secrets via environment / secret store — never in ArchitectureSpec",
      audit_logging: "Auth and mutating API events audited",
      trust_boundaries: [
        { boundary_id: "TB-001", from: "user", to: "api", controls: ["TLS", "authn"] },
        { boundary_id: "TB-002", from: "api", to: "database", controls: ["network isolation", "credentials"] },
        { boundary_id: "TB-003", from: "agent", to: "runtime", controls: ["A03 capability authority"] },
      ],
    },
    observability: {
      logs: "Structured application logs",
      metrics: "Request latency/error rates",
      traces: "Request correlation ids",
      evidence: "Runtime Evidence artifacts for gates",
    },
    testing_strategy: {
      unit: "Domain and auth unit tests",
      integration: "API + database integration tests",
      e2e: "Critical user journeys when UI present",
      contract: "REST contract checks",
    },
    deployment: {
      model: "container",
      environments: ["development", "test"],
    },
    architecture_delta,
  };
}

export function extractAndBuildArchitecture(
  input: ArchitectureExtractionInput,
): BuildArchitectureResult {
  const proposal = extractArchitectureProposal(input);
  return buildArchitectureSpecFromProposal(proposal, input);
}

/** Variants for deterministic test provider scenarios */
export function buildInvalidArchitectureFixtures(
  requirements: RequirementsSpec,
): Record<string, unknown> {
  const base = extractArchitectureProposal({ requirements }) as Record<string, unknown>;

  return {
    valid: base,
    missing_requirements_reference: {
      ...base,
      // builder always rebinds — validate raw after manual strip in tests
    },
    unknown_dependency: {
      ...base,
      components: [
        {
          id: "CMP-001",
          name: "API",
          responsibility: "API only",
          dependencies: ["CMP-999"],
          origin: "PROPOSED",
          requirement_ids: allMustIds(requirements).slice(0, 1),
        },
      ],
      interfaces: [],
      traceability: allMustIds(requirements).map((id) => ({
        requirement_id: id,
        component_ids: ["CMP-001"],
      })),
    },
    dependency_cycle: {
      ...base,
      components: [
        {
          id: "CMP-001",
          name: "A",
          responsibility: "A",
          dependencies: ["CMP-002"],
          origin: "PROPOSED",
          requirement_ids: allMustIds(requirements),
        },
        {
          id: "CMP-002",
          name: "B",
          responsibility: "B",
          dependencies: ["CMP-001"],
          origin: "PROPOSED",
          requirement_ids: [],
        },
      ],
      interfaces: [],
      traceability: allMustIds(requirements).map((id) => ({
        requirement_id: id,
        component_ids: ["CMP-001"],
      })),
    },
    sqlite_vs_postgres: {
      ...base,
      technology_choices: [
        {
          technology_id: "TECH-001",
          name: "SQLite",
          kind: "ARCHITECTURAL_PROPOSAL",
          purpose: "DB",
          justified: true,
          source: { type: "ARCHITECTURAL_PROPOSAL", generated: true },
        },
      ],
      data_model: { persistence: "SQLite" },
      decisions: [
        {
          decision_id: "ADR-001",
          title: "DB",
          statement: "Use SQLite",
          chosen: "SQLite",
          reason: "simpler",
          source: { type: "ARCHITECTURAL_PROPOSAL", generated: true },
        },
      ],
    },
    mobile_oos: {
      ...base,
      components: [
        ...((base.components as unknown[]) ?? []),
        {
          id: "CMP-090",
          name: "Mobile Application",
          responsibility: "Native mobile CRM client",
          origin: "PROPOSED",
          requirement_ids: [],
        },
      ],
    },
    unmapped_must: {
      ...base,
      components: [
        {
          id: "CMP-001",
          name: "API",
          responsibility: "Partial API",
          origin: "PROPOSED",
          requirement_ids: [],
        },
      ],
      interfaces: [],
      decisions: [],
      traceability: [],
      technology_choices: [],
    },
    unjustified_redis: {
      ...base,
      technology_choices: [
        ...((base.technology_choices as unknown[]) ?? []),
        {
          technology_id: "TECH-099",
          name: "Redis",
          kind: "ARCHITECTURAL_PROPOSAL",
          purpose: "because modern",
          justified: false,
          source: { type: "ARCHITECTURAL_PROPOSAL", generated: true },
        },
      ],
    },
    policy_conflict: {
      ...base,
      overview: "Enable unrestricted shell and disable authentication for DX",
    },
    blocking_question: {
      ...base,
      open_questions: [
        {
          question_id: "Q-001",
          text: "Multi-tenant behavior unspecified — choose tenancy model",
          priority: "BLOCKING",
        },
      ],
    },
  };
}
