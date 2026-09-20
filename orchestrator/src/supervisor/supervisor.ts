/**
 * Supervisor — distributes EngineeringTask work via AgentExecutor.
 * Does NOT execute Providers/Capabilities directly.
 */

import { randomUUID } from "node:crypto";
import type { EventBus } from "../events/event-bus.js";
import type { AgentExecutor, AgentExecutionResult } from "../agent/types.js";
import { assembleAgentExecutionRequest } from "../agent/context-assembler.js";
import type { EngineeringTask, EngineeringTaskGraph } from "../tasks/types.js";
import { AssignmentStore } from "./assignment-store.js";
import { selectEligibleAgents, evaluateAgentEligibility } from "./eligibility.js";
import {
  countActiveAssignments,
  initialTaskStatuses,
  listReadyTasks,
  recomputeReadiness,
} from "./readiness.js";
import { buildDelegationResult, validateDelegationDecision } from "./validate-decision.js";
import { decisionNeedsRuntime } from "./runtime-bridge.js";
import { buildDelegationEvidence } from "./evidence.js";
import { emitSupervisorTelemetry } from "./telemetry.js";
import type {
  AgentAssignment,
  AgentContract,
  DelegationRequest,
  DelegationResult,
  RuntimeBridge,
  SupervisorState,
  TaskRuntimeRecord,
} from "./types.js";
import type { Evidence } from "../types/index.js";

export interface SupervisorOptions {
  supervisor_id: string;
  store: AssignmentStore;
  agentExecutor: AgentExecutor;
  runtimeBridge: RuntimeBridge;
  agents: AgentContract[];
  eventBus?: EventBus;
  max_parallel_assignments?: number;
  lease_ms?: number;
  known_capabilities?: string[];
}

export interface DelegateTaskResult {
  ok: boolean;
  assignment?: AgentAssignment;
  delegation?: DelegationRequest;
  result?: DelegationResult;
  evidence?: Evidence;
  error?: string;
}

export class Supervisor {
  readonly supervisor_id: string;
  private store: AssignmentStore;
  private executor: AgentExecutor;
  private bridge: RuntimeBridge;
  private agents: AgentContract[];
  private bus?: EventBus;
  private maxParallel: number;
  private leaseMs: number;
  private knownCaps?: string[];
  private state: SupervisorState | null = null;

  constructor(options: SupervisorOptions) {
    this.supervisor_id = options.supervisor_id;
    this.store = options.store;
    this.executor = options.agentExecutor;
    this.bridge = options.runtimeBridge;
    this.agents = options.agents;
    this.bus = options.eventBus;
    this.maxParallel = options.max_parallel_assignments ?? 4;
    this.leaseMs = options.lease_ms ?? 60_000;
    this.knownCaps = options.known_capabilities;
  }

