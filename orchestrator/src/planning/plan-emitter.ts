/**
 * PlanEmitter — deterministic CapabilityGraph emission from StructuredIntent.
 *
 * Agent responsibility: produce StructuredIntent (reasoning).
 * Runtime responsibility: emit + validate IR; ExecutionEngine executes.
 * Does NOT call an LLM. Does NOT live inside the execution loop.
 */

import type { CapabilityIR, Evidence, IRNode } from "../types/index.js";
import { buildPlanningEvidence } from "../evidence/builders.js";
import { newRunId } from "../ir/validator.js";
import {
  type StructuredIntent,
  validateStructuredIntent,
  type IntentValidationError,
} from "./structured-intent.js";
import {
  assertExecutableIR,
  type PreflightOptions,
  RejectedBeforeExecutionError,
  REJECTED_BEFORE_EXECUTION,
  validateExecutableIR,
} from "./preflight.js";

const API_VERSION = "capability-orchestrator.io/v2";

export interface PlanEmissionSuccess {
  ok: true;
  execution_id: string;
  ir: CapabilityIR;
  evidence: Evidence;
}

export interface PlanEmissionFailure {
  ok: false;
  status: typeof REJECTED_BEFORE_EXECUTION | "INTENT_INVALID";
  execution_id: string;
  errors: Array<IntentValidationError | { code: string; message: string; node_id?: string }>;
}

export type PlanEmissionResult = PlanEmissionSuccess | PlanEmissionFailure;

export interface PlanEmitterOptions {
  /** Extra preflight (registry / router / policy). */
  preflight?: PreflightOptions;
  /** Override clock for tests. */
  now?: () => string;
}

function defaultDoD(stepId: string): IRNode["definition_of_done"] {
  return [
    {
      id: `${stepId}-done`,
      check: "capability executed with evidence",
      verification: "automated",
    },
  ];
}

/** Pure emit — no registry checks. */
export function emitCapabilityIR(
  intent: StructuredIntent,
  executionId: string,
  nowIso: string,
): CapabilityIR {
  const nodes: IRNode[] = intent.steps.map((step) => {
    const inputEntries = Object.entries(step.inputs ?? {});
    const constraints: Record<string, unknown> = {
      ...(step.constraints ?? {}),
      ...Object.fromEntries(inputEntries),
    };

    return {
      id: step.id,
      capability: step.capability,
      type: step.type ?? "worker",
      inputs: inputEntries.map(([ref]) => ({ ref })),
      dependencies: step.dependencies ?? [],
      definition_of_done: step.definition_of_done ?? defaultDoD(step.id),
      constraints: Object.keys(constraints).length ? constraints : undefined,
      metadata: {
        intent_id: intent.id,
        execution_id: executionId,
      },
    };
  });

  return {
    apiVersion: API_VERSION,
    kind: "CapabilityGraph",
    metadata: {
      id: intent.id,
      feature: intent.feature ?? intent.id,
      ir_version: "2.0.0",
      policy_ref: intent.policy_ref ?? "rapid-prototype",
      created_at: nowIso,
      planner_version: intent.planner_version ?? "plan-emitter/1.0.0",
      intent_id: intent.id,
      execution_id: executionId,
    },
    spec: {
      nodes,
      assumptions: intent.assumptions ?? [`goal: ${intent.goal}`],
      out_of_scope: intent.out_of_scope,
    },
  };
}

/**
 * Validate intent → emit CapabilityIR → optional executable preflight → planning evidence.
 */
export function emitPlan(
  intent: StructuredIntent,
  options: PlanEmitterOptions = {},
): PlanEmissionResult {
  const execution_id = newRunId();
  const nowIso = options.now?.() ?? new Date().toISOString();

  const intentErrors = validateStructuredIntent(intent);
  if (intentErrors.length > 0) {
    return {
      ok: false,
      status: "INTENT_INVALID",
      execution_id,
      errors: intentErrors,
    };
  }

  const ir = emitCapabilityIR(intent, execution_id, nowIso);

  if (options.preflight) {
    const pre = validateExecutableIR(ir, options.preflight);
    if (!pre.ok) {
      return {
        ok: false,
        status: REJECTED_BEFORE_EXECUTION,
        execution_id,
        errors: pre.errors,
      };
    }
  }

  const criticalPath = ir.spec.nodes
    .filter((n) => (n.dependencies?.length ?? 0) === 0)
    .map((n) => n.id);

  const evidence = buildPlanningEvidence(
    execution_id,
    {
      type: "planning",
      decomposition_confidence: 1,
      unresolved_dependencies: [],
      critical_path: criticalPath.length ? criticalPath : ir.spec.nodes.map((n) => n.id),
      out_of_scope: intent.out_of_scope,
    },
    [...(intent.assumptions ?? []), `intent_id:${intent.id}`, `goal:${intent.goal}`],
  );

  return { ok: true, execution_id, ir, evidence };
}

/** Strict variant — throws on failure. */
export function emitPlanOrThrow(
  intent: StructuredIntent,
  options: PlanEmitterOptions = {},
): PlanEmissionSuccess {
  const result = emitPlan(intent, options);
  if (!result.ok) {
    if (result.status === REJECTED_BEFORE_EXECUTION) {
      throw new RejectedBeforeExecutionError(result.errors as never);
    }
    throw new Error(
      `INTENT_INVALID: ${result.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return result;
}

export { assertExecutableIR, RejectedBeforeExecutionError, REJECTED_BEFORE_EXECUTION };
