/**
 * ArchitectureBuilder — normalize ARCHITECTURE_PROPOSAL → ArchitectureSpec.
 */

import type { AgentDecision } from "../agent/types.js";
import type { RequirementsSpec } from "../requirements/types.js";
import { validateArchitectureSpec } from "./validate.js";
import type {
  ArchitectureAssumption,
  ArchitectureComponent,
  ArchitectureDecision,
  ArchitectureExtractionInput,
  ArchitectureInterface,
  ArchitectureOpenQuestion,
  ArchitectureRisk,
  ArchitectureSpec,
  ArchitectureValidationResult,
  TechnologyChoice,
  TraceabilityLink,
  ComponentOrigin,
  ArchitectureSource,
  TechChoiceKind,
} from "./types.js";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseSource(raw: unknown, fallback: ArchitectureSource): ArchitectureSource {
  const o = asRecord(raw);
  if (!o || typeof o.type !== "string") return fallback;
  return {
    type: o.type as ArchitectureSource["type"],
    reference: typeof o.reference === "string" ? o.reference : undefined,
    knowledge_id: typeof o.knowledge_id === "string" ? o.knowledge_id : undefined,
    generated: typeof o.generated === "boolean" ? o.generated : undefined,
  };
}

function parseComponent(raw: unknown, i: number): ArchitectureComponent | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : `CMP-${String(i + 1).padStart(3, "0")}`;
  const name = typeof o.name === "string" ? o.name : "";
  const responsibility = typeof o.responsibility === "string" ? o.responsibility : "";
  if (!name && !responsibility) return null;
  const origin: ComponentOrigin = o.origin === "EXISTING" ? "EXISTING" : "PROPOSED";
  return {
    id,
    name: name || responsibility.slice(0, 40),
    layer: typeof o.layer === "string" ? (o.layer as ArchitectureComponent["layer"]) : undefined,
    responsibility: responsibility || name,
    non_responsibilities: Array.isArray(o.non_responsibilities)
      ? o.non_responsibilities.filter((x): x is string => typeof x === "string")
      : undefined,
    inputs: Array.isArray(o.inputs) ? o.inputs.filter((x): x is string => typeof x === "string") : undefined,
    outputs: Array.isArray(o.outputs) ? o.outputs.filter((x): x is string => typeof x === "string") : undefined,
    dependencies: Array.isArray(o.dependencies)
      ? o.dependencies.filter((x): x is string => typeof x === "string")
      : undefined,
    interfaces: Array.isArray(o.interfaces)
      ? o.interfaces.filter((x): x is string => typeof x === "string")
      : undefined,
    technology: Array.isArray(o.technology)
      ? o.technology.filter((x): x is string => typeof x === "string")
      : undefined,
    requirement_ids: Array.isArray(o.requirement_ids)
      ? o.requirement_ids.filter((x): x is string => typeof x === "string")
      : undefined,
    origin,
    existing_path: typeof o.existing_path === "string" ? o.existing_path : undefined,
    risk: o.risk === "low" || o.risk === "medium" || o.risk === "high" ? o.risk : undefined,
    dod_hints: Array.isArray(o.dod_hints)
      ? o.dod_hints.filter((x): x is string => typeof x === "string")
      : undefined,
  };
}

export interface BuildArchitectureResult {
  spec: ArchitectureSpec;
  validation: ArchitectureValidationResult;
}

export function emptyArchitectureSpec(
  architecture_id: string,
  requirements: RequirementsSpec,
): ArchitectureSpec {
  return {
    kind: "ArchitectureSpec",
    apiVersion: "evolveloop.io/se/v1",
    architecture_id,
    version: 1,
    requirements_reference: {
      requirements_id: requirements.requirements_id,
      requirements_version: requirements.version,
    },
    components: [],
    interfaces: [],
    technology_choices: [],
    decisions: [],
    assumptions: [],
    open_questions: [],
    risks: [],
    traceability: [],
    created_at: nowIso(),
  };
}