  /** Load or initialize supervisor state for a task graph baseline */
  bindTaskGraph(graph: EngineeringTaskGraph): SupervisorState {
    const existing = this.store.loadState();
    if (
      existing &&
      existing.task_graph_id === graph.task_graph_id &&
      existing.task_graph_version === graph.version
    ) {
      this.state = existing;
      return existing;
    }

    const statuses = initialTaskStatuses(graph);
    const tasks: Record<string, TaskRuntimeRecord> = {};
    for (const [id, status] of Object.entries(statuses)) {
      tasks[id] = { task_id: id, status, updated_at: new Date().toISOString() };
    }

    this.state = {
      kind: "SupervisorState",
      apiVersion: "evolveloop.io/se/v1",
      task_graph_id: graph.task_graph_id,
      task_graph_version: graph.version,
      supervisor_id: this.supervisor_id,
      tasks,
      assignments: {},
      completed_result_fingerprints: [],
      max_parallel_assignments: this.maxParallel,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.state;
  }

  getState(): SupervisorState {
    if (!this.state) {
      const loaded = this.store.loadState();
      if (!loaded) throw new Error("Supervisor not bound to TaskGraph");
      this.state = loaded;
    }
    return this.state;
  }

  private persist(): void {
    if (!this.state) return;
    this.state.updated_at = new Date().toISOString();
    this.store.saveState(this.state);
  }

  listReady(graph: EngineeringTaskGraph): EngineeringTask[] {
    const state = this.getState();
    return listReadyTasks(graph, state);
  }

  createDelegation(
    graph: EngineeringTaskGraph,
    task: EngineeringTask,
    agent?: AgentContract,
  ): { ok: true; assignment: AgentAssignment; delegation: DelegationRequest } | { ok: false; error: string } {
    const state = this.getState();
    if (state.task_graph_id !== graph.task_graph_id || state.task_graph_version !== graph.version) {
      return { ok: false, error: "TaskGraph version mismatch — stale graph rejected" };
    }

    recomputeReadiness(graph, state);
    const rec = state.tasks[task.id];
    if (!rec || rec.status !== "READY") {
      return { ok: false, error: `task ${task.id} not READY (status=${rec?.status})` };
    }

    if (countActiveAssignments(state) >= this.maxParallel) {
      return { ok: false, error: "max parallel assignments reached (B01/concurrency)" };
    }

    // Prevent double assignment while active
    const activeForTask = Object.values(state.assignments).find(
      (a) =>
        a.task_id === task.id &&
        ["PENDING", "CLAIMED", "RUNNING", "WAITING_RUNTIME", "RECOVERING"].includes(a.status),
    );
    if (activeForTask) {
      return { ok: false, error: `task already has active assignment ${activeForTask.assignment_id}` };
    }

    const candidates = selectEligibleAgents(task, this.agents);
    const chosen = agent ?? candidates[0];
    if (!chosen) {
      return { ok: false, error: "no eligible agent" };
    }
    const elig = evaluateAgentEligibility(task, chosen);
    if (!elig.ok) {
      return { ok: false, error: elig.reasons.join("; ") };
    }

    const attempt =
      Object.values(state.assignments).filter((a) => a.task_id === task.id).length + 1;
    const execution_id = `exec-${randomUUID()}`;
    const assignment = this.store.createPending({
      assignment_id: this.store.newAssignmentId(),
      task_id: task.id,
      task_graph_id: graph.task_graph_id,
      task_graph_version: graph.version,
      agent_id: chosen.agent_id,
      agent_version: chosen.agent_version,
      role: chosen.role,
      scope: task.scope ?? task.owned_paths ?? [],
      required_capabilities: task.required_capabilities ?? [],
      policy_reference: "rapid-prototype",
      parent_execution_id: undefined,
      execution_id,
      delegation_attempt: attempt,
      supervisor_id: this.supervisor_id,
    });

    state.assignments[assignment.assignment_id] = assignment;
    this.persist();

    const delegation = this.buildDelegationRequest(graph, task, assignment, chosen);
    emitSupervisorTelemetry(this.bus, "DelegationCreated", graph.task_graph_id, {
      assignment_id: assignment.assignment_id,
      task_id: task.id,
      agent_id: chosen.agent_id,
    });

    return { ok: true, assignment, delegation };
  }

  claimDelegation(assignmentId: string): {
    ok: boolean;
    assignment?: AgentAssignment;
    error?: string;
  } {
    const claim = this.store.claimAssignment(assignmentId, {
      supervisorId: this.supervisor_id,
      leaseMs: this.leaseMs,
    });
    if (!claim.ok || !claim.assignment) {
      return { ok: false, error: claim.reason ?? "claim failed" };
    }
    const state = this.getState();
    state.assignments[assignmentId] = claim.assignment;
    const taskRec = state.tasks[claim.assignment.task_id];
    if (taskRec) {
      taskRec.status = "CLAIMED";
      taskRec.assignment_id = assignmentId;
      taskRec.updated_at = new Date().toISOString();
    }
    this.persist();
    emitSupervisorTelemetry(this.bus, "DelegationClaimed", claim.assignment.task_graph_id, {
      assignment_id: assignmentId,
      supervisor_id: this.supervisor_id,
    });
    return { ok: true, assignment: claim.assignment };
  }

  /**
   * Full happy-path step: claim → AgentExecutor → validate → Runtime bridge → complete.
   * Still never lets Agent call Provider.
   */
  async executeDelegation(
    graph: EngineeringTaskGraph,
    assignmentId: string,
    delegation: DelegationRequest,
  ): Promise<DelegateTaskResult> {
    const claimed = this.claimDelegation(assignmentId);
    if (!claimed.ok || !claimed.assignment) {
      return { ok: false, error: claimed.error };
    }

    let assignment = this.store.transition(assignmentId, "RUNNING", {
      started_at: new Date().toISOString(),
    });
    this.syncAssignment(assignment);
    emitSupervisorTelemetry(this.bus, "AgentStarted", graph.task_graph_id, {
      assignment_id: assignmentId,
      agent_id: assignment.agent_id,
    });

    const agentReq = assembleAgentExecutionRequest({
      execution_id: assignment.execution_id ?? delegation.correlation.execution_id,
      task_id: assignment.task_id,
      attempt: assignment.delegation_attempt - 1,
      agent_id: assignment.agent_id,
      agent_version: assignment.agent_version,
      role: assignment.role,
      objective: delegation.objective,
      decision_mode: "ANSWER",
      policy_summary: delegation.policy_summary,
      workspace_authority_summary: {
        allow_write: false,
        allow_shell: false,
        allow_network: false,
      },
      available_capabilities: delegation.allowed_capabilities,
      resource_budget_summary: {
        remaining_iterations: 10,
        remaining_replans: 3,
      },
    });

    // Context isolation: do not pass secrets / other tasks
    const execResult: AgentExecutionResult = await this.executor.execute(agentReq);
    emitSupervisorTelemetry(this.bus, "AgentDecisionReceived", graph.task_graph_id, {
      assignment_id: assignmentId,
      success: execResult.success,
      decision_type: execResult.decision?.decision_type,
    });

    if (!execResult.success || !execResult.decision) {
      const result = buildDelegationResult({
        assignment_id: assignmentId,
        task_id: assignment.task_id,
        outcome: "FAILED",
        validation_ok: false,
        validation_errors: [execResult.error?.message ?? "agent failed"],
        message: "AgentExecutor failure",
        execution_id: assignment.execution_id,
      });
      assignment = this.failAssignment(assignment, result, "AGENT_FAILURE");
      return { ok: false, assignment, delegation, result, error: result.message };
    }

    return this.submitAgentDecision(graph, assignment, delegation, execResult.decision);
  }

  async submitAgentDecision(
    graph: EngineeringTaskGraph,
    assignment: AgentAssignment,
    delegation: DelegationRequest,
    decisionRaw: unknown,
  ): Promise<DelegateTaskResult> {
    // Stale graph protection
    if (assignment.task_graph_version !== graph.version) {
      return {
        ok: false,
        error: "stale assignment for TaskGraph version",
        assignment,
      };
    }

    // Terminal / duplicate protection
    const latest = this.store.loadAssignment(assignment.assignment_id) ?? assignment;
    if (latest.status === "SUCCEEDED" || latest.status === "CANCELLED") {
      return {
        ok: false,
        assignment: latest,
        error: "duplicate result ignored — assignment already terminal",
      };
    }
    assignment = latest;

    const validated = validateDelegationDecision(decisionRaw, {
      delegation,
      expected_assignment_id: assignment.assignment_id,
      expected_task_id: assignment.task_id,
      known_capabilities: this.knownCaps,
    });

    emitSupervisorTelemetry(this.bus, "DecisionValidated", graph.task_graph_id, {
      assignment_id: assignment.assignment_id,
      ok: validated.ok,
      outcome: validated.outcome,
    });

    if (!validated.ok || !validated.decision) {
      const result = buildDelegationResult({
        assignment_id: assignment.assignment_id,
        task_id: assignment.task_id,
        outcome: "INVALID",
        decision: validated.decision,
        validation_ok: false,
        validation_errors: validated.errors,
        execution_id: assignment.execution_id,
      });
      // Idempotency: duplicate invalid fingerprints ignored if already recorded
      if (this.isDuplicateFingerprint(result.fingerprint)) {
        return { ok: false, assignment, result, error: "duplicate result ignored" };
      }
      this.recordFingerprint(result.fingerprint);
      const failed = this.failAssignment(assignment, result, "INVALID_DECISION");
      return { ok: false, assignment: failed, delegation, result, error: validated.errors.join("; ") };
    }

    const decision = validated.decision;

    if (validated.outcome === "REQUIRES_REPLAN") {
      const result = buildDelegationResult({
        assignment_id: assignment.assignment_id,
        task_id: assignment.task_id,
        outcome: "REQUIRES_REPLAN",
        decision,
        decision_id: decision.decision_id,
        validation_ok: true,
        execution_id: assignment.execution_id,
        message: "A04 replan required — Supervisor does not mutate TaskGraph",
      });
      this.store.transition(assignment.assignment_id, "BLOCKED", {
        decision_id: decision.decision_id,
        failure_code: "REQUIRES_REPLAN",
        completed_at: new Date().toISOString(),
      });
      this.markTask(assignment.task_id, "BLOCKED", assignment.assignment_id);
      emitSupervisorTelemetry(this.bus, "DelegationReplanRequested", graph.task_graph_id, {
        assignment_id: assignment.assignment_id,
        task_id: assignment.task_id,
      });
      return { ok: false, assignment, delegation, result, error: "REQUIRES_REPLAN" };
    }

    if (validated.outcome === "BLOCKED" || validated.outcome === "WAITING_CONFIRMATION") {
      const result = buildDelegationResult({
        assignment_id: assignment.assignment_id,
        task_id: assignment.task_id,
        outcome: validated.outcome,
        decision,
        decision_id: decision.decision_id,
        validation_ok: true,
        execution_id: assignment.execution_id,
      });
      this.store.transition(assignment.assignment_id, "WAITING_RUNTIME", {
        decision_id: decision.decision_id,
      });
      this.markTask(assignment.task_id, "WAITING_RUNTIME", assignment.assignment_id);
      emitSupervisorTelemetry(this.bus, "DelegationBlocked", graph.task_graph_id, {
        assignment_id: assignment.assignment_id,
        outcome: validated.outcome,
      });
      return { ok: false, assignment, delegation, result, error: validated.outcome };
    }

    if (validated.outcome === "FAILED") {
      const result = buildDelegationResult({
        assignment_id: assignment.assignment_id,
        task_id: assignment.task_id,
        outcome: "FAILED",
        decision,
        decision_id: decision.decision_id,
        validation_ok: true,
        execution_id: assignment.execution_id,
      });
      const failed = this.failAssignment(assignment, result, "AGENT_DECLARED_FAILURE");
      return { ok: false, assignment: failed, delegation, result };
    }

    // Runtime path
    let runtime_effect: DelegationResult["runtime_effect"] = {
      attempted: false,
      allowed: false,
      provider_invoked: false,
    };

    if (decisionNeedsRuntime(decision) || validated.outcome === "NEEDS_EXECUTION") {
      assignment = this.store.transition(assignment.assignment_id, "WAITING_RUNTIME", {
        decision_id: decision.decision_id,
      });
      this.markTask(assignment.task_id, "WAITING_RUNTIME", assignment.assignment_id);
      emitSupervisorTelemetry(this.bus, "RuntimeExecutionStarted", graph.task_graph_id, {
        assignment_id: assignment.assignment_id,
        execution_id: assignment.execution_id,
      });

      const rt = await this.bridge.executeDecision({
        assignment,
        delegation,
        decision,
        execution_id: assignment.execution_id ?? delegation.correlation.execution_id,
      });

      emitSupervisorTelemetry(this.bus, "RuntimeExecutionCompleted", graph.task_graph_id, {
        assignment_id: assignment.assignment_id,
        gate: rt.gate_decision,
        ok: rt.ok,
      });

      runtime_effect = {
        attempted: true,
        allowed: rt.gate_decision === "ALLOW",
        gate_decision: rt.gate_decision,
        provider_invoked: rt.provider_invoked,
        success: rt.success,
        evidence_refs: rt.evidence_refs,
      };

      if (rt.gate_decision === "CONFIRMATION_REQUIRED") {
        const result = buildDelegationResult({
          assignment_id: assignment.assignment_id,
          task_id: assignment.task_id,
          outcome: "WAITING_CONFIRMATION",
          decision,
          decision_id: decision.decision_id,
          validation_ok: true,
          execution_id: assignment.execution_id,
          runtime_effect,
          message: "CONFIRMATION_REQUIRED — Supervisor cannot auto-confirm (A03)",
        });
        return { ok: false, assignment, delegation, result, error: "CONFIRMATION_REQUIRED" };
      }

      if (rt.gate_decision === "DENY") {
        // POLICY_BLOCKED must not be rewritten as generic FAILED success path
        const result = buildDelegationResult({
          assignment_id: assignment.assignment_id,
          task_id: assignment.task_id,
          outcome: "BLOCKED",
          decision,
          decision_id: decision.decision_id,
          validation_ok: true,
          execution_id: assignment.execution_id,
          runtime_effect,
          message: rt.error_code === "POLICY_BLOCKED" ? "POLICY_BLOCKED" : rt.error_message,
        });
        if (this.isDuplicateFingerprint(result.fingerprint)) {
          return { ok: false, assignment, result, error: "duplicate result ignored" };
        }
        this.recordFingerprint(result.fingerprint);
        const failed = this.store.transition(assignment.assignment_id, "BLOCKED", {
          failure_code: rt.error_code ?? "POLICY_BLOCKED",
          failure_message: rt.error_message,
          completed_at: new Date().toISOString(),
          result_fingerprint: result.fingerprint,
        });
        this.markTask(assignment.task_id, "BLOCKED", assignment.assignment_id);
        this.syncAssignment(failed);
        emitSupervisorTelemetry(this.bus, "DelegationBlocked", graph.task_graph_id, {
          assignment_id: assignment.assignment_id,
          code: rt.error_code,
        });
        return { ok: false, assignment: failed, delegation, result, error: result.message };
      }

      if (rt.ok && rt.success) {
        return this.completeDelegation(graph, assignment, delegation, decision, runtime_effect);
      }

      const result = buildDelegationResult({
        assignment_id: assignment.assignment_id,
        task_id: assignment.task_id,
        outcome: "FAILED",
        decision,
        decision_id: decision.decision_id,
        validation_ok: true,
        execution_id: assignment.execution_id,
        runtime_effect,
        message: rt.error_message ?? "runtime failure",
      });
      const failed = this.failAssignment(assignment, result, rt.error_code ?? "RUNTIME_FAILURE");
      return { ok: false, assignment: failed, delegation, result };
    }

    // Analytical completion without runtime effect — still requires validation, not agent "done" alone
    if (decision.decision_type === "FINAL_RESPONSE") {
      return this.completeDelegation(graph, assignment, delegation, decision, runtime_effect);
    }

    const result = buildDelegationResult({
      assignment_id: assignment.assignment_id,
      task_id: assignment.task_id,
      outcome: "DECISION_PRODUCED",
      decision,
      decision_id: decision.decision_id,
      validation_ok: true,
      execution_id: assignment.execution_id,
      runtime_effect,
      message: "Decision produced but not marked complete without runtime/DoD satisfaction",
    });
    return { ok: true, assignment, delegation, result };
  }

  private completeDelegation(
    graph: EngineeringTaskGraph,
    assignment: AgentAssignment,
    delegation: DelegationRequest,
    decision: import("../agent/types.js").AgentDecision,
    runtime_effect: DelegationResult["runtime_effect"],
  ): DelegateTaskResult {
    // Completion requires: validation ok + (runtime success when effects needed) + not agent self-claim alone
    const needsEffect = decisionNeedsRuntime(decision);
    if (needsEffect && !runtime_effect?.success) {
      return {
        ok: false,
        error: "cannot complete task without runtime success evidence",
        assignment,
      };
    }

    const result = buildDelegationResult({
      assignment_id: assignment.assignment_id,
      task_id: assignment.task_id,
      outcome: "DECISION_PRODUCED",
      decision,
      decision_id: decision.decision_id,
      validation_ok: true,
      execution_id: assignment.execution_id,
      runtime_effect,
    });

    if (this.isDuplicateFingerprint(result.fingerprint)) {
      return { ok: true, assignment, result, error: "duplicate completion ignored" };
    }
    // Stale result: if already SUCCEEDED with different newer fingerprint, reject overwrite
    const current = this.store.loadAssignment(assignment.assignment_id);
    if (current?.status === "SUCCEEDED" && current.result_fingerprint && current.result_fingerprint !== result.fingerprint) {
      return { ok: false, assignment: current, error: "stale result cannot overwrite newer completion" };
    }

    this.recordFingerprint(result.fingerprint);
    const done = this.store.transition(assignment.assignment_id, "SUCCEEDED", {
      decision_id: decision.decision_id,
      completed_at: new Date().toISOString(),
      result_fingerprint: result.fingerprint,
    });
    this.markTask(assignment.task_id, "COMPLETED", assignment.assignment_id, {
      last_decision_id: decision.decision_id,
      last_execution_id: assignment.execution_id,
    });
    this.syncAssignment(done);
    recomputeReadiness(graph, this.getState());
    this.persist();

    const evidence = buildDelegationEvidence(
      delegation.correlation.run_id,
      done,
      result,
    );
    emitSupervisorTelemetry(this.bus, "DelegationSucceeded", graph.task_graph_id, {
      assignment_id: assignment.assignment_id,
      task_id: assignment.task_id,
    });

    return { ok: true, assignment: done, delegation, result, evidence };
  }

  /**
   * Crash recovery — mark expired leases as RECOVERING, allow reclaim.
   * At-least-once: does not claim exactly-once.
   */
  recover(): { recovered: string[] } {
    const recovered: string[] = [];
    const now = Date.now();
    for (const a of this.store.listAssignments()) {
      if (!["CLAIMED", "RUNNING", "WAITING_RUNTIME"].includes(a.status)) continue;
      if (a.lease_until && Date.parse(a.lease_until) > now) continue;
      try {
        this.store.releaseLock(a.assignment_id);
        const next = this.store.transition(a.assignment_id, "RECOVERING", {
          failure_message: "lease expired — recovering",
          lease_until: new Date(now - 1).toISOString(),
        });
        this.syncAssignment(next);
        this.markTask(a.task_id, "READY"); // allow redelegation after recovery
        recovered.push(a.assignment_id);
        emitSupervisorTelemetry(this.bus, "DelegationRecovered", a.task_graph_id, {
          assignment_id: a.assignment_id,
        });
      } catch {
        /* transition may fail if already terminal */
      }
    }
    this.persist();
    return { recovered };
  }

  private buildDelegationRequest(
    graph: EngineeringTaskGraph,
    task: EngineeringTask,
    assignment: AgentAssignment,
    agent: AgentContract,
  ): DelegationRequest {
    const satisfied = task.dependencies
      .map((d) => d.task_id)
      .filter((id) => this.getState().tasks[id]?.status === "COMPLETED");

    return {
      kind: "DelegationRequest",
      apiVersion: "evolveloop.io/se/v1",
      assignment_id: assignment.assignment_id,
      task_id: task.id,
      task_graph_id: graph.task_graph_id,
      task_graph_version: graph.version,
      agent_id: agent.agent_id,
      agent_version: agent.agent_version,
      role: agent.role,
      objective: `${task.title}: ${task.description}`,
      requirement_ids: task.requirement_ids,
      architecture_component_ids: task.architecture_component_ids,
      allowed_capabilities: (task.required_capabilities?.length
        ? task.required_capabilities
        : agent.allowed_capabilities
      )
        .filter((c) => !(agent.forbidden_capabilities ?? []).includes(c))
        .map((capability_id) => ({
          capability_id,
          available: true,
          risk: "medium" as const,
        })),
      forbidden_capabilities: [
        ...(agent.forbidden_capabilities ?? []),
        "unrestricted.shell",
        "unrestricted.filesystem",
        "unrestricted.network",
      ],
      task_scope: task.scope ?? task.owned_paths ?? [],
      owned_paths: task.owned_paths,
      inputs: task.inputs?.map((i) => ({ ref: i.artifact_id, type: i.type })),
      expected_outputs: task.outputs?.map((o) => ({ ref: o.artifact_id, type: o.type })),
      acceptance_criteria: task.acceptance_criteria,
      definition_of_done: task.definition_of_done,
      risk: task.risk,
      side_effects: task.side_effects,
      satisfied_dependencies: satisfied,
      policy_summary: { policy_id: assignment.policy_reference, fail_fast: false },
      evidence_requirements: task.evidence_requirements?.map((e) => ({
        kind: e.kind,
        description: e.description,
      })),
      correlation: {
        run_id: `run-${graph.task_graph_id}`,
        execution_id: assignment.execution_id ?? `exec-${assignment.assignment_id}`,
        assignment_id: assignment.assignment_id,
        task_id: task.id,
      },
      context_authority: "none",
    };
  }

  private failAssignment(
    assignment: AgentAssignment,
    result: DelegationResult,
    code: string,
  ): AgentAssignment {
    emitSupervisorTelemetry(this.bus, "DelegationFailed", assignment.task_graph_id, {
      assignment_id: assignment.assignment_id,
      code,
    });
    this.recordFingerprint(result.fingerprint);
    const failed = this.store.transition(assignment.assignment_id, "FAILED", {
      failure_code: code,
      failure_message: result.message,
      completed_at: new Date().toISOString(),
      result_fingerprint: result.fingerprint,
      decision_id: result.decision_id,
    });
    this.markTask(assignment.task_id, "FAILED", assignment.assignment_id);
    this.syncAssignment(failed);
    return failed;
  }

  private markTask(
    taskId: string,
    status: TaskRuntimeRecord["status"],
    assignmentId?: string,
    extra?: Partial<TaskRuntimeRecord>,
  ): void {
    const state = this.getState();
    const rec = state.tasks[taskId] ?? {
      task_id: taskId,
      status: "PENDING",
      updated_at: new Date().toISOString(),
    };
    rec.status = status;
    rec.updated_at = new Date().toISOString();
    if (assignmentId) rec.assignment_id = assignmentId;
    if (status === "COMPLETED" && assignmentId) {
      rec.completed_assignment_ids = [...(rec.completed_assignment_ids ?? []), assignmentId];
    }
    Object.assign(rec, extra);
    state.tasks[taskId] = rec;
    this.persist();
  }

  private syncAssignment(a: AgentAssignment): void {
    const state = this.getState();
    state.assignments[a.assignment_id] = a;
    this.persist();
  }

  private isDuplicateFingerprint(fp: string): boolean {
    return this.getState().completed_result_fingerprints.includes(fp);
  }

  private recordFingerprint(fp: string): void {
    const state = this.getState();
    if (!state.completed_result_fingerprints.includes(fp)) {
      state.completed_result_fingerprints.push(fp);
      this.persist();
    }
  }
}
