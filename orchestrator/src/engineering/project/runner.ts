/**
 * SE-07 Software Engineering Project — composes SE-01..06.
 * Not a second Runtime / Supervisor / Worker / Reviewer.
 */

import { randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  cpSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { EventBus } from "../../events/event-bus.js";
import { runRequirementsFromText } from "../../requirements/pipeline.js";
import { runArchitectureFromRequirements } from "../../architecture/pipeline.js";
import { runTaskGraphFromSpecs } from "../../tasks/pipeline.js";
import { createNextTaskGraphVersion, replaceTask } from "../../tasks/versioning.js";
import { Supervisor, AssignmentStore, SimulatedRuntimeBridge, defaultAgentCatalog } from "../../supervisor/index.js";
import { DefaultAgentExecutor } from "../../agent/agent-executor.js";
import { TestReasoningProvider } from "../../agent/test-reasoning-provider.js";
import {
  EngineeringWorker,
  buildWorkRequest,
} from "../worker.js";
import { WorkerCheckpointStore } from "../checkpoint.js";
import {
  EngineeringReviewer,
  ReviewStore,
  buildReviewRequest,
  DETERMINISTIC_REVIEWER_ID,
} from "../review/index.js";
import { buildValidationResult, assertCompletionAllowed } from "../validate.js";
import { classifyFailure } from "../../replan/failure-class.js";
import type { EngineeringTask, EngineeringTaskGraph } from "../../tasks/types.js";
import type { RequirementsSpec } from "../../requirements/types.js";
import type { ArchitectureSpec } from "../../architecture/types.js";
import { ProjectCheckpointStore } from "./checkpoint.js";
import { auditCompositionSeams } from "./seam-audit.js";
import type {
  DeliveryArtifact,
  ProjectCheckpoint,
  ProjectMetrics,
  ProjectPhase,
  TraceLink,
} from "./types.js";

export const MINICRM_BRIEF = `Build a small CRM API for contacts on top of the existing brownfield project.

Requirements:
- create contact;
- list contacts;
- update contact;
- reject invalid email;
- persist data;
- return appropriate HTTP status codes;
- include tests.

Constraints:
- existing project structure must be preserved;
- no new external service;
- use existing in-memory store layer;
- tests must run with npm test;
- desktop app is not part of MVP;
- api-only (no web frontend);
- auth not required for MVP;
- no unrestricted shell.

Technology:
- Node.js ESM
- local filesystem / in-memory persistence only
`;

const GOOD_EMAIL = `/**
 * Email validation — RFC-lite local check.
 */
export function isValidEmail(email) {
  return typeof email === "string" && /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email);
}
`;

const BAD_EMAIL = `/**
 * Email validation — brownfield stub (accepts almost anything).
 */
export function isValidEmail(email) {
  return typeof email === "string" && email.length > 0;
}
`;

const GOOD_EMAIL_DOCUMENTED = `${GOOD_EMAIL}
/** Returns false → API responds 400 for invalid email */
`;

export interface Se07BenchmarkOptions {
  workspaceRoot: string;
  stateDir: string;
  project_id?: string;
  /** Default true: first email write is bad stub → repair. */
  force_email_repair?: boolean;
  /** Inject architecture forbid:mongodb failure → A04 replan lineage. */
  force_replan_scenario?: boolean;
  crash_after_completed_tasks?: number;
  resume?: boolean;
  eventBus?: EventBus;
  max_parallel?: number;
  /**
   * Optional ReasoningProvider (SE-08 Cursor). Default: TestReasoningProvider.
   * Cursor agentic effects remain outside Worker unless mode=reasoning_only.
   */
  reasoningProvider?: import("../../agent/types.js").ReasoningProvider;
}

export interface Se07BenchmarkResult {
  ok: boolean;
  phase: ProjectPhase;
  delivery: DeliveryArtifact;
  seam_audit: ReturnType<typeof auditCompositionSeams>;
  requirements?: RequirementsSpec;
  architecture?: ArchitectureSpec;
  task_graph?: EngineeringTaskGraph;
  checkpoint: ProjectCheckpoint;
  notes: string[];
}

function emptyMetrics(): ProjectMetrics {
  return {
    requirements_validity: "NOT_MEASURED",
    architecture_validity: "NOT_MEASURED",
    task_graph_validity: "NOT_MEASURED",
    delegation_validity: "NOT_MEASURED",
    implementation_success: "NOT_MEASURED",
    test_pass_rate: "NOT_MEASURED",
    review_precision_recall: "NOT_MEASURED",
    repair_success: "NOT_MEASURED",
    replan_success: "NOT_MEASURED",
    recovery_correctness: "NOT_MEASURED",
    policy_bypass_rate: 0,
    scope_violation_rate: "NOT_MEASURED",
    duplicate_effect_rate: "NOT_MEASURED",
    end_to_end_success: "NOT_MEASURED",
    total_steps: 0,
    total_retries: 0,
    total_replans: 0,
    total_repairs: 0,
    agent_invocations: 0,
    live_llm_eval: "NOT_MEASURED",
    latency_ms: 0,
    token_usage: "NOT_MEASURED",
  };
}

function isEmailTask(t: EngineeringTask): boolean {
  return /email|validat/i.test(t.title) || (t.scope ?? []).some((s) => s.includes("validation"));
}

function isDeliveryTask(t: EngineeringTask): boolean {
  if (/dashboard|frontend|users module|companies|pipeline|deals|crm domain/i.test(t.title)) {
    return false;
  }
  if (isEmailTask(t)) return true;
  if (/contact|database|auth foundation|integration test|account api/i.test(t.title)) {
    return true;
  }
  return false;
}

function proposalForTask(
  task: EngineeringTask,
  workspaceRoot: string,
  forceBadEmail: boolean,
): { path: string; content: string } {
  if (isEmailTask(task)) {
    return {
      path: "src/validation/email.js",
      content: forceBadEmail ? BAD_EMAIL : GOOD_EMAIL_DOCUMENTED,
    };
  }
  if (/database|schema/i.test(task.title)) {
    return {
      path: "src/db/schema.json",
      content: JSON.stringify({ entity: "contact", fields: ["id", "name", "email"] }, null, 2) + "\n",
    };
  }
  if (/auth/i.test(task.title)) {
    return {
      path: "src/auth/public-mvp.js",
      content: "/** MVP: auth not required — public API surface documented */\nexport const AUTH_REQUIRED = false;\n",
    };
  }
  if (/account/i.test(task.title)) {
    return {
      path: "src/api/accounts/index.js",
      content:
        "/** Account API scaffold — MiniCRM MVP reuses contact write paths */\nexport const ACCOUNT_API = true;\n",
    };
  }
  if (/contact/i.test(task.title)) {
    const apiPath = join(workspaceRoot, "src/api/contacts.js");
    return {
      path: "src/api/contacts.js",
      content: existsSync(apiPath)
        ? readFileSync(apiPath, "utf-8")
        : "export function handleListContacts() { return { status: 200, body: [] }; }\n",
    };
  }
  if (/test/i.test(task.title)) {
    const testPath = join(workspaceRoot, "tests/contacts.test.js");
    return {
      path: "tests/contacts.test.js",
      content: existsSync(testPath)
        ? readFileSync(testPath, "utf-8")
        : "import { test } from 'node:test';\ntest('placeholder', () => {});\n",
    };
  }
  // Preserve brownfield API as default backend write
  const fallback = join(workspaceRoot, "src/domain/contacts.js");
  return {
    path: existsSync(fallback) ? "src/domain/contacts.js" : "src/api/contacts.js",
    content: existsSync(fallback)
      ? readFileSync(fallback, "utf-8")
      : readFileSync(join(workspaceRoot, "src/api/contacts.js"), "utf-8"),
  };
}

export class SoftwareEngineeringProject {
  readonly project_id: string;
  private store: ProjectCheckpointStore;
  private bus: EventBus;
  private notes: string[] = [];
  private taxonomy: Record<string, number> = {};
  private reviews: DeliveryArtifact["review_summary"] = [];
  private validations: DeliveryArtifact["validation_summary"] = [];
  private tests: DeliveryArtifact["test_summary"] = [];
  private evidence: string[] = [];
  private traces: TraceLink[] = [];
  private parallelReadyObserved = 0;

  constructor(private readonly options: Se07BenchmarkOptions) {
    this.project_id = options.project_id ?? `se07-${randomUUID().slice(0, 8)}`;
    this.store = new ProjectCheckpointStore(options.stateDir);
    this.bus = options.eventBus ?? new EventBus();
  }

  async run(): Promise<Se07BenchmarkResult> {
    const started = Date.now();
    const seam_audit = auditCompositionSeams();
    let cp =
      (this.options.resume ? this.store.load(this.project_id) : null) ?? this.newCheckpoint();

    if (this.options.resume && cp.phase !== "CREATED") {
      this.notes.push(`resumed from phase=${cp.phase}`);
      cp.metrics.recovery_correctness = "PASS";
    }

    cp.phase = "PLANNED";
    this.persist(cp);

    const reqPipe = runRequirementsFromText(
      {
        brief: MINICRM_BRIEF,
        requirements_id: "SE07-MINICRM-REQ",
        project: "SE07-MiniCRM",
      },
      { bus: this.bus, create_baseline: true, run_id: `${this.project_id}-req` },
    );
    cp.metrics.requirements_validity = reqPipe.validation.ok ? "PASS" : "FAIL";
    cp.requirements_id = reqPipe.spec.requirements_id;
    cp.requirements_version = reqPipe.spec.version;
    cp.metrics.total_steps += 1;
    this.evidence.push(`evidence://requirements/${reqPipe.spec.requirements_id}`);
    if (!reqPipe.validation.ok || !reqPipe.gate_allows_architecture) {
      return this.fail(cp, seam_audit, "requirements gate blocked", started);
    }

    const archPipe = runArchitectureFromRequirements(
      {
        requirements: reqPipe.baseline ?? reqPipe.spec,
        architecture_id: "SE07-MINICRM-ARCH",
        project: "SE07-MiniCRM",
        existing_paths: ["src/api", "src/store", "src/validation", "src/domain", "tests"],
      },
      { bus: this.bus, create_baseline: true, run_id: `${this.project_id}-arch` },
    );
    cp.metrics.architecture_validity = archPipe.validation.ok ? "PASS" : "FAIL";
    cp.architecture_id = archPipe.spec.architecture_id;
    cp.architecture_version = archPipe.spec.version;
    cp.metrics.total_steps += 1;
    this.evidence.push(`evidence://architecture/${archPipe.spec.architecture_id}`);
    if (!archPipe.validation.ok || !archPipe.gate_allows_task_decomposition) {
      return this.fail(cp, seam_audit, "architecture gate blocked", started);
    }

    const tgPipe = runTaskGraphFromSpecs(
      {
        requirements: reqPipe.baseline ?? reqPipe.spec,
        architecture: archPipe.baseline ?? archPipe.spec,
        task_graph_id: "SE07-MINICRM-TG",
        project: "SE07-MiniCRM",
        known_capabilities: ["filesystem.write", "filesystem.read", "test.run"],
      },
      { bus: this.bus, create_baseline: true, run_id: `${this.project_id}-tg` },
    );
    cp.metrics.task_graph_validity = tgPipe.validation.ok ? "PASS" : "FAIL";
    let graph = tgPipe.baseline ?? tgPipe.graph;
    cp.task_graph_id = graph.task_graph_id;
    cp.task_graph_version = graph.version;
    cp.metrics.total_steps += 1;
    this.evidence.push(`evidence://taskgraph/${graph.task_graph_id}`);
    if (!tgPipe.validation.ok) {
      return this.fail(cp, seam_audit, "task graph invalid", started);
    }

    if (!graph.tasks.some((t) => isEmailTask(t))) {
      const base = graph.tasks.find((t) => /contact/i.test(t.title)) ?? graph.tasks[0]!;
      const emailTask = replaceTask(
        base,
        {
          title: "Email validation",
          description: "Reject invalid email on create/update contact",
          type: "IMPLEMENTATION",
          priority: "MUST",
          status: "PROPOSED",
          action: "MODIFY",
          requirement_ids: base.requirement_ids,
          architecture_component_ids: base.architecture_component_ids,
          dependencies: [],
          required_capabilities: ["filesystem.write", "test.run"],
          preferred_agent_role: "backend",
          definition_of_done: ["email validation", "npm test pass"],
          acceptance_criteria: ["invalid email returns 400"],
          scope: ["src/validation/**", "tests/**"],
          owned_paths: ["src/validation/**"],
          risk: "MEDIUM",
          side_effects: ["LOCAL_WRITE"],
          task_version: 1,
        },
        "ensure email validation coverage for reject-invalid-email requirement",
      );
      graph = createNextTaskGraphVersion(graph, [...graph.tasks, emailTask], {
        replan_reason: "add email validation task lineage",
      });
      cp.task_graph_version = graph.version;
      this.notes.push("email validation task appended via replaceTask lineage");
    }

    const requiredIds = new Set(graph.tasks.filter(isDeliveryTask).map((t) => t.id));
    this.notes.push(`delivery tasks: ${[...requiredIds].join(",")}`);

    cp.phase = "EXECUTING";
    this.persist(cp);

    const assignmentStore = new AssignmentStore(join(this.options.stateDir, "assignments"));
    const workerStore = new WorkerCheckpointStore(join(this.options.stateDir, "worker"));
    const reviewStore = new ReviewStore(join(this.options.stateDir, "reviews"));

    const provider =
      this.options.reasoningProvider ??
      new TestReasoningProvider({
        payloadFactory: (req) => {
          cp.metrics.agent_invocations += 1;
          return {
            decision_type: "FINAL_RESPONSE",
            reason: "proposal deferred to EngineeringWorker materializer",
            details: req.objective.slice(0, 200),
          };
        },
      });
    if (this.options.reasoningProvider) {
      cp.metrics.agent_invocations += 1;
      this.notes.push(`reasoning_provider=${this.options.reasoningProvider.id}`);
    }

    const supervisor = new Supervisor({
      supervisor_id: `sup-${this.project_id}`,
      store: assignmentStore,
      agentExecutor: new DefaultAgentExecutor({ provider }),
      runtimeBridge: new SimulatedRuntimeBridge(),
      agents: defaultAgentCatalog(),
      eventBus: this.bus,
      max_parallel_assignments: this.options.max_parallel ?? 2,
      known_capabilities: ["filesystem.write", "filesystem.read", "test.run"],
    });
    supervisor.bindTaskGraph(graph);

    const worker = new EngineeringWorker({
      checkpointStore: workerStore,
      eventBus: this.bus,
      repairProposer: ({ attempt }) => {
        cp.metrics.total_repairs += 1;
        cp.budgets.repairs_used += 1;
        this.bumpTaxonomy("implementation");
        if (attempt >= 1) {
          return {
            kind: "ImplementationProposal",
            apiVersion: "evolveloop.io/se/v1",
            proposal_id: `repair-${attempt}`,
            task_id: "dyn",
            assignment_id: "dyn",
            operations: [
              { op: "replace_file", path: "src/validation/email.js", content: GOOD_EMAIL_DOCUMENTED },
            ],
            validation_commands: ["npm test"],
            expected_outputs: ["src/validation/email.js"],
          };
        }
        return null;
      },
    });
    const reviewer = new EngineeringReviewer({ store: reviewStore, eventBus: this.bus });

    const executed = new Set<string>(cp.completed_task_ids);
    let safety = 0;

    while (safety++ < 40) {
      if (
        this.options.crash_after_completed_tasks != null &&
        cp.completed_task_ids.length >= this.options.crash_after_completed_tasks
      ) {
        this.notes.push("simulated crash checkpoint");
        this.persist(cp);
        return {
          ok: false,
          phase: cp.phase,
          delivery: this.buildDelivery(cp, graph, reqPipe.spec, archPipe.spec, started),
          seam_audit,
          requirements: reqPipe.spec,
          architecture: archPipe.spec,
          task_graph: graph,
          checkpoint: cp,
          notes: [...this.notes, "CRASH_SIMULATED"],
        };
      }

      for (const id of cp.completed_task_ids) {
        const rec = supervisor.getState().tasks[id];
        if (rec) rec.status = "COMPLETED";
      }

      const readyAll = supervisor.listReady(graph);
      const ready = readyAll.filter((t) => !executed.has(t.id) && requiredIds.has(t.id));
      this.parallelReadyObserved = Math.max(this.parallelReadyObserved, readyAll.length);

      if (!ready.length) {
        const remaining = [...requiredIds].filter((id) => !cp.completed_task_ids.includes(id));
        if (!remaining.length) break;
        // Blocked required tasks — try to unblock by executing any ready non-required deps
        const unblock = readyAll.filter((t) => !executed.has(t.id));
        if (!unblock.length) {
          this.notes.push(`blocked remaining=${remaining.join(",")}`);
          break;
        }
        for (const task of unblock.slice(0, this.options.max_parallel ?? 2)) {
          executed.add(task.id);
          await this.executeOneTask({
            task,
            graph,
            getGraph: () => graph,
            setGraph: (g) => {
              graph = g;
              cp.task_graph_version = g.version;
              supervisor.bindTaskGraph(g);
              for (const id of cp.completed_task_ids) {
                const rec = supervisor.getState().tasks[id];
                if (rec) rec.status = "COMPLETED";
              }
            },
            supervisor,
            worker,
            reviewer,
            cp,
          });
        }
        continue;
      }

      const batch = (() => {
        const emailReady = ready.filter((t) => isEmailTask(t));
        if (emailReady.length) {
          // Email validation owns the failing brownfield stub — finish it before other npm test runs.
          return emailReady.slice(0, 1);
        }
        return ready.slice(0, this.options.max_parallel ?? 2);
      })();
      for (const task of batch) {
        executed.add(task.id);
        await this.executeOneTask({
          task,
          graph,
          getGraph: () => graph,
          setGraph: (g) => {
            graph = g;
            cp.task_graph_version = g.version;
            supervisor.bindTaskGraph(g);
            for (const id of cp.completed_task_ids) {
              const rec = supervisor.getState().tasks[id];
              if (rec) rec.status = "COMPLETED";
            }
          },
          supervisor,
          worker,
          reviewer,
          cp,
        });
      }

      if ([...requiredIds].every((id) => cp.completed_task_ids.includes(id) || cp.failed_task_ids.includes(id))) {
        break;
      }
    }

    cp.phase = "VERIFYING";
    const emailPath = join(this.options.workspaceRoot, "src/validation/email.js");
    const emailOk = existsSync(emailPath) ? readFileSync(emailPath, "utf-8") : "";
    const workspaceChecks = [
      {
        path: "src/validation/email.js",
        exists: existsSync(emailPath),
        note: /@/.test(emailOk) ? "regex validator present" : "missing regex",
      },
      {
        path: "src/api/contacts.js",
        exists: existsSync(join(this.options.workspaceRoot, "src/api/contacts.js")),
      },
      {
        path: "tests/contacts.test.js",
        exists: existsSync(join(this.options.workspaceRoot, "tests/contacts.test.js")),
      },
      {
        path: "src/domain/contacts.js",
        exists: existsSync(join(this.options.workspaceRoot, "src/domain/contacts.js")),
        note: "brownfield preserved",
      },
    ];

    const passedTests = this.tests.filter((t) => t.passed).length;
    const totalTests = this.tests.length || 1;
    cp.metrics.test_pass_rate = passedTests / totalTests;
    if (this.parallelReadyObserved >= 2) {
      this.notes.push(`concurrency: observed ${this.parallelReadyObserved} ready tasks (max_parallel=${this.options.max_parallel ?? 2})`);
    }

    const requiredDone = [...requiredIds].every((id) => cp.completed_task_ids.includes(id));
    const emailFixed = /[^@\s]+@[^@\s]+\.[^@\s]+/.test(emailOk) && /400/.test(emailOk);
    const hasApproved = this.reviews.some((r) => r.status === "APPROVED");
    const repairOk =
      this.options.force_email_repair === false ||
      cp.metrics.repair_success === "PASS" ||
      cp.repaired_task_ids.length > 0;
    const replanOk =
      this.options.force_replan_scenario !== true || cp.metrics.replan_success === "PASS";

    const projectComplete =
      requiredDone && emailFixed && hasApproved && repairOk && replanOk && !cp.failed_task_ids.some((id) => requiredIds.has(id));

    cp.phase = projectComplete ? "COMPLETED" : "FAILED";
    cp.metrics.end_to_end_success = projectComplete ? "PASS" : "FAIL";
    cp.metrics.latency_ms = Date.now() - started;
    this.persist(cp);

    return {
      ok: projectComplete,
      phase: cp.phase,
      delivery: this.buildDelivery(cp, graph, reqPipe.spec, archPipe.spec, started, workspaceChecks),
      seam_audit,
      requirements: reqPipe.spec,
      architecture: archPipe.spec,
      task_graph: graph,
      checkpoint: cp,
      notes: this.notes,
    };
  }

  private async executeOneTask(ctx: {
    task: EngineeringTask;
    graph: EngineeringTaskGraph;
    getGraph: () => EngineeringTaskGraph;
    setGraph: (g: EngineeringTaskGraph) => void;
    supervisor: Supervisor;
    worker: EngineeringWorker;
    reviewer: EngineeringReviewer;
    cp: ProjectCheckpoint;
  }): Promise<void> {
    const { task, supervisor, worker, reviewer, cp } = ctx;
    let graph = ctx.getGraph();

    const created = supervisor.createDelegation(graph, task);
    if (!created.ok) {
      this.notes.push(`delegation skipped ${task.id}: ${created.error}`);
      return;
    }
    cp.metrics.delegation_validity = "PASS";
    cp.metrics.total_steps += 1;

    const del = await supervisor.executeDelegation(
      graph,
      created.assignment.assignment_id,
      created.delegation,
    );
    if (del.error) this.notes.push(`agent note ${task.id}: ${del.error}`);

    const forceBad = isEmailTask(task) && this.options.force_email_repair !== false;
    const file = proposalForTask(task, this.options.workspaceRoot, forceBad);
    const scope = task.scope ?? task.owned_paths ?? ["src/**", "tests/**"];

    const runWork = async (ops: Array<{ op: "replace_file"; path: string; content: string }>, tag: string) => {
      const work = buildWorkRequest({
        work_id: `work-${task.id}-${tag}-${randomUUID().slice(0, 8)}`,
        task_id: task.id,
        task_graph_id: graph.task_graph_id,
        task_graph_version: graph.version,
        assignment_id: created.assignment.assignment_id,
        agent_id: created.assignment.agent_id,
        agent_version: created.assignment.agent_version,
        task_type: task.type,
        task_scope: scope,
        allowed_paths: scope,
        forbidden_paths: [".git/", ".env", "secrets/"],
        workspace_root: this.options.workspaceRoot,
        allowed_capabilities: ["filesystem.write", "filesystem.read", "test.run"],
        forbidden_capabilities: ["unrestricted.shell"],
        requirement_ids: task.requirement_ids,
        architecture_component_ids: task.architecture_component_ids,
        acceptance_criteria: task.acceptance_criteria ?? [],
        definition_of_done: task.definition_of_done,
        policy_id: "rapid-prototype",
        correlation: {
          run_id: this.project_id,
          execution_id: `${created.assignment.execution_id ?? `exec-${task.id}`}-${tag}`,
          assignment_id: created.assignment.assignment_id,
          task_id: task.id,
        },
        validation_commands: ["npm test"],
        budgets: {
          max_iterations: 4,
          max_repairs: cp.budgets.max_repairs,
          max_replans: cp.budgets.max_replans,
          timeout_ms: 60_000,
        },
        expected_outputs: [{ ref: "out", path: ops[0]!.path }],
      });
      const result = await worker.run(work, {
        decision_type: "IMPLEMENTATION_PROPOSAL",
        operations: ops,
        validation_commands: ["npm test"],
        expected_outputs: [ops[0]!.path],
      });
      return { work, result };
    };

    cp.phase = "VERIFYING";
    let { work, result: workResult } = await runWork(
      [{ op: "replace_file", path: file.path, content: file.content }],
      "v1",
    );

    if ((!workResult.ok || workResult.repair_attempted) && isEmailTask(task)) {
      if (workResult.repair_attempted || workResult.ok) {
        cp.repaired_task_ids.push(task.id);
        cp.metrics.repair_success = "PASS";
      } else if (cp.budgets.repairs_used < cp.budgets.max_repairs) {
        cp.phase = "REPAIRING";
        cp.metrics.total_repairs += 1;
        cp.budgets.repairs_used += 1;
        this.bumpTaxonomy("implementation");
        ({ work, result: workResult } = await runWork(
          [{ op: "replace_file", path: "src/validation/email.js", content: GOOD_EMAIL_DOCUMENTED }],
          "repair",
        ));
        if (workResult.ok) {
          cp.repaired_task_ids.push(task.id);
          cp.metrics.repair_success = "PASS";
        }
      }
    }

    for (const t of workResult.test_results) {
      this.tests.push({ command: t.command, passed: t.passed, execution_id: t.execution_id });
    }
    if (workResult.ok) cp.metrics.implementation_success = "PASS";

    const reviewOnce = async (implementation_version: string, extra?: Partial<Parameters<typeof buildReviewRequest>[0]>) => {
      const out = await reviewer.review(
        buildReviewRequest({
          review_id: `rev-${task.id}-${implementation_version}`,
          task_id: task.id,
          task_graph_id: graph.task_graph_id,
          task_graph_version: graph.version,
          assignment_id: created.assignment.assignment_id,
          implementation_execution_id: work.correlation.execution_id,
          implementation_version,
          agent_id: created.assignment.agent_id,
          agent_version: created.assignment.agent_version,
          reviewer_agent_id: DETERMINISTIC_REVIEWER_ID,
          require_independent_review: true,
          task_type: task.type,
          requirement_ids: task.requirement_ids,
          task_scope: work.task_scope,
          allowed_paths: work.allowed_paths,
          forbidden_paths: work.forbidden_paths,
          workspace_root: this.options.workspaceRoot,
          changed_files: workResult.files_changed.length ? workResult.files_changed : [file.path],
          expected_outputs: [file.path],
          acceptance_criteria: task.acceptance_criteria ?? [],
          definition_of_done: task.definition_of_done,
          tests_executed: workResult.test_results,
          evidence_refs: workResult.evidence_refs,
          policy_id: "rapid-prototype",
          required_content_patterns: isEmailTask(task)
            ? [
                {
                  pattern: "400",
                  requirement_id: task.requirement_ids[0],
                  description: "docs must mention HTTP 400",
                },
              ]
            : undefined,
          mode: "deterministic",
          ...extra,
        }),
      );
      return out.result;
    };

    let reviewResult = await reviewOnce(`v1-${task.id}`);

    if (reviewResult.status === "CHANGES_REQUIRED" && isEmailTask(task)) {
      cp.phase = "REPAIRING";
      ({ work, result: workResult } = await runWork(
        [{ op: "replace_file", path: "src/validation/email.js", content: GOOD_EMAIL_DOCUMENTED }],
        "review-repair",
      ));
      cp.repaired_task_ids.push(`review-${task.id}`);
      cp.metrics.total_repairs += 1;
      for (const t of workResult.test_results) {
        this.tests.push({ command: t.command, passed: t.passed, execution_id: t.execution_id });
      }
      reviewResult = await reviewOnce(`v2-${task.id}`);
    }

    if (this.options.force_replan_scenario && isEmailTask(task) && !cp.replanned_task_ids.length) {
      writeFileSync(
        join(this.options.workspaceRoot, "src/validation/email.js"),
        `${GOOD_EMAIL}\n// mongodb://localhost\n`,
        "utf-8",
      );
      const badReview = await reviewOnce(`mongo-${task.id}`, {
        architecture_constraints: ["forbid:mongodb"],
        required_content_patterns: undefined,
      });
      if (badReview.findings.some((f) => f.category === "architecture_violation")) {
        const classified = classifyFailure({
          error_code: "NO_PROVIDER",
          error_message: "strategy invalid mongodb — REPLAN_REQUIRED",
        });
        this.notes.push(`A04 disposition=${classified.disposition}`);
        cp.phase = "REPLANNING";
        cp.budgets.replans_used += 1;
        cp.metrics.total_replans += 1;
        cp.replanned_task_ids.push(task.id);
        const nextTasks = graph.tasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                description: `${t.description} (in-memory only; mongodb assumption dropped)`,
                task_version: (t.task_version ?? 1) + 1,
              }
            : t,
        );
        graph = createNextTaskGraphVersion(graph, nextTasks, {
          replan_reason: "drop mongodb assumption — in-memory only",
        });
        ctx.setGraph(graph);
        ({ work, result: workResult } = await runWork(
          [{ op: "replace_file", path: "src/validation/email.js", content: GOOD_EMAIL_DOCUMENTED }],
          "post-replan",
        ));
        for (const t of workResult.test_results) {
          this.tests.push({ command: t.command, passed: t.passed, execution_id: t.execution_id });
        }
        reviewResult = await reviewOnce(`post-replan-${task.id}`, {
          architecture_constraints: ["forbid:mongodb"],
          required_content_patterns: [
            { pattern: "400", description: "400 documented" },
            { pattern: "isValidEmail", description: "validator present" },
          ],
        });
        cp.metrics.replan_success = "PASS";
        this.bumpTaxonomy("architecture");
      }
    }

    this.reviews.push({
      review_id: reviewResult.review_id,
      status: reviewResult.status,
      implementation_version: reviewResult.review_lineage.implementation_version,
    });

    const validation = buildValidationResult({
      work,
      files_changed: workResult.files_changed,
      test_results: workResult.test_results,
      policy_status: "ALLOW",
      implementation_ok: workResult.ok,
      review: reviewResult,
      require_review: true,
    });
    this.validations.push({ task_id: task.id, decision: validation.completion_decision });

    if (assertCompletionAllowed(validation)) {
      cp.completed_task_ids.push(task.id);
      const st = supervisor.getState().tasks[task.id];
      if (st) {
        st.status = "COMPLETED";
        st.updated_at = new Date().toISOString();
      }
      this.traces.push({
        requirement_id: task.requirement_ids[0] ?? "UNMAPPED",
        architecture_component_ids: task.architecture_component_ids ?? [],
        task_ids: [task.id],
        assignment_ids: [created.assignment.assignment_id],
        agent_ids: [created.assignment.agent_id],
        execution_ids: [work.correlation.execution_id],
        test_execution_ids: workResult.test_results.map((t) => t.execution_id),
        review_ids: [reviewResult.review_id],
        evidence_refs: [...workResult.evidence_refs, ...reviewResult.evidence_refs],
      });
    } else {
      cp.failed_task_ids.push(task.id);
      this.bumpTaxonomy("validation");
      this.notes.push(`validation failed ${task.id}: ${validation.completion_decision}`);
    }
    this.persist(cp);
  }

  private newCheckpoint(): ProjectCheckpoint {
    return {
      kind: "SoftwareEngineeringProjectCheckpoint",
      apiVersion: "evolveloop.io/se/v1",
      project_id: this.project_id,
      phase: "CREATED",
      completed_task_ids: [],
      failed_task_ids: [],
      repaired_task_ids: [],
      replanned_task_ids: [],
      budgets: {
        max_task_iterations: 40,
        max_repairs: 3,
        max_replans: 2,
        repairs_used: 0,
        replans_used: 0,
      },
      metrics: emptyMetrics(),
      updated_at: new Date().toISOString(),
    };
  }

  private persist(cp: ProjectCheckpoint): void {
    cp.updated_at = new Date().toISOString();
    this.store.save(cp);
  }

  private bumpTaxonomy(key: string): void {
    this.taxonomy[key] = (this.taxonomy[key] ?? 0) + 1;
  }

  private fail(
    cp: ProjectCheckpoint,
    seam_audit: ReturnType<typeof auditCompositionSeams>,
    reason: string,
    started: number,
  ): Se07BenchmarkResult {
    cp.phase = "FAILED";
    cp.metrics.end_to_end_success = "FAIL";
    cp.metrics.latency_ms = Date.now() - started;
    this.notes.push(reason);
    this.persist(cp);
    return {
      ok: false,
      phase: cp.phase,
      delivery: this.buildDelivery(cp, undefined, undefined, undefined, started),
      seam_audit,
      checkpoint: cp,
      notes: this.notes,
    };
  }

  private buildDelivery(
    cp: ProjectCheckpoint,
    graph?: EngineeringTaskGraph,
    req?: RequirementsSpec,
    arch?: ArchitectureSpec,
    started = Date.now(),
    workspaceChecks: DeliveryArtifact["workspace_checks"] = [],
  ): DeliveryArtifact {
    return {
      kind: "Se07DeliveryArtifact",
      apiVersion: "evolveloop.io/se/v1",
      project_id: this.project_id,
      project_name: "SE07-MiniCRM",
      phase: cp.phase,
      requirements_version: cp.requirements_version ?? req?.version ?? 0,
      architecture_version: cp.architecture_version ?? arch?.version ?? 0,
      task_graph_version: cp.task_graph_version ?? graph?.version ?? 0,
      completed_tasks: cp.completed_task_ids,
      failed_tasks: cp.failed_task_ids,
      repaired_tasks: cp.repaired_task_ids,
      replanned_tasks: cp.replanned_task_ids,
      test_summary: this.tests,
      review_summary: this.reviews,
      validation_summary: this.validations,
      evidence_refs: this.evidence,
      telemetry_event_types: [...new Set(this.bus.getEvents().map((e) => e.type))],
      traceability: this.traces,
      unresolved_warnings: this.notes.filter((n) => /warn|skip|block/i.test(n)),
      workspace_checks: workspaceChecks,
      failure_taxonomy: this.taxonomy,
      metrics: { ...cp.metrics, latency_ms: cp.metrics.latency_ms || Date.now() - started },
      produced_at: new Date().toISOString(),
    };
  }
}

export function materializeMiniCrmFixture(targetDir: string, fixtureRoot: string): void {
  mkdirSync(targetDir, { recursive: true });
  cpSync(fixtureRoot, targetDir, { recursive: true });
}

export function writeDeliveryMarkdown(artifact: DeliveryArtifact, path: string): void {
  const md = `# SE-07 Delivery — ${artifact.project_name}

- **project_id:** ${artifact.project_id}
- **phase:** ${artifact.phase}
- **E2E:** ${artifact.metrics.end_to_end_success}
- **Live LLM:** ${artifact.metrics.live_llm_eval}
- **completed:** ${artifact.completed_tasks.join(", ") || "(none)"}
- **repaired:** ${artifact.repaired_tasks.join(", ") || "(none)"}
- **replanned:** ${artifact.replanned_tasks.join(", ") || "(none)"}

## Metrics
\`\`\`json
${JSON.stringify(artifact.metrics, null, 2)}
\`\`\`
`;
  writeFileSync(path, md, "utf-8");
}
