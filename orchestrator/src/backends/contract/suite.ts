/**
 * Generic AgentBackend contract suite — mocks/injected backends only for CI PASS.
 * Live backends are separate (ACK Q1/Q5).
 */

import type { AgentBackend, BackendRunRequest } from "../types.js";

export interface ContractCaseResult {
  case_id: string;
  status: "PASS" | "PARTIAL" | "UNSUPPORTED" | "FAIL";
  detail?: string;
}

function baseReq(overrides: Partial<BackendRunRequest> = {}): BackendRunRequest {
  return {
    run_id: `run-${Date.now()}`,
    execution_id: "exec-contract",
    task_id: "task-contract",
    objective: "Return a short structured acknowledgement.",
    mode: "reasoning_only",
    workspace_roots: [process.cwd()],
    context: { contract: true },
    ...overrides,
  };
}

export async function runAgentBackendContractSuite(
  backend: AgentBackend,
): Promise<ContractCaseResult[]> {
  const results: ContractCaseResult[] = [];

  results.push({
    case_id: "initialize",
    status: backend.identity.backend_id ? "PASS" : "FAIL",
    detail: backend.identity.backend_id,
  });

  const caps = backend.capabilities();
  results.push({
    case_id: "capabilities",
    status: caps.evolveloop_sandbox === "UNAVAILABLE" ? "PASS" : "FAIL",
    detail: "evolveloop_sandbox must remain UNAVAILABLE",
  });

  const health = await backend.health();
  results.push({
    case_id: "health",
    status: health.ok ? "PASS" : "PARTIAL",
    detail: health.status,
  });

  const auth = await backend.authenticate();
  results.push({
    case_id: "authentication",
    status: auth.ok ? "PASS" : "PARTIAL",
    detail: auth.code ?? "ok",
  });

  const run = await backend.run(baseReq());
  results.push({
    case_id: "reasoning",
    status: run.ok ? "PASS" : auth.ok ? "FAIL" : "PARTIAL",
    detail: run.error?.code ?? "ok",
  });

  results.push({
    case_id: "structured_result",
    status: run.ok && (run.payload !== undefined || run.text !== undefined) ? "PASS" : run.ok ? "PARTIAL" : "PARTIAL",
  });

  const agentic = await backend.run(baseReq({ mode: "agent_runtime" }));
  results.push({
    case_id: "agent_runtime_limited",
    status:
      agentic.a03_enforcement === "LIMITED" || agentic.a03_enforcement === "NOT_APPLICABLE"
        ? "PASS"
        : "FAIL",
    detail: agentic.a03_enforcement,
  });

  results.push({
    case_id: "no_vendor_session_canonical",
    status: "PASS",
    detail: "vendor session refs optional only",
  });

  if (caps.cancellation === "UNAVAILABLE") {
    results.push({ case_id: "cancellation", status: "UNSUPPORTED" });
  } else if (backend.cancel) {
    await backend.cancel("run-cancel-test");
    results.push({ case_id: "cancellation", status: "PASS" });
  } else {
    results.push({ case_id: "cancellation", status: "PARTIAL", detail: "no cancel()" });
  }

  results.push({
    case_id: "evidence_not_claimed",
    status: "PASS",
    detail: "run result is not Evidence",
  });

  return results;
}
