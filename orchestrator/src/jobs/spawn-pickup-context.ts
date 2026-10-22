import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExecuteRequest, ProviderManifest } from "../types/index.js";
import type { SkillJob } from "./job-store.js";
import {
  applyContextBudget,
  deriveContextOwnerId,
  sliceFromFile,
  validateSpawnContext,
  rankRetrievalPaths,
  type ContextSlice,
  type ContextBudgetTelemetry,
  type GateBundleFields,
  type ContextRetrievalEntry,
} from "../context/index.js";

export type { ContextRetrievalEntry };
import type { EventBus } from "../events/event-bus.js";
import { emitContextBudgetTelemetry } from "../context/telemetry.js";

export interface PickupContextPrepareResult {
  validation_ok: boolean;
  validation_reason?: string;
  context_owner_id?: string;
  gate_bundle_block: string;
  budgeted_context_block: string;
  telemetry?: ContextBudgetTelemetry;
  evidence_path?: string;
}

function nodeMeta(request: ExecuteRequest): Record<string, unknown> {
  return (request.node.metadata ?? {}) as Record<string, unknown>;
}

export function defaultGateBundleFromRequest(
  _request: ExecuteRequest,
  manifest: ProviderManifest,
  featureId: string,
): GateBundleFields {
  const pdaRole = (manifest.spec as { runtime?: { pda_role?: string } }).runtime?.pda_role ?? "exec";
  const role = ["plan", "exec", "gate", "explore", "critic", "librarian"].includes(pdaRole)
    ? (pdaRole as GateBundleFields["role"])
    : "exec";
  return {
    parent_cycle_id: featureId,
    spawn_depth: 1,
    max_spawn_depth: 3,
    role,
    context_owner_id: deriveContextOwnerId({
      parent_cycle_id: featureId,
      role,
      spawn_depth: 1,
    }),
  };
}

export function extractGateBundleFromRequest(
  request: ExecuteRequest,
  manifest: ProviderManifest,
  featureId: string,
): GateBundleFields {
  const fromMeta = nodeMeta(request).gate_bundle as Partial<GateBundleFields> | undefined;
  if (fromMeta) {
    return { ...defaultGateBundleFromRequest(request, manifest, featureId), ...fromMeta };
  }
  if (request.gate_bundle) {
    return { ...defaultGateBundleFromRequest(request, manifest, featureId), ...request.gate_bundle };
  }
  return defaultGateBundleFromRequest(request, manifest, featureId);
}

export function extractContextRetrievalFromRequest(request: ExecuteRequest): ContextRetrievalEntry[] {
  if (request.context_retrieval?.length) {
    return request.context_retrieval;
  }
  const fromMeta = nodeMeta(request).context_retrieval as ContextRetrievalEntry[] | undefined;
  if (fromMeta?.length) return fromMeta;

  const paths = nodeMeta(request).retrieval_paths as string[] | undefined;
  const root = request.authority_context?.workspaceRoot ?? process.cwd();
  if (!paths?.length) return [];

  const entries: ContextRetrievalEntry[] = [];
  for (const rel of paths) {
    try {
      const content = readFileSync(join(root, rel), "utf-8");
      entries.push({ path: rel, content, kind: "generic", priority: 10 });
    } catch {
      entries.push({ path: rel, content: "", kind: "generic", priority: 1 });
    }
  }
  return entries;
}

export function protectedSlicesFromJob(job: SkillJob): ContextSlice[] {
  const slices: ContextSlice[] = [];
  const dodText = JSON.stringify(job.definition_of_done, null, 2);
  slices.push(
    sliceFromFile(
      "spawn://definition_of_done",
      dodText,
      "acceptance_criteria",
      1000,
    ),
  );

  const secVal = job.spawn_metadata?.security_restrictions as string | undefined;
  if (secVal) {
    slices.push(sliceFromFile("spawn://security_restrictions", secVal, "security_restriction", 1000));
  }

  const evVal = job.spawn_metadata?.evidence_verbatim as string | undefined;
  if (evVal) {
    slices.push(sliceFromFile("spawn://evidence_verbatim", evVal, "evidence", 1000));
  }

  return slices;
}

