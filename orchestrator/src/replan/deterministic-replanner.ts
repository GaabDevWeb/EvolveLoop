import { newRunId } from "../ir/validator.js";
import type { CapabilityIR, IRNode } from "../types/index.js";
import { buildPlanningEvidence } from "../evidence/builders.js";
import { hashCapabilityIR, stampPlanLineage } from "./plan-identity.js";
import type { ReplanInput, ReplanResult, Replanner, ReplanStrategy } from "./types.js";

/**
 * Deterministic test/production-light replanner.
 * Strategy: RETRY_WITH_CHANGED_PROVIDER — exclude failed provider via constraints.
 * Does not call LLMs. Does not execute capabilities.
 */
export class DeterministicReplanner implements Replanner {
  replan(input: ReplanInput): ReplanResult {
    if (input.failure.disposition === "POLICY_BLOCKED") {
      return {
        status: "REPLAN_REJECTED",
        reason: "Cannot replan to bypass policy/authority denial",
        code: "POLICY_BLOCKED",
      };
    }

    const failed = input.failed_node;
    if (!failed) {
      return {
        status: "REPLAN_UNAVAILABLE",
        reason: "No failed node in context",
        code: "NO_FAILED_NODE",
      };
    }

    const alternatives = input.available_providers.filter((p) => p !== input.failed_provider_id);
    if (alternatives.length === 0) {
      return {
        status: "REPLAN_UNAVAILABLE",
        reason: `No alternative provider for ${failed.capability}`,
        code: "NO_ALTERNATIVE_PROVIDER",
      };
    }

    const strategy: ReplanStrategy = "RETRY_WITH_CHANGED_PROVIDER";
    const replan_id = newRunId();
    const parent_plan_id = input.current_plan.metadata.id;
    const plan_version = (input.current_plan.metadata.plan_version ?? 1) + 1;

    const nodes: IRNode[] = input.current_plan.spec.nodes.map((n) => {
      if (n.id !== failed.id) return structuredClone(n);
      const excluded = [
        ...new Set([
          ...((n.constraints?.exclude_providers as string[] | undefined) ?? []),
          ...(input.failed_provider_id ? [input.failed_provider_id] : []),
        ]),
      ];
      const prefer = alternatives[0];
      return {
        ...structuredClone(n),
        constraints: {
          ...(n.constraints ?? {}),
          exclude_providers: excluded,
          prefer_provider: prefer,
        },
        metadata: {
          ...(n.metadata ?? {}),
          replan_strategy: strategy,
          excluded_provider: input.failed_provider_id,
          prefer_provider: prefer,
        },
      };
    });

    let candidate: CapabilityIR = {
      ...structuredClone(input.current_plan),
      metadata: {
        ...input.current_plan.metadata,
        id: `${parent_plan_id}#v${plan_version}`,
      },
      spec: {
        ...structuredClone(input.current_plan.spec),
        nodes,
      },
    };

    candidate = stampPlanLineage(candidate, {
      execution_id: input.execution_id,
      plan_version,
      parent_plan_id,
      replan_id,
      replan_reason: `${strategy}: exclude ${input.failed_provider_id ?? "unknown"} prefer ${alternatives[0]}`,
    });

    const hash = hashCapabilityIR(candidate);
    if (input.recent_plan_hashes.includes(hash)) {
      return {
        status: "REPLAN_REJECTED",
        reason: "Candidate plan hash already attempted",
        code: "NO_PROGRESS",
      };
    }

    const evidence = buildPlanningEvidence(
      input.execution_id,
      {
        type: "planning",
        decomposition_confidence: 0.9,
        unresolved_dependencies: [],
        critical_path: nodes.filter((n) => !n.dependencies.length).map((n) => n.id),
      },
      [
        `replan_id:${replan_id}`,
        `strategy:${strategy}`,
        `failed_node:${failed.id}`,
        `failure_class:${input.failure.failure_class}`,
      ],
    );

    return {
      status: "REPLAN_PROPOSED",
      candidate_ir: candidate,
      reason: candidate.metadata.replan_reason ?? strategy,
      strategy,
      replan_id,
      evidence,
    };
  }
}

/** Safe no-op when no replanner configured. */
export class UnavailableReplanner implements Replanner {
  replan(_input: ReplanInput): ReplanResult {
    return {
      status: "REPLAN_UNAVAILABLE",
      reason: "No Replanner configured on ExecutionEngine",
      code: "NO_REPLANNER",
    };
  }
}