export function buildArchitectureSpecFromProposal(
  proposal: unknown,
  input: ArchitectureExtractionInput,
): BuildArchitectureResult {
  const requirements = input.requirements;
  const o = asRecord(proposal) ?? {};
  const nested = asRecord(o.proposed_architecture_spec) ?? asRecord(o.spec) ?? o;

  const architecture_id =
    (typeof nested.architecture_id === "string" && nested.architecture_id) ||
    input.architecture_id ||
    (input.project ? `${input.project}-ARCH` : "ARCH-SPEC");

  const version =
    input.prior != null
      ? input.prior.version + 1
      : typeof nested.version === "number" && nested.version >= 1
        ? nested.version
        : 1;

  const components: ArchitectureComponent[] = [];
  const rawCmps = Array.isArray(nested.components) ? nested.components : [];
  for (let i = 0; i < rawCmps.length; i++) {
    const c = parseComponent(rawCmps[i], i);
    if (c) components.push(c);
  }

  // Mark EXISTING from paths
  if (input.existing_paths?.length) {
    for (const c of components) {
      if (c.existing_path && input.existing_paths.some((p) => c.existing_path!.includes(p) || p.includes(c.existing_path!))) {
        c.origin = "EXISTING";
      }
      if (
        c.origin === "PROPOSED" &&
        input.existing_paths.some((p) => c.name.toLowerCase().includes(p.split("/").pop()!.toLowerCase()))
      ) {
        // leave PROPOSED unless path set
      }
    }
  }

  const interfaces: ArchitectureInterface[] = Array.isArray(nested.interfaces)
    ? nested.interfaces
        .map((raw, i) => {
          const ir = asRecord(raw);
          if (!ir || typeof ir.provider !== "string" || typeof ir.consumer !== "string") return null;
          return {
            interface_id:
              typeof ir.interface_id === "string"
                ? ir.interface_id
                : `IF-${String(i + 1).padStart(3, "0")}`,
            name: typeof ir.name === "string" ? ir.name : undefined,
            provider: ir.provider,
            consumer: ir.consumer,
            protocol: typeof ir.protocol === "string" ? ir.protocol : "HTTP",
            input: typeof ir.input === "string" ? ir.input : undefined,
            output: typeof ir.output === "string" ? ir.output : undefined,
            authentication: typeof ir.authentication === "string" ? ir.authentication : undefined,
            version: typeof ir.version === "string" ? ir.version : undefined,
          } satisfies ArchitectureInterface;
        })
        .filter((x): x is ArchitectureInterface => x != null)
    : [];

  const technology_choices: TechnologyChoice[] = Array.isArray(nested.technology_choices)
    ? nested.technology_choices
        .map((raw, i) => {
          const tr = asRecord(raw);
          if (!tr || typeof tr.name !== "string") return null;
          const kind: TechChoiceKind =
            tr.kind === "CONSTRAINT" ? "CONSTRAINT" : "ARCHITECTURAL_PROPOSAL";
          return {
            technology_id:
              typeof tr.technology_id === "string"
                ? tr.technology_id
                : `TECH-${String(i + 1).padStart(3, "0")}`,
            name: tr.name,
            kind,
            purpose: typeof tr.purpose === "string" ? tr.purpose : tr.name,
            justified: tr.justified === true || kind === "CONSTRAINT",
            source: parseSource(
              tr.source,
              kind === "CONSTRAINT"
                ? { type: "CONSTRAINT" }
                : { type: "ARCHITECTURAL_PROPOSAL", generated: true },
            ),
            related_requirement_ids: Array.isArray(tr.related_requirement_ids)
              ? tr.related_requirement_ids.filter((x): x is string => typeof x === "string")
              : undefined,
          } satisfies TechnologyChoice;
        })
        .filter((x): x is TechnologyChoice => x != null)
    : [];

  const decisions: ArchitectureDecision[] = Array.isArray(nested.decisions)
    ? nested.decisions
        .map((raw, i) => {
          const dr = asRecord(raw);
          if (!dr || typeof dr.statement !== "string") return null;
          return {
            decision_id:
              typeof dr.decision_id === "string"
                ? dr.decision_id
                : `ADR-${String(i + 1).padStart(3, "0")}`,
            title: typeof dr.title === "string" ? dr.title : `Decision ${i + 1}`,
            statement: dr.statement,
            chosen: typeof dr.chosen === "string" ? dr.chosen : dr.statement,
            alternatives: Array.isArray(dr.alternatives)
              ? dr.alternatives
                  .map((a) => {
                    const ar = asRecord(a);
                    if (!ar || typeof ar.option !== "string") return null;
                    return {
                      option: ar.option,
                      reason_rejected:
                        typeof ar.reason_rejected === "string" ? ar.reason_rejected : undefined,
                    };
                  })
                  .filter((x): x is { option: string; reason_rejected?: string } => x != null)
              : undefined,
            tradeoffs: asRecord(dr.tradeoffs)
              ? {
                  benefit: typeof (dr.tradeoffs as Record<string, unknown>).benefit === "string"
                    ? String((dr.tradeoffs as Record<string, unknown>).benefit)
                    : undefined,
                  cost: typeof (dr.tradeoffs as Record<string, unknown>).cost === "string"
                    ? String((dr.tradeoffs as Record<string, unknown>).cost)
                    : undefined,
                  risk: typeof (dr.tradeoffs as Record<string, unknown>).risk === "string"
                    ? String((dr.tradeoffs as Record<string, unknown>).risk)
                    : undefined,
                  consequence:
                    typeof (dr.tradeoffs as Record<string, unknown>).consequence === "string"
                      ? String((dr.tradeoffs as Record<string, unknown>).consequence)
                      : undefined,
                }
              : undefined,
            reason: typeof dr.reason === "string" ? dr.reason : "proposed",
            source: parseSource(dr.source, { type: "ARCHITECTURAL_PROPOSAL", generated: true }),
            requirement_ids: Array.isArray(dr.requirement_ids)
              ? dr.requirement_ids.filter((x): x is string => typeof x === "string")
              : undefined,
            component_ids: Array.isArray(dr.component_ids)
              ? dr.component_ids.filter((x): x is string => typeof x === "string")
              : undefined,
            risk: dr.risk === "low" || dr.risk === "medium" || dr.risk === "high" ? dr.risk : undefined,
            mitigation: typeof dr.mitigation === "string" ? dr.mitigation : undefined,
          } satisfies ArchitectureDecision;
        })
        .filter((x): x is ArchitectureDecision => x != null)
    : [];

  const assumptions: ArchitectureAssumption[] = Array.isArray(nested.assumptions)
    ? nested.assumptions
        .map((raw, i) => {
          const ar = asRecord(raw);
          if (!ar || typeof ar.statement !== "string") return null;
          return {
            assumption_id:
              typeof ar.assumption_id === "string"
                ? ar.assumption_id
                : `A-${String(i + 1).padStart(3, "0")}`,
            statement: ar.statement,
            reason: typeof ar.reason === "string" ? ar.reason : undefined,
            source: parseSource(ar.source, { type: "INFERENCE", generated: true }),
            risk: ar.risk === "low" || ar.risk === "medium" || ar.risk === "high" ? ar.risk : undefined,
            impact: typeof ar.impact === "string" ? ar.impact : undefined,
          } satisfies ArchitectureAssumption;
        })
        .filter((x): x is ArchitectureAssumption => x != null)
    : [];

  const open_questions: ArchitectureOpenQuestion[] = Array.isArray(nested.open_questions)
    ? nested.open_questions
        .map((raw, i) => {
          const qr = asRecord(raw);
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
          } satisfies ArchitectureOpenQuestion;
        })
        .filter((x): x is ArchitectureOpenQuestion => x != null)
    : [];

  const risks: ArchitectureRisk[] = Array.isArray(nested.risks)
    ? nested.risks
        .map((raw, i) => {
          const rr = asRecord(raw);
          if (!rr || typeof rr.statement !== "string") return null;
          return {
            risk_id:
              typeof rr.risk_id === "string" ? rr.risk_id : `R-${String(i + 1).padStart(3, "0")}`,
            statement: rr.statement,
            impact: typeof rr.impact === "string" ? rr.impact : undefined,
            mitigation: typeof rr.mitigation === "string" ? rr.mitigation : undefined,
          } satisfies ArchitectureRisk;
        })
        .filter((x): x is ArchitectureRisk => x != null)
    : [];

  let traceability: TraceabilityLink[] = Array.isArray(nested.traceability)
    ? nested.traceability
        .map((raw) => {
          const tr = asRecord(raw);
          if (!tr || typeof tr.requirement_id !== "string") return null;
          return {
            requirement_id: tr.requirement_id,
            component_ids: Array.isArray(tr.component_ids)
              ? tr.component_ids.filter((x): x is string => typeof x === "string")
              : undefined,
            decision_ids: Array.isArray(tr.decision_ids)
              ? tr.decision_ids.filter((x): x is string => typeof x === "string")
              : undefined,
            interface_ids: Array.isArray(tr.interface_ids)
              ? tr.interface_ids.filter((x): x is string => typeof x === "string")
              : undefined,
          } satisfies TraceabilityLink;
        })
        .filter((x): x is TraceabilityLink => x != null)
    : [];

  // Auto-fill traceability from component requirement_ids if missing
  if (traceability.length === 0) {
    const byReq = new Map<string, TraceabilityLink>();
    for (const c of components) {
      for (const rid of c.requirement_ids ?? []) {
        const link = byReq.get(rid) ?? { requirement_id: rid, component_ids: [] };
        link.component_ids = [...new Set([...(link.component_ids ?? []), c.id])];
        byReq.set(rid, link);
      }
    }
    for (const d of decisions) {
      for (const rid of d.requirement_ids ?? []) {
        const link = byReq.get(rid) ?? { requirement_id: rid, decision_ids: [] };
        link.decision_ids = [...new Set([...(link.decision_ids ?? []), d.decision_id])];
        byReq.set(rid, link);
      }
    }
    traceability = [...byReq.values()];
  }

  const data_model = asRecord(nested.data_model)
    ? {
        entities: Array.isArray((nested.data_model as Record<string, unknown>).entities)
          ? ((nested.data_model as Record<string, unknown>).entities as unknown[])
              .map((e) => {
                const er = asRecord(e);
                if (!er || typeof er.name !== "string" || typeof er.owned_by !== "string") return null;
                return {
                  name: er.name,
                  owned_by: er.owned_by,
                  readers: Array.isArray(er.readers)
                    ? er.readers.filter((x): x is string => typeof x === "string")
                    : undefined,
                  writers: Array.isArray(er.writers)
                    ? er.writers.filter((x): x is string => typeof x === "string")
                    : undefined,
                };
              })
              .filter((x): x is NonNullable<typeof x> => x != null)
          : undefined,
        persistence:
          typeof (nested.data_model as Record<string, unknown>).persistence === "string"
            ? String((nested.data_model as Record<string, unknown>).persistence)
            : undefined,
        migration_strategy:
          typeof (nested.data_model as Record<string, unknown>).migration_strategy === "string"
            ? String((nested.data_model as Record<string, unknown>).migration_strategy)
            : undefined,
        consistency:
          typeof (nested.data_model as Record<string, unknown>).consistency === "string"
            ? String((nested.data_model as Record<string, unknown>).consistency)
            : undefined,
      }
    : undefined;

  const security = asRecord(nested.security)
    ? {
        authentication:
          typeof (nested.security as Record<string, unknown>).authentication === "string"
            ? String((nested.security as Record<string, unknown>).authentication)
            : undefined,
        authorization:
          typeof (nested.security as Record<string, unknown>).authorization === "string"
            ? String((nested.security as Record<string, unknown>).authorization)
            : undefined,
        secret_handling:
          typeof (nested.security as Record<string, unknown>).secret_handling === "string"
            ? String((nested.security as Record<string, unknown>).secret_handling)
            : undefined,
        audit_logging:
          typeof (nested.security as Record<string, unknown>).audit_logging === "string"
            ? String((nested.security as Record<string, unknown>).audit_logging)
            : undefined,
        trust_boundaries: Array.isArray(
          (nested.security as Record<string, unknown>).trust_boundaries,
        )
          ? (
              (nested.security as Record<string, unknown>).trust_boundaries as unknown[]
            )
              .map((b) => {
                const br = asRecord(b);
                if (!br || typeof br.from !== "string" || typeof br.to !== "string") return null;
                return {
                  boundary_id:
                    typeof br.boundary_id === "string" ? br.boundary_id : `TB-${br.from}-${br.to}`,
                  from: br.from,
                  to: br.to,
                  controls: Array.isArray(br.controls)
                    ? br.controls.filter((x): x is string => typeof x === "string")
                    : undefined,
                };
              })
              .filter((x): x is NonNullable<typeof x> => x != null)
          : undefined,
      }
    : undefined;

  const observability = asRecord(nested.observability)
    ? {
        logs:
          typeof (nested.observability as Record<string, unknown>).logs === "string"
            ? String((nested.observability as Record<string, unknown>).logs)
            : undefined,
        metrics:
          typeof (nested.observability as Record<string, unknown>).metrics === "string"
            ? String((nested.observability as Record<string, unknown>).metrics)
            : undefined,
        traces:
          typeof (nested.observability as Record<string, unknown>).traces === "string"
            ? String((nested.observability as Record<string, unknown>).traces)
            : undefined,
        evidence:
          typeof (nested.observability as Record<string, unknown>).evidence === "string"
            ? String((nested.observability as Record<string, unknown>).evidence)
            : undefined,
      }
    : undefined;

  const testing_strategy = asRecord(nested.testing_strategy)
    ? {
        unit:
          typeof (nested.testing_strategy as Record<string, unknown>).unit === "string"
            ? String((nested.testing_strategy as Record<string, unknown>).unit)
            : undefined,
        integration:
          typeof (nested.testing_strategy as Record<string, unknown>).integration === "string"
            ? String((nested.testing_strategy as Record<string, unknown>).integration)
            : undefined,
        e2e:
          typeof (nested.testing_strategy as Record<string, unknown>).e2e === "string"
            ? String((nested.testing_strategy as Record<string, unknown>).e2e)
            : undefined,
        contract:
          typeof (nested.testing_strategy as Record<string, unknown>).contract === "string"
            ? String((nested.testing_strategy as Record<string, unknown>).contract)
            : undefined,
      }
    : undefined;

  const deployment = asRecord(nested.deployment)
    ? {
        model:
          typeof (nested.deployment as Record<string, unknown>).model === "string"
            ? String((nested.deployment as Record<string, unknown>).model)
            : undefined,
        environments: Array.isArray((nested.deployment as Record<string, unknown>).environments)
          ? (
              (nested.deployment as Record<string, unknown>).environments as unknown[]
            ).filter((x): x is string => typeof x === "string")
          : undefined,
      }
    : undefined;

  const feedback = Array.isArray(nested.feedback)
    ? nested.feedback
        .map((raw, i) => {
          const fr = asRecord(raw);
          if (!fr || typeof fr.requirement_id !== "string" || typeof fr.issue !== "string") return null;
          return {
            feedback_id:
              typeof fr.feedback_id === "string"
                ? fr.feedback_id
                : `FB-${String(i + 1).padStart(3, "0")}`,
            requirement_id: fr.requirement_id,
            issue: fr.issue,
            impact: typeof fr.impact === "string" ? fr.impact : undefined,
            proposal: typeof fr.proposal === "string" ? fr.proposal : undefined,
            blocking: typeof fr.blocking === "boolean" ? fr.blocking : undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : undefined;

  const architecture_delta = Array.isArray(nested.architecture_delta)
    ? nested.architecture_delta
        .map((raw) => {
          const dr = asRecord(raw);
          if (!dr || typeof dr.target_id !== "string" || typeof dr.op !== "string") return null;
          return {
            op: dr.op as "add" | "modify" | "remove" | "replace" | "migrate",
            target_id: dr.target_id,
            kind: (typeof dr.kind === "string" ? dr.kind : "component") as
              | "component"
              | "interface"
              | "decision"
              | "technology",
            note: typeof dr.note === "string" ? dr.note : undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : undefined;

  const spec: ArchitectureSpec = {
    kind: "ArchitectureSpec",
    apiVersion: "evolveloop.io/se/v1",
    architecture_id,
    version,
    parent_version: input.prior?.version,
    project: input.project ?? (typeof nested.project === "string" ? nested.project : undefined),
    title: typeof nested.title === "string" ? nested.title : undefined,
    overview: typeof nested.overview === "string" ? nested.overview : undefined,
    principles: Array.isArray(nested.principles)
      ? nested.principles.filter((x): x is string => typeof x === "string")
      : undefined,
    requirements_reference: {
      requirements_id: requirements.requirements_id,
      requirements_version: requirements.version,
    },
    field_context:
      nested.field_context === "brownfield" || input.existing_paths?.length
        ? "brownfield"
        : nested.field_context === "greenfield"
          ? "greenfield"
          : input.existing_paths?.length
            ? "brownfield"
            : "greenfield",
    components,
    interfaces,
    technology_choices,
    decisions,
    assumptions,
    open_questions,
    risks,
    traceability,
    data_model,
    security,
    observability,
    testing_strategy,
    deployment,
    architecture_delta,
    feedback,
    created_at: nowIso(),
  };

  const validation = validateArchitectureSpec(spec, requirements, {
    allow_cycles: input.allow_cycles,
    allow_assumptions: input.allow_assumptions,
  });

  return { spec, validation };
}

export function buildArchitectureFromAgentDecision(
  decision: AgentDecision,
  input: ArchitectureExtractionInput,
): BuildArchitectureResult {
  if (decision.decision_type !== "ARCHITECTURE_PROPOSAL") {
    const empty = emptyArchitectureSpec(
      input.architecture_id ?? "ARCH-SPEC",
      input.requirements,
    );
    empty.open_questions = [
      {
        question_id: "Q-001",
        text: `Expected ARCHITECTURE_PROPOSAL, got ${decision.decision_type}`,
        priority: "BLOCKING",
      },
    ];
    const validation = validateArchitectureSpec(empty, input.requirements, input);
    return { spec: empty, validation };
  }

  const result = buildArchitectureSpecFromProposal(
    { proposed_architecture_spec: decision.proposed_architecture_spec },
    input,
  );
  result.spec.baseline = false;
  delete result.spec.baseline_at;
  result.validation = validateArchitectureSpec(result.spec, input.requirements, {
    allow_cycles: input.allow_cycles,
    allow_assumptions: input.allow_assumptions,
  });
  return result;
}
