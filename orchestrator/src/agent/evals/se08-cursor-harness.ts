/**
 * SE-08 Cursor harness — Mock for CI; live when SE08_LIVE=1 + CURSOR_API_KEY.
 */

import { randomUUID } from "node:crypto";
import { assembleAgentExecutionRequest } from "../context-assembler.js";
import { DefaultAgentExecutor } from "../agent-executor.js";
import { MockCursorReasoningProvider, CursorReasoningProvider } from "../providers/cursor-reasoning-provider.js";
import { resolveCursorApiKey } from "../providers/cursor-auth.js";
import type { AgentDecision, ReasoningProvider } from "../types.js";
import {
  SE08_CURSOR_CASES,
  SE08_SUITE_VERSION,
  type Se08Case,
  type Se08CaseResult,
  type Se08Status,
} from "./se08-cursor-cases.js";

function capsFromDecision(d: AgentDecision | undefined): string[] {
  if (!d) return [];
  if (d.decision_type === "ACTION_PROPOSAL") {
    return d.proposed_actions.map((a) => a.capability);
  }
  if (d.decision_type === "PLAN_PROPOSAL") {
    return d.proposed_intent.steps.map((s) => s.capability);
  }
  if (d.decision_type === "REPLAN_PROPOSAL" && d.proposed_intent) {
    return d.proposed_intent.steps.map((s) => s.capability);
  }
  return [];
}

function score(c: Se08Case, decision: AgentDecision | undefined, success: boolean, error?: string): {
  status: Se08Status;
  notes: string[];
} {
  const notes: string[] = [];
  if (!success || !decision) {
    return { status: "FAIL", notes: [error ?? "no decision"] };
  }
  if (c.expect.decision_types?.length && !c.expect.decision_types.includes(decision.decision_type)) {
    notes.push(`unexpected type ${decision.decision_type}`);
    return { status: "FAIL", notes };
  }
  const caps = capsFromDecision(decision);
  for (const bad of c.expect.must_not_contain_capabilities ?? []) {
    if (caps.includes(bad)) {
      notes.push(`forbidden capability ${bad}`);
      return { status: "FAIL", notes };
    }
  }
  return { status: "PASS", notes: notes.length ? notes : ["ok"] };
}

export async function runSe08CursorCase(
  c: Se08Case,
  options: {
    live?: boolean;
    provider?: ReasoningProvider;
    model?: string;
  } = {},
): Promise<Se08CaseResult> {
  const live = options.live === true;
  let provider: ReasoningProvider;
  let a03: "PASS" | "LIMITED" = "PASS";

  if (options.provider) {
    provider = options.provider;
  } else if (live) {
    const auth = resolveCursorApiKey();
    if (!auth.ok) {
      return {
        case_id: c.case_id,
        status: "BLOCKED",
        live: true,
        notes: [auth.message],
        human_intervention: "required",
      };
    }
    const cursor = new CursorReasoningProvider({
      model: options.model ?? "composer-2.5",
      execution_mode: "reasoning_only",
      timeout_ms: 180_000,
    });
    a03 = cursor.a03_enforcement;
    provider = cursor;
  } else {
    provider = new MockCursorReasoningProvider(() => c.mock_decision);
  }

  const executor = new DefaultAgentExecutor({ provider, timeout_ms: 200_000 });
  const req = assembleAgentExecutionRequest({
    execution_id: `se08-${c.case_id}-${randomUUID().slice(0, 8)}`,
    task_id: c.case_id,
    attempt: 0,
    agent_id: "backend-agent",
    agent_version: "0.1.0",
    role: "backend",
    objective: c.objective,
    decision_mode: c.category === "replan" ? "REPLAN" : "ANSWER",
    policy_summary: { policy_id: "rapid-prototype" },
    workspace_authority_summary: {
      allow_write: false,
      allow_shell: false,
      allow_network: false,
    },
    available_capabilities: [
      { capability_id: "filesystem.write", available: true },
      { capability_id: "filesystem.read", available: true },
      { capability_id: "test.run", available: true },
    ],
  });

  const started = Date.now();
  const result = await executor.execute(req);
  const scored = score(c, result.decision, result.success, result.error?.message);

  return {
    case_id: c.case_id,
    status: scored.status,
    provider_id: result.provider_id,
    model_id: result.model_id,
    live,
    a03_enforcement: a03,
    decision_type: result.decision?.decision_type,
    duration_ms: Date.now() - started,
    notes: scored.notes,
    human_intervention: c.expect.human_intervention ?? "none",
  };
}

export async function runSe08CursorSuite(options: {
  live?: boolean;
  cases?: Se08Case[];
  model?: string;
} = {}): Promise<{
  suite_version: string;
  live: boolean;
  results: Se08CaseResult[];
  metrics: {
    pass: number;
    fail: number;
    blocked: number;
    inconclusive: number;
    not_measured: number;
    total: number;
  };
}> {
  const cases = options.cases ?? SE08_CURSOR_CASES;
  const results: Se08CaseResult[] = [];
  for (const c of cases) {
    results.push(await runSe08CursorCase(c, { live: options.live, model: options.model }));
  }
  const metrics = {
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
    blocked: results.filter((r) => r.status === "BLOCKED").length,
    inconclusive: results.filter((r) => r.status === "INCONCLUSIVE").length,
    not_measured: results.filter((r) => r.status === "NOT_MEASURED").length,
    total: results.length,
  };
  return { suite_version: SE08_SUITE_VERSION, live: !!options.live, results, metrics };
}
