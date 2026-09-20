/**
 * StructuredIntent — V2 seam between Agent reasoning and Runtime execution.
 *
 * NOT a second IR. Emits existing CapabilityGraph (CapabilityIR).
 * Agent may fill this object (or LLM → structure); Runtime validates + executes.
 */

import type { DoDCheck, NodeType } from "../types/index.js";

/** One executable step — maps 1:1 onto an IRNode after emission. */
export interface IntentStep {
  id: string;
  capability: string;
  type?: NodeType;
  /** Flat key/value inputs; emitter converts to IR constraints + optional IRInput refs. */
  inputs?: Record<string, string>;
  dependencies?: string[];
  definition_of_done?: DoDCheck[];
  constraints?: Record<string, unknown>;
}

/**
 * Formal intent accepted by PlanEmitter.
 * High-level natural language may live in `goal`; executable detail is `steps`.
 */
export interface StructuredIntent {
  id: string;
  goal: string;
  /** ExecutionPolicy id — must resolve when preflight requires known policy. */
  policy_ref?: string;
  steps: IntentStep[];
  assumptions?: string[];
  out_of_scope?: string[];
  feature?: string;
  planner_version?: string;
}

export type IntentValidationCode =
  | "INTENT_MISSING_ID"
  | "INTENT_MISSING_GOAL"
  | "INTENT_EMPTY_STEPS"
  | "INTENT_DUPLICATE_STEP_ID"
  | "INTENT_MISSING_CAPABILITY"
  | "INTENT_DANGLING_DEPENDENCY"
  | "INTENT_INVALID_STEP";

export interface IntentValidationError {
  code: IntentValidationCode | string;
  message: string;
  step_id?: string;
}

/** Structural validation only (no registry / policy). */
export function validateStructuredIntent(intent: StructuredIntent): IntentValidationError[] {
  const errors: IntentValidationError[] = [];

  if (!intent?.id?.trim()) {
    errors.push({ code: "INTENT_MISSING_ID", message: "StructuredIntent.id is required" });
  }
  if (!intent?.goal?.trim()) {
    errors.push({ code: "INTENT_MISSING_GOAL", message: "StructuredIntent.goal is required" });
  }
  if (!Array.isArray(intent?.steps) || intent.steps.length === 0) {
    errors.push({ code: "INTENT_EMPTY_STEPS", message: "StructuredIntent.steps must be non-empty" });
    return errors;
  }

  const ids = new Set<string>();
  for (const step of intent.steps) {
    if (!step?.id?.trim()) {
      errors.push({
        code: "INTENT_INVALID_STEP",
        message: "Step id is required",
        step_id: step?.id,
      });
      continue;
    }
    if (ids.has(step.id)) {
      errors.push({
        code: "INTENT_DUPLICATE_STEP_ID",
        message: `Duplicate step id: ${step.id}`,
        step_id: step.id,
      });
    }
    ids.add(step.id);

    if (!step.capability?.trim()) {
      errors.push({
        code: "INTENT_MISSING_CAPABILITY",
        message: `Step ${step.id} missing capability`,
        step_id: step.id,
      });
    }

    if (step.type && step.type !== "worker" && step.type !== "gate") {
      errors.push({
        code: "INTENT_INVALID_STEP",
        message: `Step ${step.id} invalid type: ${step.type}`,
        step_id: step.id,
      });
    }
  }

  for (const step of intent.steps) {
    for (const dep of step.dependencies ?? []) {
      if (!ids.has(dep)) {
        errors.push({
          code: "INTENT_DANGLING_DEPENDENCY",
          message: `Step ${step.id} depends on unknown ${dep}`,
          step_id: step.id,
        });
      }
    }
  }

  return errors;
}
