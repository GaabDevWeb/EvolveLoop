/**
 * Deterministic ReasoningProvider for contract tests — not a fake LLM.
 */

import type {
  ReasoningProvider,
  ReasoningRequest,
  ReasoningResponse,
  ReasoningErrorCode,
} from "./types.js";

export type TestReasoningScenario =
  | "valid_plan"
  | "valid_replan"
  | "valid_action"
  | "need_information"
  | "agent_unable"
  | "invalid_schema"
  | "unknown_capability"
  | "malformed"
  | "tool_call_forbidden"
  | "provider_unavailable"
  | "timeout"
  | "refused";

export interface TestReasoningProviderOptions {
  scenario?: TestReasoningScenario;
  /** Custom payload when scenario is driven externally */
  payloadFactory?: (req: ReasoningRequest) => unknown;
  provider_id?: string;
  model_id?: string;
  delay_ms?: number;
  usage?: ReasoningResponse["usage"];
}

function defaultPlanPayload(req: ReasoningRequest): unknown {
  return {
    decision_type: "PLAN_PROPOSAL",
    reason: "deterministic test plan",
    proposed_intent: {
      id: `intent-${req.request_id.slice(0, 8)}`,
      goal: req.objective,
      policy_ref: "rapid-prototype",
      steps: [
        {
          id: "step-a",
          capability: "demo.work",
          inputs: { message: "from-agent" },
        },
      ],
    },
  };
}

function defaultReplanPayload(req: ReasoningRequest): unknown {
  return {
    decision_type: "REPLAN_PROPOSAL",
    reason: "deterministic test replan",
    replan_strategy: "RETRY_WITH_CHANGED_PROVIDER",
    proposed_intent: {
      id: `replan-intent-${req.request_id.slice(0, 8)}`,
      goal: req.objective,
      policy_ref: "rapid-prototype",
      steps: [
        {
          id: "step-a",
          capability: "demo.work",
          constraints: { prefer_provider: "provider-b" },
        },
      ],
    },
  };
}

/**
 * Scriptable provider: set `scenario` or `payloadFactory`.
 * Throws / errors for unavailable & timeout scenarios.
 */
export class TestReasoningProvider implements ReasoningProvider {
  readonly id: string;
  private scenario: TestReasoningScenario;
  private payloadFactory?: (req: ReasoningRequest) => unknown;
  private model_id?: string;
  private delay_ms: number;
  private usage?: ReasoningResponse["usage"];
  invokeCount = 0;

  constructor(options: TestReasoningProviderOptions = {}) {
    this.id = options.provider_id ?? "test-reasoning";
    this.scenario = options.scenario ?? "valid_plan";
    this.payloadFactory = options.payloadFactory;
    this.model_id = options.model_id;
    this.delay_ms = options.delay_ms ?? 0;
    this.usage = options.usage;
  }

  setScenario(scenario: TestReasoningScenario): void {
    this.scenario = scenario;
  }

  async invoke(request: ReasoningRequest): Promise<ReasoningResponse> {
    this.invokeCount += 1;
    const started = Date.now();
    if (this.delay_ms > 0) {
      await new Promise((r) => setTimeout(r, this.delay_ms));
    }

    const fail = (code: ReasoningErrorCode, message: string): ReasoningResponse => ({
      ok: false,
      provider_id: this.id,
      model_id: this.model_id,
      duration_ms: Date.now() - started,
      error: { code, message },
    });

    switch (this.scenario) {
      case "provider_unavailable":
        return fail("REASONING_PROVIDER_UNAVAILABLE", "Test provider unavailable");
      case "timeout":
        return fail("REASONING_TIMEOUT", "Test provider timed out");
      case "refused":
        return fail("REASONING_REFUSED", "Test provider refused");
      case "malformed":
        return {
          ok: true,
          provider_id: this.id,
          model_id: this.model_id,
          duration_ms: Date.now() - started,
          usage: this.usage,
          // Non-object payload → malformed after parse
          payload: "not-json-object",
        };
      default:
        break;
    }

    let payload: unknown;
    if (this.payloadFactory) {
      payload = this.payloadFactory(request);
    } else {
      switch (this.scenario) {
        case "valid_plan":
          payload = defaultPlanPayload(request);
          break;
        case "valid_replan":
          payload = defaultReplanPayload(request);
          break;
        case "valid_action":
          payload = {
            decision_type: "ACTION_PROPOSAL",
            reason: "propose action",
            proposed_actions: [{ capability: "demo.work", inputs: { x: "1" } }],
          };
          break;
        case "need_information":
          payload = {
            decision_type: "NEED_INFORMATION",
            reason: "missing inputs",
            details: "need path",
          };
          break;
        case "agent_unable":
          payload = {
            decision_type: "AGENT_UNABLE",
            reason: "cannot solve",
          };
          break;
        case "invalid_schema":
          payload = { decision_type: "PLAN_PROPOSAL", reason: "" };
          break;
        case "unknown_capability":
          payload = {
            decision_type: "ACTION_PROPOSAL",
            reason: "bad cap",
            proposed_actions: [{ capability: "nonexistent.capability" }],
          };
          break;
        case "tool_call_forbidden":
          payload = {
            tool_call: { name: "filesystem.write", arguments: {} },
          };
          break;
        default:
          payload = defaultPlanPayload(request);
      }
    }

    return {
      ok: true,
      payload,
      provider_id: this.id,
      model_id: this.model_id,
      duration_ms: Date.now() - started,
      usage: this.usage ?? { tokens_unknown: true },
    };
  }
}
