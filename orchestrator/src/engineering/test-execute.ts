/**
 * Run allowlisted tests via DeterministicProvider shell/test.run + A03.
 */

import { randomUUID } from "node:crypto";
import { evaluatePreExecute } from "../gates/runtime-gates.js";
import { createDeterministicProvider } from "../providers/deterministic/index.js";
import type { ExecuteRequest, GraphNode } from "../types/index.js";
import type { EngineeringWorkRequest, TestExecutionResult } from "./types.js";
import { isAllowedTestCommand } from "./test-select.js";

export async function executeTestCommand(
  work: EngineeringWorkRequest,
  command: string,
  options: { denied_capabilities?: string[]; allow_shell?: boolean } = {},
): Promise<TestExecutionResult> {
  const timestamp = new Date().toISOString();
  const execution_id = `test-${randomUUID().slice(0, 8)}`;

  if (!isAllowedTestCommand(command)) {
    return {
      kind: "TestExecutionResult",
      apiVersion: "evolveloop.io/se/v1",
      execution_id,
      command,
      exit_code: null,
      passed: false,
      failed: true,
      skipped: false,
      duration_ms: 0,
      stderr_excerpt: "command not in test allowlist",
      timestamp,
      verified_by_runtime: true,
    };
  }

  if (
    !work.allowed_capabilities.includes("test.run") &&
    !work.allowed_capabilities.includes("shell.execute") &&
    !work.allowed_capabilities.includes("*")
  ) {
    return {
      kind: "TestExecutionResult",
      apiVersion: "evolveloop.io/se/v1",
      execution_id,
      command,
      exit_code: null,
      passed: false,
      failed: true,
      skipped: false,
      duration_ms: 0,
      stderr_excerpt: "test.run/shell.execute not allowed for this WorkRequest",
      timestamp,
      verified_by_runtime: true,
    };
  }

  const capability = work.allowed_capabilities.includes("test.run") ? "test.run" : "shell.execute";
  const provider = createDeterministicProvider({
    id: "engineering-test",
    workspaceRoot: work.workspace_root,
    authority: {
      workspaceRoot: work.workspace_root,
      allowWrite: false,
      allowShell: options.allow_shell !== false,
      confirmed: true,
    },
  });

  const node: GraphNode = {
    id: `eng-test-${execution_id}`,
    capability,
    type: "worker",
    dependencies: [],
    definition_of_done: [],
    status: "pending",
    retry_count: 0,
    constraints: { command, cwd: "." },
  };

  const gate = evaluatePreExecute({
    node,
    provider: provider as never,
    authority: {
      workspaceRoot: work.workspace_root,
      allowShell: options.allow_shell !== false,
      confirmed: true,
    },
    gateContext: { denied_capabilities: options.denied_capabilities ?? [] },
    plan_hash: `eng-test-${work.work_id}`,
    confirmed_for_plan_hash: `eng-test-${work.work_id}`,
    run_id: work.correlation.run_id,
    execution_id,
    policy_id: work.policy_id,
  });

  if (gate.decision !== "ALLOW") {
    return {
      kind: "TestExecutionResult",
      apiVersion: "evolveloop.io/se/v1",
      execution_id,
      command,
      exit_code: null,
      passed: false,
      failed: true,
      skipped: false,
      duration_ms: 0,
      stderr_excerpt: `gate ${gate.decision}: ${gate.reason}`,
      timestamp,
      verified_by_runtime: true,
    };
  }

  const req: ExecuteRequest = {
    run_id: work.correlation.run_id,
    node_id: node.id,
    capability,
    inputs: [{ ref: `command:${command}` }],
    definition_of_done: [],
    policy: { retries_remaining: 0, timeout_ms: work.budgets.timeout_ms },
    memory_scope: "engineering-test",
    knowledge_hits: [],
    briefing: `SE-05 test ${command}`,
    node,
    authority_context: {
      workspaceRoot: work.workspace_root,
      allowShell: true,
      confirmed: true,
    },
  };

  const result = await provider.execute(req);
  const payload =
    result.evidence &&
    typeof result.evidence.spec === "object" &&
    result.evidence.spec &&
    "normalized" in result.evidence.spec
      ? (result.evidence.spec as { normalized?: Record<string, unknown> }).normalized
      : undefined;

  const exit_code =
    payload && typeof payload.exit_code === "number"
      ? payload.exit_code
      : result.success
        ? 0
        : 1;
  const timed_out = payload && payload.timed_out === true;
  const passed = result.success && exit_code === 0 && !timed_out;

  return {
    kind: "TestExecutionResult",
    apiVersion: "evolveloop.io/se/v1",
    execution_id,
    command,
    exit_code,
    passed,
    failed: !passed,
    skipped: false,
    duration_ms: result.duration_ms,
    stdout_excerpt: payload && typeof payload.stdout_excerpt === "string" ? payload.stdout_excerpt : undefined,
    stderr_excerpt:
      (payload && typeof payload.stderr_excerpt === "string" ? payload.stderr_excerpt : undefined) ??
      result.error?.message,
    evidence_ref: result.evidence?.id,
    timestamp,
    verified_by_runtime: true,
    timed_out,
    affected_scope: work.task_scope,
  };
}
