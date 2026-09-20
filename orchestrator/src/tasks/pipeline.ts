/**
 * SE-03 pipeline: Requirements + Architecture → TaskGraph → validate → baseline.
 * No task execution, no app code, no multi-agent delegation.
 */

import type { EventBus } from "../events/event-bus.js";
import type { AgentDecision, AgentExecutionResult } from "../agent/types.js";
import type { Evidence } from "../types/index.js";
import { extractAndBuildTaskGraph } from "./extract.js";
import { buildTaskGraphFromAgentDecision } from "./builder.js";
import {
  createTaskGraphBaseline,
  diffTaskGraphVersions,
} from "./versioning.js";
import { TaskGraphArtifactStore } from "./store.js";
import { buildTaskGraphEvidence } from "./evidence.js";
import {
  emitTaskGraphBaselineCreated,
  emitTaskGraphGenerationStarted,
  emitTaskGraphProposalProduced,
  emitTaskGraphValidationFailed,
  emitTaskGraphVersionCreated,
} from "./telemetry.js";
import { taskGraphGateAllowsExecution, toIrMappingHints } from "./validate.js";
import type {
  EngineeringTaskGraph,
  TaskGraphChangeSet,
  TaskGraphExtractionInput,
  TaskGraphValidationResult,
  TaskToIrMappingHint,
} from "./types.js";

export interface TaskGraphPipelineOptions {
  bus?: EventBus;
  store?: TaskGraphArtifactStore;
  run_id?: string;
  persist?: boolean;
  create_baseline?: boolean;
}

export interface TaskGraphPipelineResult {
  graph: EngineeringTaskGraph;
  validation: TaskGraphValidationResult;
  evidence: Evidence;
  baseline?: EngineeringTaskGraph;
  meta?: { artifact_id: string; path: string };
  gate_allows_execution_planning: boolean;
  ir_mapping_hints?: TaskToIrMappingHint[];
  change_set?: TaskGraphChangeSet;
}

export function runTaskGraphFromSpecs(
  input: TaskGraphExtractionInput,
  options: TaskGraphPipelineOptions = {},
): TaskGraphPipelineResult {
  const run_id = options.run_id ?? `tg-${Date.now()}`;
  const id = input.task_graph_id ?? `${input.requirements.requirements_id}-TG`;
  emitTaskGraphGenerationStarted(options.bus, id, run_id);

  const { graph, validation } = extractAndBuildTaskGraph(input);
  emitTaskGraphProposalProduced(options.bus, graph, run_id);
  if (!validation.ok) {
    emitTaskGraphValidationFailed(options.bus, graph, validation, run_id);
  }
  return finalize(graph, validation, input, options, run_id);
}

export function runTaskGraphFromAgentDecision(
  decision: AgentDecision,
  input: TaskGraphExtractionInput,
  options: TaskGraphPipelineOptions = {},
): TaskGraphPipelineResult {
  const run_id = options.run_id ?? `tg-${Date.now()}`;
  emitTaskGraphGenerationStarted(options.bus, input.task_graph_id ?? "pending", run_id);
  const { graph, validation } = buildTaskGraphFromAgentDecision(decision, input);
  emitTaskGraphProposalProduced(options.bus, graph, run_id);
  if (!validation.ok) {
    emitTaskGraphValidationFailed(options.bus, graph, validation, run_id);
  }
  return finalize(graph, validation, input, options, run_id);
}

export function runTaskGraphFromAgentResult(
  result: AgentExecutionResult,
  input: TaskGraphExtractionInput,
  options: TaskGraphPipelineOptions = {},
): TaskGraphPipelineResult {
  if (!result.success || !result.decision) {
    return runTaskGraphFromSpecs(input, options);
  }
  return runTaskGraphFromAgentDecision(result.decision, input, options);
}

function finalize(
  graph: EngineeringTaskGraph,
  validation: TaskGraphValidationResult,
  input: TaskGraphExtractionInput,
  options: TaskGraphPipelineOptions,
  run_id: string,
): TaskGraphPipelineResult {
  let working = graph;
  let change_set: TaskGraphChangeSet | undefined;

  if (input.prior) {
    working = {
      ...graph,
      task_graph_id: input.prior.task_graph_id,
      version: input.prior.version + 1,
      parent_version: input.prior.version,
      parent_graph_id: input.prior.task_graph_id,
    };
    change_set = diffTaskGraphVersions(input.prior, working);
    emitTaskGraphVersionCreated(options.bus, working, run_id);
  }

  let meta: { artifact_id: string; path: string } | undefined;
  let baseline: EngineeringTaskGraph | undefined;
  const gate = taskGraphGateAllowsExecution(validation);

  if (options.store && options.persist !== false) {
    const saved = options.store.save(working);
    working.artifact_id = saved.artifact_id;
    meta = { artifact_id: saved.artifact_id, path: saved.path };
  }

  if (options.create_baseline && gate) {
    baseline = createTaskGraphBaseline(working);
    if (options.store && !meta) {
      const saved = options.store.save(baseline);
      baseline.artifact_id = saved.artifact_id;
      meta = { artifact_id: saved.artifact_id, path: saved.path };
    } else if (meta) {
      baseline.artifact_id = meta.artifact_id;
    }
    emitTaskGraphBaselineCreated(options.bus, baseline, run_id);
  }

  return {
    graph: working,
    validation,
    evidence: buildTaskGraphEvidence(run_id, working, validation),
    baseline,
    meta,
    gate_allows_execution_planning: gate,
    ir_mapping_hints: gate ? toIrMappingHints(baseline ?? working) : undefined,
    change_set,
  };
}