export function formatGateBundleBlock(bundle: GateBundleFields): string {
  return `### GATE_BUNDLE
parent_cycle_id: ${bundle.parent_cycle_id}
spawn_depth: ${bundle.spawn_depth}
max_spawn_depth: ${bundle.max_spawn_depth}
role: ${bundle.role}
context_owner_id: ${bundle.context_owner_id ?? deriveContextOwnerId(bundle)}
context_budget: ${JSON.stringify(bundle.context_budget ?? {})}
`;
}

export function persistContextBudgetEvidence(
  jobsDir: string,
  featureId: string,
  runId: string,
  telemetry: ContextBudgetTelemetry,
): string {
  const evidenceDir = join(jobsDir, "evidence");
  mkdirSync(evidenceDir, { recursive: true });
  const evidencePath = join(evidenceDir, `context-budget-${runId}.json`);
  const payload = {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "ContextBudgetEvidence",
    feature_id: featureId,
    run_id: runId,
    recorded_at: new Date().toISOString(),
    telemetry,
  };
  writeFileSync(evidencePath, JSON.stringify(payload, null, 2), "utf-8");

  const checkpointSidecarDir = join(jobsDir, "checkpoints");
  mkdirSync(checkpointSidecarDir, { recursive: true });
  const sidecarPath = join(checkpointSidecarDir, `${featureId}.spawn-context.json`);
  writeFileSync(
    sidecarPath,
    JSON.stringify(
      {
        feature_id: featureId,
        last_run_id: runId,
        last_context_budget: telemetry,
        updated_at: payload.recorded_at,
      },
      null,
      2,
    ),
    "utf-8",
  );

  return evidencePath;
}

export function preparePickupSpawnContext(
  job: SkillJob,
  jobsDir: string,
  options?: { eventBus?: EventBus; featureId?: string },
): PickupContextPrepareResult {
  const featureId = job.feature_id ?? options?.featureId ?? job.node_id;
  const bundle: Partial<GateBundleFields> =
    job.gate_bundle ??
    ({
      parent_cycle_id: featureId,
      spawn_depth: 1,
      max_spawn_depth: 3,
      role: "exec",
    } as GateBundleFields);

  const validation = validateSpawnContext(bundle);
  if (!validation.valid) {
    return {
      validation_ok: false,
      validation_reason: validation.reason,
      gate_bundle_block: formatGateBundleBlock(bundle as GateBundleFields),
      budgeted_context_block: "",
    };
  }

  const retrieval = job.context_retrieval ?? [];
  const cited =
    (job.spawn_metadata?.cited_paths as string[] | undefined) ??
    (job.spawn_metadata?.retrieval_paths as string[] | undefined);
  const ranked = rankRetrievalPaths(
    retrieval.map((e) => e.path),
    (p) => retrieval.find((e) => e.path === p)?.content ?? "",
    { query: job.briefing, cited_paths: cited },
  );
  const priorityByPath = new Map(ranked.map((r) => [r.path, r.score]));
  const slices: ContextSlice[] = [
    ...protectedSlicesFromJob(job),
    ...retrieval.map((e) =>
      sliceFromFile(
        e.path,
        e.content,
        e.kind ?? "generic",
        e.priority ?? priorityByPath.get(e.path) ?? 10,
      ),
    ),
  ];

  const budget = applyContextBudget(slices, {
    ownerId: validation.context_owner_id!,
    limits: validation.gate_bundle?.context_budget,
    evidence_paths: job.evidence_paths,
  });

  if (options?.eventBus) {
    emitContextBudgetTelemetry(options.eventBus, budget.telemetry, featureId);
  }

  const evidencePath = persistContextBudgetEvidence(
    jobsDir,
    featureId,
    job.run_id,
    budget.telemetry,
  );

  const budgeted_context_block =
    budget.context_text.length > 0
      ? `### Context (budgeted retrieval)\n\n${budget.context_text}\n`
      : "";

  return {
    validation_ok: true,
    context_owner_id: validation.context_owner_id,
    gate_bundle_block: formatGateBundleBlock(validation.gate_bundle!),
    budgeted_context_block,
    telemetry: budget.telemetry,
    evidence_path: evidencePath,
  };
}
