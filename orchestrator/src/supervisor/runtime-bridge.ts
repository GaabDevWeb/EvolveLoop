/**
 * Runtime bridge — validated decisions → A03 evaluatePreExecute (+ optional effect).
 * Never called by Agents. Supervisor uses this instead of Providers.
 */

import { randomUUID } from "node:crypto";
import { evaluatePreExecute } from "../gates/runtime-gates.js";
import type { AgentDecision } from "../agent/types.js";
import type {
  RuntimeBridge,
  RuntimeBridgeRequest,
  RuntimeBridgeResult,
} from "./types.js";

export interface SimulatedRuntimeBridgeOptions {
  /** When true, ALLOW still does not invent filesystem writes — records synthetic effect only */
  record_effects?: boolean;
  /** Denied capabilities (A03 deny-list) */
  denied_capabilities?: string[];
  /** Force confirmation for high-risk */
  require_confirmation_for?: string[];
  confirmed_for_plan_hash?: string;
  plan_hash?: string;
  /** Simulate provider failure after ALLOW */
  fail_provider?: boolean;
}

/**
 * Deterministic bridge for SE-04 tests — uses real evaluatePreExecute.
 * Does not grant Agent Provider access.
 */
export class SimulatedRuntimeBridge implements RuntimeBridge {
  readonly effects: Array<{
    execution_id: string;
    capability: string;
    assignment_id: string;
    at: string;
  }> = [];

  constructor(private readonly options: SimulatedRuntimeBridgeOptions = {}) {}

  async executeDecision(req: RuntimeBridgeRequest): Promise<RuntimeBridgeResult> {
    const decision = req.decision;

    // Only ACTION_PROPOSAL (and mapped eng proposals) request runtime effects
    if (decision.decision_type !== "ACTION_PROPOSAL") {
      return {
        ok: true,
        gate_decision: "SKIPPED",
        provider_invoked: false,
        success: true,
        effect_observed: false,
        evidence_refs: [`evidence://decision/${decision.decision_id}`],
      };
    }

    const actions = decision.proposed_actions;
    if (!actions.length) {
      return {
        ok: false,
        gate_decision: "DENY",
        provider_invoked: false,
        error_code: "EMPTY_ACTIONS",
        error_message: "ACTION_PROPOSAL has no actions",
      };
    }

    // Process first action (SE-04: single-step proposals in tests)
    const action = actions[0]!;
    const forceConfirmNode =
      this.options.require_confirmation_for?.includes(action.capability) === true;
    const node = {
      id: `rt-${req.assignment.assignment_id}`,
      capability: action.capability,
      type: "worker" as const,
      dependencies: [] as string[],
      definition_of_done: [],
      status: "pending" as const,
      retry_count: 0,
      constraints: {
        ...(action.inputs ?? {}),
        ...(forceConfirmNode ? { requires_confirmation: true } : {}),
      },
    };

    const provider = {
      id: "runtime-bridge-simulated",
      capabilities: [action.capability],
      execute: async () => {
        throw new Error("Supervisor must not be used as Provider — SimulatedRuntimeBridge blocks Agent-direct execute");
      },
    };

    const plan_hash = req.plan_hash ?? this.options.plan_hash ?? "plan-se04";
    const forceConfirm =
      this.options.require_confirmation_for?.includes(action.capability) === true;
    const gate = evaluatePreExecute({
      node,
      provider: provider as never,
      authority: {
        workspaceRoot: "/tmp/se04-workspace",
        // Force confirm: omit allowWrite (undefined) so authority returns confirm, not deny
        ...(forceConfirm
          ? {}
          : { allowWrite: !/shell|network/i.test(action.capability) }),
        allowShell: false,
        allowNetwork: false,
        confirmed: forceConfirm
          ? false
          : Boolean(
              this.options.confirmed_for_plan_hash &&
                this.options.confirmed_for_plan_hash === plan_hash,
            ),
      },
      gateContext: {
        denied_capabilities: this.options.denied_capabilities ?? [],
      },
      plan_hash,
      confirmed_for_plan_hash: this.options.confirmed_for_plan_hash ?? req.confirmed_for_plan_hash,
      run_id: req.delegation.correlation.run_id,
      execution_id: req.execution_id,
      policy_id: req.delegation.policy_summary.policy_id,
    });

    if (gate.decision === "CONFIRMATION_REQUIRED") {
      return {
        ok: false,
        gate_decision: "CONFIRMATION_REQUIRED",
        provider_invoked: false,
        error_code: "CONFIRMATION_REQUIRED",
        error_message: "Human confirmation required — Supervisor cannot auto-confirm",
      };
    }

    if (gate.decision !== "ALLOW") {
      return {
        ok: false,
        gate_decision: gate.decision,
        provider_invoked: false,
        error_code: "POLICY_BLOCKED",
        error_message: gate.reason ?? "gate denied",
      };
    }

    // Adversarial: never let Agent "execute" — bridge records effect after ALLOW only
    if (this.options.fail_provider) {
      return {
        ok: false,
        gate_decision: "ALLOW",
        provider_invoked: true,
        success: false,
        error_code: "PROVIDER_FAILURE",
        error_message: "simulated provider failure after gate allow",
        effect_observed: false,
      };
    }

    if (this.options.record_effects !== false) {
      this.effects.push({
        execution_id: req.execution_id,
        capability: action.capability,
        assignment_id: req.assignment.assignment_id,
        at: new Date().toISOString(),
      });
    }

    return {
      ok: true,
      gate_decision: "ALLOW",
      provider_invoked: true,
      success: true,
      effect_observed: true,
      evidence_refs: [
        `evidence://runtime/${req.execution_id}`,
        `evidence://gate/${randomUUID().slice(0, 8)}`,
      ],
    };
  }
}

/** Rejects any attempt to treat Agent as Provider */
export class ForbiddenDirectProviderBridge implements RuntimeBridge {
  async executeDecision(_req: RuntimeBridgeRequest): Promise<RuntimeBridgeResult> {
    return {
      ok: false,
      gate_decision: "DENY",
      provider_invoked: false,
      error_code: "FORBIDDEN_DIRECT_PROVIDER",
      error_message: "Direct Provider invocation from Agent/Supervisor path is forbidden",
    };
  }
}

export function decisionNeedsRuntime(decision: AgentDecision): boolean {
  return decision.decision_type === "ACTION_PROPOSAL";
}
