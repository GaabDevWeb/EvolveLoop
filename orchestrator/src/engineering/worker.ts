/**
 * EngineeringWorker — materializes EngineeringTask via Runtime authorities.
 * Not an Agent. Does not call Providers outside A03-gated path.
 */

import { randomUUID } from "node:crypto";
import type { EventBus } from "../events/event-bus.js";
import type { Evidence } from "../types/index.js";
import { WorkerCheckpointStore } from "./checkpoint.js";
import { buildEngineeringEvidence } from "./evidence.js";
import { parseImplementationProposal } from "./proposal.js";
import { classifyEngineeringFailure } from "./repair.js";
import { applyWorkspaceOps } from "./runtime-effects.js";
import { executeTestCommand } from "./test-execute.js";
import { selectValidationCommands } from "./test-select.js";
import { emitEngineeringTelemetry } from "./telemetry.js";
import { buildValidationResult } from "./validate.js";
import type {
  EngineeringWorkRequest,
  EngineeringWorkResult,
  EngineeringWorkerCheckpoint,
  ImplementationProposalBody,
  TestExecutionResult,
  WorkspaceOp,
  WorkerPhase,
} from "./types.js";

export interface EngineeringWorkerOptions {
  checkpointStore: WorkerCheckpointStore;
  eventBus?: EventBus;
  denied_capabilities?: string[];
  /**
   * Optional repair proposer — returns new ops for TEST_FAILED / IMPLEMENTATION_INVALID.
   * Deterministic in tests; may wrap AgentExecutor in live evals.
   */
  repairProposer?: (ctx: {
    work: EngineeringWorkRequest;
    failed_proposal: ImplementationProposalBody;
    test_results: TestExecutionResult[];
    attempt: number;
  }) => ImplementationProposalBody | null;
}

export class EngineeringWorker {
  private store: WorkerCheckpointStore;
  private bus?: EventBus;
  private denied: string[];
  private repairProposer?: EngineeringWorkerOptions["repairProposer"];

  constructor(options: EngineeringWorkerOptions) {
    this.store = options.checkpointStore;
    this.bus = options.eventBus;
    this.denied = options.denied_capabilities ?? [];
    this.repairProposer = options.repairProposer;
  }

  /** Recover after crash — AT_LEAST_ONCE; does not claim exactly-once */
  recover(workId: string): EngineeringWorkerCheckpoint | null {
    const cp = this.store.load(workId);
    if (!cp) return null;
    if (["SUCCEEDED", "FAILED", "BLOCKED", "REPLAN_REQUIRED"].includes(cp.phase)) return cp;
    const next: EngineeringWorkerCheckpoint = {
      ...cp,
      phase: "RECOVERING",
      updated_at: new Date().toISOString(),
    };
    this.store.save(next);
    emitEngineeringTelemetry(this.bus, "EngineeringTaskRecovered", cp.task_id, {
      work_id: workId,
      phase: cp.phase,
    });
    return next;
  }

