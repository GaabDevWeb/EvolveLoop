/**
 * SE-01 pipeline: extract → build → validate → (optional) baseline/persist.
 * Single-stage — no multi-agent delegation, no architecture/task graph.
 */

import type { EventBus } from "../events/event-bus.js";
import type { AgentDecision, AgentExecutionResult } from "../agent/types.js";
import { extractAndBuild } from "./extract.js";
import { buildRequirementsFromAgentDecision } from "./builder.js";
import {
  createRequirementsBaseline,
  createNextRequirementsVersion,
  diffRequirementsVersions,
  toArchitectureHandoff,
} from "./versioning.js";
import { RequirementsArtifactStore } from "./store.js";
import { buildRequirementsEvidence } from "./evidence.js";
import {
  emitBaselineCreated,
  emitExtractionStarted,
  emitProposalProduced,
  emitValidationFailed,
  emitVersionCreated,
} from "./telemetry.js";
import { requirementsGateAllowsArchitecture } from "./validate.js";
import type {
  RequirementsExtractionInput,
  RequirementsSpec,
  RequirementsValidationResult,
} from "./types.js";
import type { ArchitectureHandoff } from "./versioning.js";
import type { RequirementsChangeSet } from "./types.js";
import type { Evidence } from "../types/index.js";

export interface RequirementsPipelineOptions {
  bus?: EventBus;
  store?: RequirementsArtifactStore;
  run_id?: string;
  /** Persist draft versions (default true when store set) */
  persist?: boolean;
  /** Accept as baseline when validation allows */
  create_baseline?: boolean;
}

export interface RequirementsPipelineResult {
  spec: RequirementsSpec;
  validation: RequirementsValidationResult;
  evidence: Evidence;
  baseline?: RequirementsSpec;
  meta?: { artifact_id: string; path: string };
  gate_allows_architecture: boolean;
  handoff?: ArchitectureHandoff;
  change_set?: RequirementsChangeSet;
}

export function runRequirementsFromText(
  input: RequirementsExtractionInput,
  options: RequirementsPipelineOptions = {},
): RequirementsPipelineResult {
  const run_id = options.run_id ?? `req-${Date.now()}`;
  emitExtractionStarted(options.bus, input.requirements_id ?? "pending", run_id);

  const { spec, validation } = extractAndBuild(input);
  emitProposalProduced(options.bus, spec, run_id);

  if (!validation.ok) {
    emitValidationFailed(options.bus, spec, validation, run_id);
  }

  return finalize(spec, validation, input, options, run_id);
}

export function runRequirementsFromAgentDecision(
  decision: AgentDecision,
  input: RequirementsExtractionInput = {},
  options: RequirementsPipelineOptions = {},
): RequirementsPipelineResult {
  const run_id = options.run_id ?? `req-${Date.now()}`;
  emitExtractionStarted(options.bus, input.requirements_id ?? "pending", run_id);

  const { spec, validation } = buildRequirementsFromAgentDecision(decision, input);
  emitProposalProduced(options.bus, spec, run_id);
  if (!validation.ok) {
    emitValidationFailed(options.bus, spec, validation, run_id);
  }
  return finalize(spec, validation, input, options, run_id);
}

export function runRequirementsFromAgentResult(
  result: AgentExecutionResult,
  input: RequirementsExtractionInput = {},
  options: RequirementsPipelineOptions = {},
): RequirementsPipelineResult {
  if (!result.success || !result.decision) {
    const { spec, validation } = extractAndBuild({
      ...input,
      brief: input.brief ?? "",
    });
    // Force NOT_READY path when agent failed — still return structure
    return runRequirementsFromText(
      {
        ...input,
        brief: input.brief ?? "",
      },
      options,
    );
  }
  return runRequirementsFromAgentDecision(result.decision, input, options);
}

function finalize(
  spec: RequirementsSpec,
  validation: RequirementsValidationResult,
  input: RequirementsExtractionInput,
  options: RequirementsPipelineOptions,
  run_id: string,
): RequirementsPipelineResult {
  let working = spec;
  let change_set: RequirementsChangeSet | undefined;

  if (input.prior) {
    working = {
      ...spec,
      version: input.prior.version + 1,
      parent_version: input.prior.version,
      requirements_id: input.prior.requirements_id,
    };
    change_set = diffRequirementsVersions(input.prior, working);
    emitVersionCreated(options.bus, working, run_id);
  }

  let meta: { artifact_id: string; path: string } | undefined;
  let baseline: RequirementsSpec | undefined;

  const gate = requirementsGateAllowsArchitecture(validation);

  if (options.store && options.persist !== false) {
    const saved = options.store.save(working);
    working.artifact_id = saved.artifact_id;
    meta = { artifact_id: saved.artifact_id, path: saved.path };
  }

  if (options.create_baseline && gate) {
    baseline = createRequirementsBaseline(working);
    if (options.store) {
      // Baseline is annotation — if working already saved, re-save not allowed.
      // Persist baseline only when not yet saved, or save as same version content with baseline flag
      // only if file not written yet. If already written without baseline, next version carries baseline.
      if (!meta) {
        const saved = options.store.save(baseline);
        baseline.artifact_id = saved.artifact_id;
        meta = { artifact_id: saved.artifact_id, path: saved.path };
      } else {
        // Mark in-memory; disk version remains immutable snapshot of proposal
        baseline.artifact_id = meta.artifact_id;
      }
    }
    emitBaselineCreated(options.bus, baseline, run_id);
  }

  const evidence = buildRequirementsEvidence(run_id, working, validation);
  const handoff = gate ? toArchitectureHandoff(baseline ?? working) : undefined;

  return {
    spec: working,
    validation,
    evidence,
    baseline,
    meta,
    gate_allows_architecture: gate,
    handoff,
    change_set,
  };
}

export { createNextRequirementsVersion, diffRequirementsVersions, toArchitectureHandoff };
