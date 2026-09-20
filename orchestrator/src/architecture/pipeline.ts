/**
 * SE-02 pipeline: RequirementsSpec → proposal → validate → baseline.
 * No TaskGraph, no application code, no multi-agent delegation.
 */

import type { EventBus } from "../events/event-bus.js";
import type { AgentDecision, AgentExecutionResult } from "../agent/types.js";
import type { Evidence } from "../types/index.js";
import { extractAndBuildArchitecture } from "./extract.js";
import { buildArchitectureFromAgentDecision } from "./builder.js";
import {
  createArchitectureBaseline,
  diffArchitectureVersions,
  toTaskDecompositionHandoff,
  type TaskDecompositionHandoff,
} from "./versioning.js";
import { ArchitectureArtifactStore } from "./store.js";
import { buildArchitectureEvidence } from "./evidence.js";
import {
  emitArchitectureBaselineCreated,
  emitArchitectureGenerationStarted,
  emitArchitectureProposalProduced,
  emitArchitectureValidationFailed,
  emitArchitectureVersionCreated,
} from "./telemetry.js";
import { architectureGateAllowsTaskDecomposition } from "./validate.js";
import type {
  ArchitectureChangeSet,
  ArchitectureExtractionInput,
  ArchitectureSpec,
  ArchitectureValidationResult,
} from "./types.js";

export interface ArchitecturePipelineOptions {
  bus?: EventBus;
  store?: ArchitectureArtifactStore;
  run_id?: string;
  persist?: boolean;
  create_baseline?: boolean;
}

export interface ArchitecturePipelineResult {
  spec: ArchitectureSpec;
  validation: ArchitectureValidationResult;
  evidence: Evidence;
  baseline?: ArchitectureSpec;
  meta?: { artifact_id: string; path: string };
  gate_allows_task_decomposition: boolean;
  handoff?: TaskDecompositionHandoff;
  change_set?: ArchitectureChangeSet;
}

export function runArchitectureFromRequirements(
  input: ArchitectureExtractionInput,
  options: ArchitecturePipelineOptions = {},
): ArchitecturePipelineResult {
  const run_id = options.run_id ?? `arch-${Date.now()}`;
  const archId = input.architecture_id ?? `${input.requirements.requirements_id}-ARCH`;
  emitArchitectureGenerationStarted(options.bus, archId, run_id);

  const { spec, validation } = extractAndBuildArchitecture(input);
  emitArchitectureProposalProduced(options.bus, spec, run_id);
  if (!validation.ok) {
    emitArchitectureValidationFailed(options.bus, spec, validation, run_id);
  }
  return finalize(spec, validation, input, options, run_id);
}

export function runArchitectureFromAgentDecision(
  decision: AgentDecision,
  input: ArchitectureExtractionInput,
  options: ArchitecturePipelineOptions = {},
): ArchitecturePipelineResult {
  const run_id = options.run_id ?? `arch-${Date.now()}`;
  emitArchitectureGenerationStarted(
    options.bus,
    input.architecture_id ?? "pending",
    run_id,
  );
  const { spec, validation } = buildArchitectureFromAgentDecision(decision, input);
  emitArchitectureProposalProduced(options.bus, spec, run_id);
  if (!validation.ok) {
    emitArchitectureValidationFailed(options.bus, spec, validation, run_id);
  }
  return finalize(spec, validation, input, options, run_id);
}

export function runArchitectureFromAgentResult(
  result: AgentExecutionResult,
  input: ArchitectureExtractionInput,
  options: ArchitecturePipelineOptions = {},
): ArchitecturePipelineResult {
  if (!result.success || !result.decision) {
    return runArchitectureFromRequirements(input, options);
  }
  return runArchitectureFromAgentDecision(result.decision, input, options);
}

function finalize(
  spec: ArchitectureSpec,
  validation: ArchitectureValidationResult,
  input: ArchitectureExtractionInput,
  options: ArchitecturePipelineOptions,
  run_id: string,
): ArchitecturePipelineResult {
  let working = spec;
  let change_set: ArchitectureChangeSet | undefined;

  if (input.prior) {
    working = {
      ...spec,
      architecture_id: input.prior.architecture_id,
      version: input.prior.version + 1,
      parent_version: input.prior.version,
    };
    change_set = diffArchitectureVersions(input.prior, working);
    emitArchitectureVersionCreated(options.bus, working, run_id);
  }

  let meta: { artifact_id: string; path: string } | undefined;
  let baseline: ArchitectureSpec | undefined;
  const gate = architectureGateAllowsTaskDecomposition(validation, input.allow_assumptions !== false);

  if (options.store && options.persist !== false) {
    const saved = options.store.save(working);
    working.artifact_id = saved.artifact_id;
    meta = { artifact_id: saved.artifact_id, path: saved.path };
  }

  if (options.create_baseline && gate) {
    baseline = createArchitectureBaseline(working);
    if (options.store && !meta) {
      const saved = options.store.save(baseline);
      baseline.artifact_id = saved.artifact_id;
      meta = { artifact_id: saved.artifact_id, path: saved.path };
    } else if (meta) {
      baseline.artifact_id = meta.artifact_id;
    }
    emitArchitectureBaselineCreated(options.bus, baseline, run_id);
  }

  return {
    spec: working,
    validation,
    evidence: buildArchitectureEvidence(run_id, working, validation),
    baseline,
    meta,
    gate_allows_task_decomposition: gate,
    handoff: gate ? toTaskDecompositionHandoff(baseline ?? working) : undefined,
    change_set,
  };
}