  async run(
    work: EngineeringWorkRequest,
    rawProposal: unknown,
  ): Promise<EngineeringWorkResult & { evidence?: Evidence }> {
    if (work.sandbox !== "NOT_IMPLEMENTED") {
      // Refuse fake sandbox claims
      return this.fail(work, "INVALID_CONTRACT", "sandbox must be NOT_IMPLEMENTED until real sandbox exists");
    }

    let checkpoint =
      this.store.load(work.work_id) ??
      ({
        kind: "EngineeringWorkerCheckpoint",
        apiVersion: "evolveloop.io/se/v1",
        work_id: work.work_id,
        phase: "PENDING" as WorkerPhase,
        assignment_id: work.assignment_id,
        task_id: work.task_id,
        iteration: 0,
        repair_attempt: 0,
        replan_attempt: 0,
        applied_effects: [],
        updated_at: new Date().toISOString(),
      } satisfies EngineeringWorkerCheckpoint);

    if (checkpoint.phase === "SUCCEEDED" && checkpoint.last_validation?.completion_decision === "COMPLETE") {
      return {
        kind: "EngineeringWorkResult",
        apiVersion: "evolveloop.io/se/v1",
        work_id: work.work_id,
        ok: true,
        phase: "SUCCEEDED",
        validation: checkpoint.last_validation,
        files_changed: checkpoint.applied_effects.map((e) => e.path),
        test_results: checkpoint.last_validation.test_results,
        evidence_refs: [],
        repair_attempted: checkpoint.repair_attempt > 0,
        replan_required: false,
        checkpoint,
      };
    }

    const parsed = parseImplementationProposal(rawProposal, work);
    emitEngineeringTelemetry(this.bus, "ImplementationProposed", work.task_id, {
      work_id: work.work_id,
      ok: parsed.ok,
    });

    if (!parsed.ok) {
      return this.fail(work, "IMPLEMENTATION_INVALID", parsed.errors.join("; "), checkpoint);
    }

    let proposal = parsed.proposal;
    emitEngineeringTelemetry(this.bus, "ImplementationValidated", work.task_id, {
      work_id: work.work_id,
      ops: proposal.operations.length,
    });

    checkpoint = this.savePhase(checkpoint, "PROPOSAL_VALIDATED");

    // Iteration budget (B01)
    while (checkpoint.iteration < work.budgets.max_iterations) {
      checkpoint.iteration += 1;
      if (checkpoint.iteration > work.budgets.max_iterations) {
        return this.fail(work, "BUDGET_EXHAUSTED", "max_iterations exceeded", checkpoint);
      }

      const applyResult = await this.applyPhase(work, proposal, checkpoint);
      if (!applyResult.ok) {
        const classified = classifyEngineeringFailure({ error_code: applyResult.error_code });
        if (classified.action === "block") {
          return this.block(work, applyResult.error_code!, applyResult.error_message!, checkpoint);
        }
        if (classified.action === "replan") {
          return this.replan(work, applyResult.error_code!, applyResult.error_message!, checkpoint);
        }
        // try repair path for implementation invalid
        const repaired = this.tryRepair(work, proposal, [], checkpoint);
        if (!repaired) {
          return this.fail(
            work,
            applyResult.error_code ?? "IMPLEMENTATION_INVALID",
            applyResult.error_message ?? "apply failed",
            checkpoint,
          );
        }
        proposal = repaired.proposal;
        checkpoint = repaired.checkpoint;
        continue;
      }

      checkpoint = applyResult.checkpoint!;
      const files_changed = [...new Set(checkpoint.applied_effects.map((e) => e.path))];

      emitEngineeringTelemetry(this.bus, "TestExecutionStarted", work.task_id, {
        work_id: work.work_id,
      });
      checkpoint = this.savePhase(checkpoint, "TESTING");

      const commands = selectValidationCommands(work, proposal);
      const test_results: TestExecutionResult[] = [];
      for (const cmd of commands) {
        const tr = await executeTestCommand(work, cmd, {
          denied_capabilities: this.denied,
          allow_shell: true,
        });
        test_results.push(tr);
        emitEngineeringTelemetry(this.bus, "TestExecutionCompleted", work.task_id, {
          work_id: work.work_id,
          command: cmd,
          passed: tr.passed,
          exit_code: tr.exit_code,
        });
      }

      emitEngineeringTelemetry(this.bus, "ValidationStarted", work.task_id, {
        work_id: work.work_id,
      });
      checkpoint = this.savePhase(checkpoint, "VALIDATING");

      const validation = buildValidationResult({
        work,
        proposal,
        files_changed,
        test_results,
        policy_status: "ALLOW",
        implementation_ok: true,
      });

      emitEngineeringTelemetry(this.bus, "ValidationCompleted", work.task_id, {
        work_id: work.work_id,
        decision: validation.completion_decision,
      });

      checkpoint.last_validation = validation;
      this.store.save(checkpoint);

      if (validation.completion_decision === "COMPLETE") {
        checkpoint = this.savePhase(checkpoint, "SUCCEEDED");
        const result: EngineeringWorkResult = {
          kind: "EngineeringWorkResult",
          apiVersion: "evolveloop.io/se/v1",
          work_id: work.work_id,
          ok: true,
          phase: "SUCCEEDED",
          validation,
          files_changed,
          test_results,
          evidence_refs: [`evidence://engineering/${work.work_id}`],
          repair_attempted: checkpoint.repair_attempt > 0,
          replan_required: false,
          checkpoint,
        };
        const evidence = buildEngineeringEvidence(work, result);
        emitEngineeringTelemetry(this.bus, "EngineeringTaskCompleted", work.task_id, {
          work_id: work.work_id,
          files: files_changed,
        });
        return { ...result, evidence };
      }

      if (validation.completion_decision === "BLOCK") {
        return this.block(work, "POLICY_BLOCKED", validation.outstanding_failures.join("; "), checkpoint);
      }

      if (validation.completion_decision === "REPLAN") {
        return this.replan(work, "REQUIRES_REPLAN", validation.outstanding_failures.join("; "), checkpoint);
      }

      // REPAIR / FAIL → attempt repair
      const classified = classifyEngineeringFailure({ validation });
      if (classified.action === "repair") {
        const repaired = this.tryRepair(work, proposal, test_results, checkpoint);
        if (!repaired) {
          return this.fail(
            work,
            "BUDGET_EXHAUSTED",
            `repair budget exhausted or no repair proposer; failures: ${validation.outstanding_failures.join("; ")}`,
            checkpoint,
          );
        }
        proposal = repaired.proposal;
        checkpoint = repaired.checkpoint;
        continue;
      }

      return this.fail(
        work,
        "TEST_FAILED",
        validation.outstanding_failures.join("; "),
        checkpoint,
      );
    }

    return this.fail(work, "BUDGET_EXHAUSTED", "max_iterations exceeded", checkpoint);
  }

  private async applyPhase(
    work: EngineeringWorkRequest,
    proposal: ImplementationProposalBody,
    checkpoint: EngineeringWorkerCheckpoint,
  ): Promise<{
    ok: boolean;
    checkpoint?: EngineeringWorkerCheckpoint;
    error_code?: string;
    error_message?: string;
  }> {
    emitEngineeringTelemetry(this.bus, "WorkspaceChangeStarted", work.task_id, {
      work_id: work.work_id,
      ops: proposal.operations.length,
    });
    checkpoint = this.savePhase(checkpoint, "APPLYING");

    const applied = await applyWorkspaceOps(work, proposal.operations, {
      prior_effects: checkpoint.applied_effects,
      denied_capabilities: this.denied,
      allow_write: true,
    });

    if (!applied.ok) {
      return {
        ok: false,
        error_code: applied.error_code,
        error_message: applied.error_message,
        checkpoint,
      };
    }

    checkpoint.applied_effects = [
      ...checkpoint.applied_effects,
      ...applied.effects.map((e) => e.fingerprint),
    ];
    checkpoint = this.savePhase(checkpoint, "APPLIED");
    emitEngineeringTelemetry(this.bus, "WorkspaceChangeCompleted", work.task_id, {
      work_id: work.work_id,
      files: applied.effects.map((e) => e.fingerprint.path),
      skipped: applied.skipped_idempotent,
    });
    return { ok: true, checkpoint };
  }

  private tryRepair(
    work: EngineeringWorkRequest,
    failed: ImplementationProposalBody,
    test_results: TestExecutionResult[],
    checkpoint: EngineeringWorkerCheckpoint,
  ): { proposal: ImplementationProposalBody; checkpoint: EngineeringWorkerCheckpoint } | null {
    if (checkpoint.repair_attempt >= work.budgets.max_repairs) return null;
    if (!this.repairProposer) return null;

    emitEngineeringTelemetry(this.bus, "RepairStarted", work.task_id, {
      work_id: work.work_id,
      attempt: checkpoint.repair_attempt + 1,
    });
    checkpoint = this.savePhase(checkpoint, "REPAIRING");
    checkpoint.repair_attempt += 1;

    const next = this.repairProposer({
      work,
      failed_proposal: failed,
      test_results,
      attempt: checkpoint.repair_attempt,
    });
    if (!next) return null;

    emitEngineeringTelemetry(this.bus, "RepairCompleted", work.task_id, {
      work_id: work.work_id,
      ops: next.operations.length,
    });
    this.store.save(checkpoint);
    return { proposal: next, checkpoint };
  }

  private savePhase(
    cp: EngineeringWorkerCheckpoint,
    phase: WorkerPhase,
  ): EngineeringWorkerCheckpoint {
    const next = { ...cp, phase, updated_at: new Date().toISOString() };
    this.store.save(next);
    return next;
  }

  private fail(
    work: EngineeringWorkRequest,
    code: string,
    message: string,
    checkpoint?: EngineeringWorkerCheckpoint,
  ): EngineeringWorkResult {
    if (checkpoint) {
      checkpoint.last_failure_code = code;
      checkpoint.last_failure_message = message;
      checkpoint = this.savePhase(checkpoint, "FAILED");
    }
    emitEngineeringTelemetry(this.bus, "EngineeringTaskFailed", work.task_id, {
      work_id: work.work_id,
      code,
      message,
    });
    return {
      kind: "EngineeringWorkResult",
      apiVersion: "evolveloop.io/se/v1",
      work_id: work.work_id,
      ok: false,
      phase: "FAILED",
      files_changed: checkpoint?.applied_effects.map((e) => e.path) ?? [],
      test_results: checkpoint?.last_validation?.test_results ?? [],
      evidence_refs: [],
      failure_code: code,
      failure_message: message,
      repair_attempted: (checkpoint?.repair_attempt ?? 0) > 0,
      replan_required: false,
      checkpoint,
      validation: checkpoint?.last_validation,
    };
  }

  private block(
    work: EngineeringWorkRequest,
    code: string,
    message: string,
    checkpoint: EngineeringWorkerCheckpoint,
  ): EngineeringWorkResult {
    checkpoint.last_failure_code = code;
    checkpoint.last_failure_message = message;
    checkpoint = this.savePhase(checkpoint, "BLOCKED");
    emitEngineeringTelemetry(this.bus, "EngineeringTaskBlocked", work.task_id, {
      work_id: work.work_id,
      code,
    });
    return {
      kind: "EngineeringWorkResult",
      apiVersion: "evolveloop.io/se/v1",
      work_id: work.work_id,
      ok: false,
      phase: "BLOCKED",
      files_changed: checkpoint.applied_effects.map((e) => e.path),
      test_results: checkpoint.last_validation?.test_results ?? [],
      evidence_refs: [],
      failure_code: code,
      failure_message: message,
      repair_attempted: checkpoint.repair_attempt > 0,
      replan_required: false,
      checkpoint,
      validation: checkpoint.last_validation,
    };
  }

  private replan(
    work: EngineeringWorkRequest,
    code: string,
    message: string,
    checkpoint: EngineeringWorkerCheckpoint,
  ): EngineeringWorkResult {
    if (checkpoint.replan_attempt >= work.budgets.max_replans) {
      return this.fail(work, "BUDGET_EXHAUSTED", "replan budget exhausted", checkpoint);
    }
    checkpoint.replan_attempt += 1;
    checkpoint.last_failure_code = code;
    checkpoint.last_failure_message = message;
    checkpoint = this.savePhase(checkpoint, "REPLAN_REQUIRED");
    return {
      kind: "EngineeringWorkResult",
      apiVersion: "evolveloop.io/se/v1",
      work_id: work.work_id,
      ok: false,
      phase: "REPLAN_REQUIRED",
      files_changed: checkpoint.applied_effects.map((e) => e.path),
      test_results: checkpoint.last_validation?.test_results ?? [],
      evidence_refs: [],
      failure_code: code,
      failure_message: message,
      repair_attempted: checkpoint.repair_attempt > 0,
      replan_required: true,
      checkpoint,
      validation: checkpoint.last_validation,
    };
  }
}

export function buildWorkRequest(partial: Omit<EngineeringWorkRequest, "kind" | "apiVersion" | "sandbox" | "work_id"> & {
  work_id?: string;
}): EngineeringWorkRequest {
  return {
    kind: "EngineeringWorkRequest",
    apiVersion: "evolveloop.io/se/v1",
    sandbox: "NOT_IMPLEMENTED",
    work_id: partial.work_id ?? `work-${randomUUID()}`,
    ...partial,
  };
}

/** Helper to build a correct add(a,b) repair proposal for the SE-05 fixture */
export function fixtureCorrectAddOps(): WorkspaceOp[] {
  return [
    {
      op: "replace_file",
      path: "src/math.js",
      content: `export function multiply(a, b) {\n  return a * b;\n}\n\nexport function add(a, b) {\n  return a + b;\n}\n`,
      rationale: "repair: implement add while preserving multiply",
    },
    {
      op: "replace_file",
      path: "tests/math.test.js",
      content: `import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { add, multiply } from "../src/math.js";\n\ntest("multiply product", () => {\n  assert.equal(multiply(3, 4), 12);\n});\n\ntest("add sums two numbers", () => {\n  assert.equal(add(2, 3), 5);\n});\n`,
      rationale: "ensure tests cover add + existing multiply",
    },
  ];
}
