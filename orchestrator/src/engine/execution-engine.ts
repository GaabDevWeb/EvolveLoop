import type {
  CapabilityIR,
  CapabilityRegistry,
  ExecuteResult,
  GraphNode,
  OrchestratorDecision,
  RunInput,
  RunResult,
} from "../types/index.js";
import { GraphStore } from "../graph/graph-store.js";
import { EventBus } from "../events/event-bus.js";
import { PolicyEngine } from "../policies/policy-engine.js";
import { RegistryClient } from "../registry/registry-client.js";
import { KnowledgeStore } from "../knowledge/knowledge-store.js";
import { MemoryStore } from "../memory/memory-store.js";
import { JsonlEventPersister } from "../persistence/jsonl-event-persister.js";
import type { DataPaths } from "../persistence/paths.js";
import { MetricsAccumulator } from "../telemetry/metrics-accumulator.js";
import { Orchestrator } from "../orchestrator/orchestrator.js";
import { Scheduler } from "../scheduler/scheduler.js";
import { ProviderRouter } from "../providers/mock-provider.js";
import { validateEvidence } from "../evidence/validator.js";
import type { ContractRegistry } from "../contracts/contract-registry.js";
import { loadContractsFromDir } from "../contracts/contract-registry.js";
import { PluginLoader } from "../plugins/plugin-loader.js";
import { JobFileExecutor } from "../plugins/cursor-skill-provider.js";
import {
  discoverManifestForCapability,
  type DiscoveryOptions,
} from "../discovery/provider-discovery.js";
import { validateIR } from "../ir/validator.js";
import { deriveRunState } from "../state/run-state.js";
import { PatternAggregator } from "../learning/pattern-aggregator.js";
import type { Evidence, FeatureRunState } from "../types/index.js";
import { JobStore } from "../jobs/job-store.js";
import { jobResultToExecuteResult } from "../jobs/job-resume.js";
import {
  saveCheckpoint,
  loadAndValidateCheckpoint,
  clearCheckpoint,
  reconcileInFlightGraph,
  serializeAccounting,
  deserializeAccounting,
  claimExecutionRecovery,
  releaseExecutionRecovery,
  listRecoverableExecutions,
  type EngineCheckpoint,
} from "../jobs/checkpoint.js";
import type { Scheduler as SchedulerType } from "../scheduler/scheduler.js";
import type { LongitudinalEvolveLoop } from "../evolveloop/longitudinal-controller.js";
import { attachEvolveLoopObserver } from "../evolveloop/adapters/runtime-observer.js";
import type { AnalysisScope } from "../evolveloop/longitudinal-types.js";
import type { LiveAnalysisCoordinator } from "../evolveloop/live/live-coordinator.js";
import type { Replanner } from "../replan/types.js";
import {
  applyReplanPreservingCompleted,
  failureSignature,
  hashCapabilityIR,
  stampPlanLineage,
} from "../replan/index.js";
import { validateExecutableIR } from "../planning/preflight.js";
import { evaluatePreExecute, type RuntimeGateContext } from "../gates/runtime-gates.js";
import type { AuthorityContext } from "../authority/capability-authority.js";
import { newRunId } from "../ir/validator.js";
import {
  createAccounting,
  featureTimedOut,
  remainingFeatureMs,
  recordProviderTried,
  type ExecutionBudget,
  type ResourceAccounting,
  POLICY_DEFAULTS,
} from "../policies/policy-engine.js";
import type { ExecutionPolicy, RunHandle } from "../types/index.js";
import { buildAuthorityEvidence } from "../evidence/builders.js";

export interface ExecutionEngineOptions {
  registry: CapabilityRegistry;
  knowledge?: KnowledgeStore;
  memory?: MemoryStore;
  providers: ProviderRouter;
  policiesDir?: string;
  dataPaths?: DataPaths;
  persistEvents?: boolean;
  contracts?: ContractRegistry;
  contractsDir?: string;
  /** Enable runtime provider discovery when select fails */
  discovery?: DiscoveryOptions;
  agentsRoot?: string;
  jobsDir?: string;
  /** Poll interval when waiting for external job completion (ms). Default 500. */
  jobPollIntervalMs?: number;
  /** Opt-in EvolveLoop observer — attach after EventBus creation; never required. */
  evolveLoop?: LongitudinalEvolveLoop;
  /** Required with evolveLoop — default observation scope when events lack user/project. */
  evolveScope?: AnalysisScope;
  /**
   * Opt-in live coordinator — when set with evolveLoop+evolveScope, ingest notifies
   * cadence → automatic scoped analyze (non-blocking).
   */
  evolveCoordinator?: LiveAnalysisCoordinator;
  /**
   * V2 A04 — produces candidate CapabilityIR on replan decision.
   * Absent ⇒ REPLAN_UNAVAILABLE (safe stop), never silent infinite retry.
   */
  replanner?: Replanner;
  /** Max automatic replans per run. Default 3. */
  maxReplans?: number;
  /**
   * V2 A03 — runtime authority flags for CapabilityAuthority.
   * When omitted, defaults are permissive (V1 compat) but deny-lists / path escape
   * / required skill gates still enforce when gateContext declares them.
   */
  authorityContext?: AuthorityContext;
  /**
   * V2 A03 — required skill gates, grounding, capability deny-list.
   * Evaluated PRE_EXECUTE on every schedule candidate (including post-replan).
   */
  gateContext?: RuntimeGateContext;
  /**
   * If true, a prior `confirmed` flag remains valid after replan for the new plan hash.
   * Default false — confirmation must be revalidated (A03).
   */
  inheritConfirmationAcrossReplan?: boolean;
}

export class ExecutionEngine {
  private policyEngine: PolicyEngine;
  private orchestrator = new Orchestrator();
  private registry: RegistryClient;
  private knowledge: KnowledgeStore;
  private memory: MemoryStore;
  private providers: ProviderRouter;
  private dataPaths?: DataPaths;
  private persistEvents: boolean;
  private contracts?: ContractRegistry;
  private discovery?: DiscoveryOptions;
  private agentsRoot?: string;
  private jobsDir?: string;
  private jobPollIntervalMs: number;
  private evolveLoop?: LongitudinalEvolveLoop;
  private evolveScope?: AnalysisScope;
  private evolveCoordinator?: LiveAnalysisCoordinator;
  private replanner?: Replanner;
  private maxReplans: number;
  /** True when caller passed maxReplans explicitly (overrides policy snapshot). */
  private maxReplansFromOptions: boolean;
  private authorityContext: AuthorityContext;
  private gateContext?: RuntimeGateContext;
  private inheritConfirmationAcrossReplan: boolean;
  /** Resolved once per run — immutable for the duration of the execution. */
  private policySnapshot: ExecutionPolicy | null = null;
  private budget: ExecutionBudget | null = null;
  private accounting: ResourceAccounting = createAccounting();
  private checkpointRevision = 0;
  private featureStartedAtIso = "";

  private orchestratorDecision: OrchestratorDecision | null = null;
  private blockedReason: string | null = null;
  private replanIr: CapabilityIR | null = null;
  private runState: FeatureRunState = "created";
  private paused = false;
  private aborted = false;
  private allEvidence: Evidence[] = [];
  private nodesExecuted = 0;
  private currentIr: CapabilityIR | null = null;
  private replanCount = 0;
  private recentPlanHashes: string[] = [];
  private lastFailureSignature?: string;
  private lastErrorCode?: string;
  private lastFailedProviderId?: string;
  private lastFailedNodeId?: string;
  private executionId = "";
  private currentPlanHash = "";
  private confirmedForPlanHash?: string;

  constructor(options: ExecutionEngineOptions) {
    this.policyEngine = new PolicyEngine({ policiesDir: options.policiesDir });
    this.knowledge = options.knowledge ?? new KnowledgeStore();
    this.memory = options.memory ?? new MemoryStore();
    this.providers = options.providers;
    this.dataPaths = options.dataPaths;
    this.persistEvents = options.persistEvents ?? !!options.dataPaths;
    this.contracts =
      options.contracts ??
      (options.contractsDir ? loadContractsFromDir(options.contractsDir) : undefined);
    this.discovery = options.discovery;
    this.agentsRoot = options.agentsRoot;
    this.jobsDir = options.jobsDir;
    this.jobPollIntervalMs = options.jobPollIntervalMs ?? 500;
    this.evolveLoop = options.evolveLoop;
    this.evolveScope = options.evolveScope;
    this.evolveCoordinator = options.evolveCoordinator;
    this.replanner = options.replanner;
    this.maxReplans = options.maxReplans ?? POLICY_DEFAULTS.MAX_REPLANS;
    this.maxReplansFromOptions = options.maxReplans !== undefined;
    this.registry = new RegistryClient(options.registry, this.contracts);
    // V1 compat defaults: permissive unless caller restricts authorityContext
    this.authorityContext = options.authorityContext ?? {
      allowWrite: true,
      allowShell: true,
      allowNetwork: true,
    };
    this.gateContext = options.gateContext;
    this.inheritConfirmationAcrossReplan = options.inheritConfirmationAcrossReplan ?? false;
    if (this.authorityContext.confirmed) {
      // Will bind to plan hash once run() stamps currentPlanHash
      this.confirmedForPlanHash = "__pending__";
    }
  }

  async run(input: RunInput): Promise<RunResult> {
    const errors = validateIR(input.ir);
    if (errors.some((e) => ["IR_CYCLE_DETECTED", "IR_DUPLICATE_ID", "IR_DANGLING_EDGE"].includes(e.code))) {
      throw new Error(`IR validation failed: ${errors.map((e) => e.message).join(", ")}`);
    }

    const policyId = input.policy_id ?? input.ir.metadata.policy_ref ?? "high-reliability";
    const featureId = input.feature_id ?? input.ir.metadata.id;
    const waitForJobsMs = input.wait_for_jobs_ms ?? 0;
    const waitStartedAt = Date.now();
    const workerId = input.worker_id ?? `worker-${process.pid}`;

    // B04: optional auto-recover discovery (CLI may pass resume without knowing id)
    let resumeCheckpoint: EngineCheckpoint | null = null;
    if (input.resume && this.jobsDir) {
      const validated = loadAndValidateCheckpoint(this.jobsDir, featureId);
      if (validated.ok) {
        resumeCheckpoint = validated.checkpoint;
      } else if (input.auto_recover) {
        const list = listRecoverableExecutions(this.jobsDir);
        resumeCheckpoint = list[0] ?? null;
      }
      if (input.resume && this.jobsDir && resumeCheckpoint) {
        const claim = claimExecutionRecovery(this.jobsDir, resumeCheckpoint.feature_id, {
          workerId,
          leaseMs: 120_000,
        });
        if (!claim.ok && claim.reason === "active_lease") {
          throw new Error(`RECOVERY_CLAIM_FAILED: active_lease on ${resumeCheckpoint.feature_id}`);
        }
        // Reload after claim (revision bumped)
        const again = loadAndValidateCheckpoint(this.jobsDir, resumeCheckpoint.feature_id);
        if (again.ok) resumeCheckpoint = again.checkpoint;
      }
    }

    // Policy snapshot: resolve once — OR restore from checkpoint (survives crash + config change)
    let policy = this.policyEngine.resolve(policyId, input.orchestrator_overrides);
    if (resumeCheckpoint?.policy_snapshot) {
      policy = structuredClone(resumeCheckpoint.policy_snapshot);
    }
    this.policySnapshot = structuredClone(policy);
    this.budget = this.policyEngine.budget(this.policySnapshot, {
      maxReplansOverride: this.maxReplansFromOptions ? this.maxReplans : undefined,
    });
    this.maxReplans = this.budget.max_replans;
    this.accounting = createAccounting();
    this.checkpointRevision = 0;
    this.featureStartedAtIso = new Date().toISOString();
    const budget = this.budget;

    const eventBus = new EventBus();
    let detachPersister: (() => void) | undefined;
    let detachObserver: (() => void) | undefined;

    if (this.persistEvents && this.dataPaths) {
      const persister = new JsonlEventPersister(this.dataPaths.eventsDir);
      detachPersister = persister.attach(eventBus, featureId);
    }

    if (this.evolveLoop && this.evolveScope) {
      try {
        detachObserver = attachEvolveLoopObserver(eventBus, this.evolveLoop, {
          scope: this.evolveScope,
          session_id: featureId,
          coordinator: this.evolveCoordinator,
        });
      } catch {
        /* opt-in observer must never break run() */
      }
    }

    try {
      this.memory.initFeature(featureId, {
        ir_id: input.ir.metadata.id,
        policy: policy.metadata.id,
      });

      const metrics = new MetricsAccumulator(featureId);
    const scheduler = new Scheduler(
      this.policyEngine,
      eventBus,
      this.knowledge,
      this.providers,
      featureId,
    );
    this.activeScheduler = scheduler;

    let graph: GraphStore;
    this.runState = "active";
    this.allEvidence = [];
    this.nodesExecuted = 0;
    this.paused = false;
    this.aborted = false;
    this.blockedReason = null;
    this.orchestratorDecision = null;

    if (resumeCheckpoint) {
      eventBus.emit("RecoveryStarted", featureId, "engine", {
        execution_id: resumeCheckpoint.execution_id,
        checkpoint_id: resumeCheckpoint.checkpoint_id,
        revision: resumeCheckpoint.revision,
        worker_id: workerId,
      });
      eventBus.emit("CheckpointLoaded", featureId, "engine", {
        checkpoint_id: resumeCheckpoint.checkpoint_id,
        revision: resumeCheckpoint.revision,
        plan_version: resumeCheckpoint.plan_version,
        plan_hash: resumeCheckpoint.plan_hash,
      });

      const reconciled = reconcileInFlightGraph(resumeCheckpoint.graph);
      graph = GraphStore.fromSnapshot(reconciled.graph);
      for (const c of reconciled.classifications) {
        if (c.class === "RETRYABLE" || c.class === "REQUIRES_RECONCILIATION") {
          eventBus.emit("NodeRecovered", featureId, "engine", {
            node_id: c.node_id,
            from: c.from,
            recovery_class: c.class,
          });
        }
      }
      eventBus.emit("ExecutionReconciled", featureId, "engine", {
        nodes: reconciled.classifications.length,
        delivery_semantics: resumeCheckpoint.delivery_semantics,
      });

      this.executionId = resumeCheckpoint.execution_id;
      this.currentIr = resumeCheckpoint.current_ir;
      this.currentPlanHash = resumeCheckpoint.plan_hash;
      this.recentPlanHashes = [...resumeCheckpoint.recent_plan_hashes];
      this.replanCount = resumeCheckpoint.replan_count;
      this.checkpointRevision = resumeCheckpoint.revision;
      this.lastErrorCode = resumeCheckpoint.last_error_code;
      this.lastFailedNodeId = resumeCheckpoint.last_failed_node_id;
      this.lastFailedProviderId = resumeCheckpoint.last_failed_provider_id;
      this.blockedReason = resumeCheckpoint.blocked_reason ?? null;
      this.accounting = deserializeAccounting(resumeCheckpoint.accounting);
      this.featureStartedAtIso = resumeCheckpoint.feature_started_at;
      // Absolute deadline survives process death
      this.accounting.started_at_ms = resumeCheckpoint.accounting.started_at_ms;

      eventBus.emit("ExecutionResumed", featureId, "engine", {
        execution_id: this.executionId,
        plan_version: resumeCheckpoint.plan_version,
        replan_count: this.replanCount,
        iterations: this.accounting.iterations,
        tokens_used: this.accounting.tokens_used,
        policy_id: resumeCheckpoint.policy_snapshot.metadata.id,
      });
    } else {
      if (input.resume && this.jobsDir) {
        const rejected = loadAndValidateCheckpoint(this.jobsDir, featureId);
        if (!rejected.ok && rejected.code !== "NOT_FOUND") {
          eventBus.emit("CheckpointRejected", featureId, "engine", {
            code: rejected.code,
            reason: rejected.reason,
          });
          eventBus.emit("RecoveryFailed", featureId, "engine", {
            code: rejected.code,
            reason: rejected.reason,
          });
          throw new Error(`RECOVERY_FAILED:${rejected.code}:${rejected.reason}`);
        }
      }
      this.replanCount = 0;
      this.lastFailureSignature = undefined;
      this.lastErrorCode = undefined;
      this.lastFailedProviderId = undefined;
      this.lastFailedNodeId = undefined;
      this.executionId = input.ir.metadata.execution_id ?? featureId;
      this.currentIr = stampPlanLineage(input.ir, {
        execution_id: this.executionId,
        plan_version: input.ir.metadata.plan_version ?? 1,
        parent_plan_id: input.ir.metadata.parent_plan_id,
      });
      this.recentPlanHashes = [hashCapabilityIR(this.currentIr)];
      this.currentPlanHash = this.recentPlanHashes[0]!;
      if (this.confirmedForPlanHash === "__pending__" || this.authorityContext.confirmed) {
        this.confirmedForPlanHash = this.currentPlanHash;
      }
      graph = new GraphStore(this.currentIr);
      this.featureStartedAtIso = new Date().toISOString();
      this.accounting.started_at_ms = Date.now();
    }

    if (this.confirmedForPlanHash === "__pending__" || this.authorityContext.confirmed) {
      if (!this.confirmedForPlanHash || this.confirmedForPlanHash === "__pending__") {
        this.confirmedForPlanHash = this.currentPlanHash;
      }
    }
    const patternAggregator = new PatternAggregator();

    eventBus.emit("FeatureStarted", featureId, "engine", {
      ir_id: this.currentIr?.metadata.id ?? input.ir.metadata.id,
      policy_id: policy.metadata.id,
      resumed: !!resumeCheckpoint,
    });

    const subscribeMetrics = (e: Parameters<EventBus["emit"]>[0]) => {
      void e;
    };
    void subscribeMetrics;

    for (const event of eventBus.getEvents()) metrics.recordEvent(event);

    eventBus.subscribe("ProviderSelected", (e) => metrics.recordEvent(e));
    eventBus.subscribe("RetryScheduled", (e) => metrics.recordEvent(e));
    eventBus.subscribe("SubgraphInvalidated", (e) => metrics.recordEvent(e));
    eventBus.subscribe("PlannerReplan", (e) => metrics.recordEvent(e));

    const maxIterations = budget.max_iterations;
    let iterations = 0;

    while (!graph.isFinished() && iterations++ < maxIterations && !this.aborted) {
      this.accounting.iterations = iterations;

      if (featureTimedOut(budget, this.accounting)) {
        this.blockedReason = "TIMEOUT";
        this.lastErrorCode = "EXECUTION_TIMEOUT";
        eventBus.emit("ExecutionTimeout", featureId, "engine", {
          execution_id: this.executionId,
          feature_timeout_ms: budget.feature_timeout_ms,
          elapsed_ms: Date.now() - this.accounting.started_at_ms,
          policy_id: budget.policy_id,
        });
        this.allEvidence.push(
          buildAuthorityEvidence("feature", this.executionId, "budget", {
            decision: "deny",
            reason: `feature_timeout:${budget.feature_timeout_ms}ms`,
            capability: "budget",
          }),
        );
        break;
      }

      if (budget.max_nodes != null && this.accounting.nodes_completed >= budget.max_nodes) {
        this.blockedReason = "COST_BUDGET_EXCEEDED";
        this.lastErrorCode = "COST_BUDGET_EXCEEDED";
        eventBus.emit("CostBudgetExceeded", featureId, "engine", {
          execution_id: this.executionId,
          max_nodes: budget.max_nodes,
          nodes_completed: this.accounting.nodes_completed,
        });
        break;
      }

      if (budget.token_budget != null && this.accounting.tokens_used > budget.token_budget) {
        this.blockedReason = "TOKEN_BUDGET_EXCEEDED";
        this.lastErrorCode = "TOKEN_BUDGET_EXCEEDED";
        eventBus.emit("BudgetExceeded", featureId, "engine", {
          execution_id: this.executionId,
          kind: "token",
          limit: budget.token_budget,
          observed: this.accounting.tokens_used,
        });
        break;
      }

      if (this.paused) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      if (this.orchestratorDecision === "replan" && this.replanIr) {
        graph = applyReplanPreservingCompleted(graph, this.replanIr);
        this.currentIr = this.replanIr;
        this.orchestratorDecision = null;
        this.replanIr = null;
        this.blockedReason = null;
        eventBus.emit("PlannerReplan", featureId, "engine", {
          ir_id: this.currentIr.metadata.id,
          plan_version: this.currentIr.metadata.plan_version,
          replan_id: this.currentIr.metadata.replan_id,
          parent_plan_id: this.currentIr.metadata.parent_plan_id,
        });
        eventBus.emit("ReplanApplied", featureId, "engine", {
          execution_id: this.executionId,
          replan_id: this.currentIr.metadata.replan_id,
          plan_version: this.currentIr.metadata.plan_version,
          plan_hash: this.currentIr.metadata.plan_hash,
        });
        continue;
      }

      if (this.orchestratorDecision === "replan" && !this.replanIr) {
        // Auto-replan path: decision without external IR
        const applied = await this.tryAutomaticReplan(
          graph,
          policy,
          eventBus,
          featureId,
          policyId,
        );
        if (applied) {
          graph = applied;
          this.orchestratorDecision = null;
          this.blockedReason = null;
          continue;
        }
        // tryAutomaticReplan set blockedReason to terminal code
        this.orchestratorDecision = null;
        break;
      }

      if (this.orchestratorDecision === "corrigir") {
        // If corrigir was chosen because replan is blocked (policy/exhausted), stop safely
        if (
          this.blockedReason === "POLICY_BLOCKED" ||
          this.blockedReason === "REPLAN_EXHAUSTED" ||
          this.blockedReason === "REPLAN_BUDGET_EXCEEDED" ||
          this.blockedReason === "NO_PROGRESS" ||
          this.blockedReason === "REPLAN_UNAVAILABLE" ||
          this.blockedReason === "REPLAN_REJECTED" ||
          this.blockedReason === "FAIL_FAST" ||
          this.blockedReason === "TIMEOUT" ||
          this.blockedReason === "COST_BUDGET_EXCEEDED" ||
          this.blockedReason === "TOKEN_BUDGET_EXCEEDED" ||
          this.blockedReason === "RETRY_BUDGET_EXCEEDED" ||
          this.blockedReason === "PROVIDER_FALLBACK_EXHAUSTED" ||
          this.blockedReason === "BUDGET_EXCEEDED" ||
          this.blockedReason === "CONFIRMATION_REQUIRED" ||
          this.blockedReason === "AUTHORITY_DENIED" ||
          this.blockedReason === "GATE_DENIED" ||
          this.blockedReason === "CAPABILITY_DENIED" ||
          this.blockedReason === "GROUNDING_REQUIRED"
        ) {
          this.orchestratorDecision = null;
          break;
        }
        const failed = graph.getAllNodes().find((n) => n.status === "failed" || n.status === "blocked");
        if (failed) {
          graph.setNodeStatus(failed.id, "pending");
          scheduler.invalidateDownstream(graph, failed.id);
        }
        this.orchestratorDecision = null;
        this.blockedReason = null;
        continue;
      }

      if (this.blockedReason) {
        const detailed = this.orchestrator.decideDetailed({
          blocked_reason: this.blockedReason,
          feature_id: featureId,
          error_code: this.lastErrorCode,
          replan_count: this.replanCount,
          max_replans: this.maxReplans,
          same_failure_no_progress: false,
        });
        this.orchestrator.applyDecision(
          detailed.decision,
          eventBus,
          featureId,
          this.blockedReason,
        );
        this.orchestratorDecision = detailed.decision;

        if (detailed.replan_block_code === "POLICY_BLOCKED") {
          this.blockedReason = "POLICY_BLOCKED";
          this.orchestratorDecision = "corrigir";
          continue;
        }
        if (
          detailed.replan_block_code === "REPLAN_EXHAUSTED" ||
          detailed.replan_block_code === "NO_PROGRESS"
        ) {
          this.blockedReason = detailed.replan_block_code;
          eventBus.emit("ReplanExhausted", featureId, "engine", {
            execution_id: this.executionId,
            code: detailed.replan_block_code,
            replan_count: this.replanCount,
          });
          this.orchestratorDecision = "corrigir";
          continue;
        }

        if (detailed.decision === "continuar") {
          this.blockedReason = null;
        }
        // replan → next iteration handles auto-replan / external IR
        // corrigir → next iteration
        continue;
      }

      const ready = scheduler.readyNodes(graph, policy);

      if (ready.length === 0) {
        if (scheduler.runningHandles().length > 0) {
          await this.waitForAny(scheduler);
          continue;
        }

        const polled = this.pollWaitingJobs(
          graph,
          policy,
          scheduler,
          eventBus,
          featureId,
          metrics,
          patternAggregator,
        );
        if (polled > 0) {
          this.blockedReason = null;
          continue;
        }

        const hasWaiting = graph.getAllNodes().some((n) => n.status === "waiting");
        if (hasWaiting && this.jobsDir) {
          if (waitForJobsMs > 0 && Date.now() - waitStartedAt < waitForJobsMs) {
            await new Promise((r) => setTimeout(r, this.jobPollIntervalMs));
            iterations--;
            continue;
          }
          break;
        }

        if (graph.hasFailedWithoutRetry((n) => this.policyEngine.retriesFor(policy, n))) {
          this.blockedReason = "unrecoverable_failure";
          continue;
        }
        if (graph.isFinished()) break;
        this.blockedReason = "deadlock_or_waiting_external";
        continue;
      }

      const batch = ready.slice(0, this.policyEngine.maxParallel(policy));
      if (ready.length > batch.length) {
        eventBus.emit("ConcurrencyLimited", featureId, "engine", {
          max_parallel: budget.max_parallel,
          ready: ready.length,
          scheduled: batch.length,
        });
      }
      const batchIds = batch.map((n) => n.id);
      const handles: RunHandle[] = [];
      for (const node of batch) {
        if (
          budget.token_budget != null &&
          this.accounting.tokens_used >= budget.token_budget
        ) {
          this.blockedReason = "TOKEN_BUDGET_EXCEEDED";
          this.lastErrorCode = "TOKEN_BUDGET_EXCEEDED";
          eventBus.emit("BudgetExceeded", featureId, "engine", {
            execution_id: this.executionId,
            kind: "token",
            limit: budget.token_budget,
            observed: this.accounting.tokens_used,
          });
          break;
        }
        if (budget.max_nodes != null && this.accounting.nodes_completed >= budget.max_nodes) {
          this.blockedReason = "COST_BUDGET_EXCEEDED";
          this.lastErrorCode = "COST_BUDGET_EXCEEDED";
          eventBus.emit("CostBudgetExceeded", featureId, "engine", {
            execution_id: this.executionId,
            max_nodes: budget.max_nodes,
            nodes_completed: this.accounting.nodes_completed,
          });
          break;
        }
        metrics.recordCapability(node.capability);
        const selection = this.selectProvider(node, policy, eventBus, featureId);
        this.allEvidence.push(selection.evidence);

        const preRunId = newRunId();
        const pre = evaluatePreExecute({
          node,
          provider: selection.provider,
          authority: this.authorityContext,
          gateContext: this.gateContext,
          plan_hash: this.currentPlanHash,
          confirmed_for_plan_hash: this.confirmedForPlanHash,
          run_id: preRunId,
          execution_id: this.executionId,
          policy_id: policy.metadata.id,
        });

        eventBus.emit("GateEvaluated", featureId, "engine", {
          gate_id: pre.gate_id,
          decision: pre.decision,
          reason: pre.reason,
          execution_id: this.executionId,
          node_id: node.id,
          policy_id: policy.metadata.id,
          code: pre.code,
          gate_kind: pre.gate_kind,
        });
        this.allEvidence.push(pre.evidence);

        if (pre.decision === "DENY") {
          eventBus.emit("GateDenied", featureId, "engine", {
            gate_id: pre.gate_id,
            reason: pre.reason,
            node_id: node.id,
            code: pre.code,
          });
          if (pre.code === "AUTHORITY_DENIED" || pre.code === "CAPABILITY_DENIED") {
            eventBus.emit("AuthorizationDenied", featureId, "engine", {
              gate_id: pre.gate_id,
              reason: pre.reason,
              node_id: node.id,
              code: pre.code,
              provider_id: selection.provider.id,
            });
          } else {
            eventBus.emit("PolicyDenied", featureId, "engine", {
              gate_id: pre.gate_id,
              reason: pre.reason,
              node_id: node.id,
              code: pre.code,
              provider_id: selection.provider.id,
            });
          }
          graph.setNodeStatus(node.id, "failed");
          this.lastFailedNodeId = node.id;
          this.lastErrorCode = pre.code ?? "GATE_DENIED";
          this.lastFailedProviderId = selection.provider.id;
          this.blockedReason =
            pre.code === "AUTHORITY_DENIED"
              ? "AUTHORITY_DENIED"
              : pre.code === "CAPABILITY_DENIED"
                ? "CAPABILITY_DENIED"
                : pre.code === "GROUNDING_REQUIRED"
                  ? "GROUNDING_REQUIRED"
                  : "GATE_DENIED";
          // Provider MUST NOT execute — continue without schedule
          continue;
        }

        if (pre.decision === "CONFIRMATION_REQUIRED") {
          eventBus.emit("GateConfirmationRequired", featureId, "engine", {
            gate_id: pre.gate_id,
            reason: pre.reason,
            node_id: node.id,
            plan_hash: this.currentPlanHash,
          });
          graph.setNodeStatus(node.id, "blocked");
          this.lastFailedNodeId = node.id;
          this.lastErrorCode = "CONFIRMATION_REQUIRED";
          this.blockedReason = "CONFIRMATION_REQUIRED";
          continue;
        }

        eventBus.emit("GateAllowed", featureId, "engine", {
          gate_id: pre.gate_id,
          node_id: node.id,
          provider_id: selection.provider.id,
        });

        recordProviderTried(this.accounting, node.id, selection.provider.id);

        const rem = remainingFeatureMs(budget, this.accounting);
        const step = budget.step_timeout_ms;
        let timeout_ms: number | undefined;
        if (rem != null && step != null) timeout_ms = Math.min(rem, step);
        else timeout_ms = rem ?? step;

        handles.push(
          scheduler.schedule(node, selection.provider, policy, graph, selection.rejected, batchIds, {
            authority_context: {
              confirmed: !!this.authorityContext.confirmed && this.confirmedForPlanHash === this.currentPlanHash,
              allowShell: this.authorityContext.allowShell,
              allowWrite: this.authorityContext.allowWrite,
              allowNetwork: this.authorityContext.allowNetwork,
              workspaceRoot: this.authorityContext.workspaceRoot,
            },
            timeout_ms,
          }),
        );
      }

      if (handles.length === 0) {
        // All candidates blocked by gates — let orchestrator classify
        continue;
      }

      const results = await Promise.all(handles.map((h) => h.promise));

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const handle = handles[i]!;
        const node = graph.getNode(handle.node_id)!;
        scheduler.removeRun(result.run_id);
        this.allEvidence.push(...scheduler.consumeSchedulingEvidence());
        this.processRunResult(
          result,
          node.id,
          graph,
          policy,
          scheduler,
          eventBus,
          featureId,
          metrics,
          patternAggregator,
        );
        this.nodesExecuted += 1;
      }
    }

    patternAggregator.ingest(eventBus.getEvents());
    const failurePatterns = patternAggregator.snapshot();

    if (!graph.isFinished() && !this.blockedReason) {
      if (graph.getAllNodes().some((n) => n.status === "waiting")) {
        this.blockedReason = "awaiting_external_jobs";
      } else if (iterations >= maxIterations) {
        this.blockedReason = "max_iterations";
      }
    }

    const success =
      graph.isFinished() &&
      !this.aborted &&
      this.blockedReason !== "TOKEN_BUDGET_EXCEEDED" &&
      this.blockedReason !== "COST_BUDGET_EXCEEDED" &&
      this.blockedReason !== "TIMEOUT" &&
      this.blockedReason !== "FAIL_FAST";
    this.runState = deriveRunState(graph.getAllNodes(), this.aborted ? "cancelled" : undefined);
    if (success) {
      eventBus.emit("FeatureCompleted", featureId, "engine", {
        metrics: metrics.snapshot(graph.snapshot(), true),
      });
    } else {
      eventBus.emit("FeatureBlocked", featureId, "engine", {
        reason: this.blockedReason ?? "max_iterations",
        failure_patterns: failurePatterns,
      });
    }

    if (!success && this.jobsDir && graph.getAllNodes().some((n) => n.status === "waiting")) {
      this.persistExecutionCheckpoint(graph, featureId, "awaiting_external", eventBus);
      if (!this.blockedReason) this.blockedReason = "awaiting_external_jobs";
    } else if (success && this.jobsDir) {
      clearCheckpoint(this.jobsDir, featureId);
      releaseExecutionRecovery(this.jobsDir, featureId);
    } else if (!success && this.jobsDir && !graph.isFinished()) {
      // Persist recoverable state on any incomplete exit (crash-recovery seam)
      this.persistExecutionCheckpoint(graph, featureId, "run_exit", eventBus);
    }

    return {
      success,
      finished: success || !!this.blockedReason || this.aborted,
      state: this.runState,
      blocked_reason: this.blockedReason ?? (success ? undefined : "max_iterations"),
      metrics: metrics.snapshot(graph.snapshot(), success),
      graph: graph.snapshot(),
      evidence: [...this.allEvidence],
      events: [...eventBus.getEvents()],
      decision: this.orchestratorDecision ?? undefined,
    };
    } finally {
      if (this.jobsDir && input.feature_id) {
        try {
          releaseExecutionRecovery(this.jobsDir, input.feature_id ?? featureId);
        } catch {
          /* ignore */
        }
      }
      try {
        detachObserver?.();
      } catch {
        /* detach must not throw */
      }
      try {
        detachPersister?.();
      } catch {
        /* detach must not throw */
      }
    }
  }

  pause(_featureId: string): void {
    this.paused = true;
  }

  resume(_featureId: string): void {
    this.paused = false;
  }

  cancel(runId: string): void {
    for (const handle of this.activeScheduler?.runningHandles() ?? []) {
      if (handle.run_id === runId) handle.cancel();
    }
  }

  abort(_featureId: string): void {
    this.aborted = true;
    this.runState = "cancelled";
  }

  private activeScheduler: Scheduler | null = null;

  requestReplan(ir: CapabilityIR): void {
    this.replanIr = ir;
    this.orchestratorDecision = "replan";
  }

  /**
   * Automatic replan: Replanner → validate → apply.
   * Returns new graph or null if terminal failure (blockedReason set).
   */
  private async tryAutomaticReplan(
    graph: GraphStore,
    _policy: ReturnType<PolicyEngine["resolve"]>,
    eventBus: EventBus,
    featureId: string,
    policyId: string,
  ): Promise<GraphStore | null> {
    const executionId = this.executionId;
    const currentIr = this.currentIr;
    if (!currentIr) {
      this.blockedReason = "REPLAN_UNAVAILABLE";
      return null;
    }

    eventBus.emit("ReplanRequested", featureId, "engine", {
      execution_id: executionId,
      replan_count: this.replanCount,
      failed_node: this.lastFailedNodeId,
      error_code: this.lastErrorCode,
    });

    if (!this.replanner) {
      eventBus.emit("ReplanRejected", featureId, "engine", {
        execution_id: executionId,
        code: "REPLAN_UNAVAILABLE",
        reason: "No Replanner configured",
      });
      this.blockedReason = "REPLAN_UNAVAILABLE";
      return null;
    }

    if (this.replanCount >= this.maxReplans) {
      eventBus.emit("ReplanExhausted", featureId, "engine", {
        execution_id: executionId,
        code: "REPLAN_EXHAUSTED",
        replan_count: this.replanCount,
      });
      eventBus.emit("ReplanBudgetExceeded", featureId, "engine", {
        execution_id: executionId,
        max_replans: this.maxReplans,
        observed: this.replanCount,
        policy_id: this.budget?.policy_id,
      });
      this.blockedReason = "REPLAN_BUDGET_EXCEEDED";
      this.lastErrorCode = "REPLAN_BUDGET_EXCEEDED";
      return null;
    }

    const failedNode = this.lastFailedNodeId
      ? graph.getNode(this.lastFailedNodeId)
      : graph.getAllNodes().find((n) => n.status === "failed");

    const classification = this.orchestrator.decideDetailed({
      blocked_reason: this.blockedReason ?? "unrecoverable_failure",
      feature_id: featureId,
      error_code: this.lastErrorCode,
      replan_count: this.replanCount,
      max_replans: this.maxReplans,
    }).classification;

    const sig = failureSignature(failedNode, classification.failure_class);
    if (this.lastFailureSignature && this.lastFailureSignature === sig && this.replanCount > 0) {
      eventBus.emit("ReplanExhausted", featureId, "engine", {
        execution_id: executionId,
        code: "NO_PROGRESS",
        failure_signature: sig,
      });
      this.blockedReason = "NO_PROGRESS";
      return null;
    }

    const availableProviders = failedNode
      ? this.registry.listProviders(failedNode.capability).map((p) => p.id)
      : [];

    const result = await this.replanner.replan({
      execution_id: executionId,
      feature_id: featureId,
      current_plan: currentIr,
      graph: graph.snapshot(),
      failed_node: failedNode,
      failure: classification,
      attempt: failedNode?.retry_count ?? 0,
      replan_count: this.replanCount,
      max_replans: this.maxReplans,
      completed_node_ids: graph
        .getAllNodes()
        .filter((n) => n.status === "satisfied" || n.status === "skipped")
        .map((n) => n.id),
      available_capabilities: this.registry.listCapabilityIds(),
      available_providers: availableProviders,
      failed_provider_id: this.lastFailedProviderId ?? failedNode?.provider_id,
      policy_id: policyId,
      recent_plan_hashes: this.recentPlanHashes,
      last_failure_signature: this.lastFailureSignature,
    });

    if (result.status !== "REPLAN_PROPOSED") {
      eventBus.emit("ReplanRejected", featureId, "engine", {
        execution_id: executionId,
        status: result.status,
        reason: result.reason,
        code: result.code,
      });
      this.blockedReason =
        result.status === "REPLAN_UNAVAILABLE" ? "REPLAN_UNAVAILABLE" : "REPLAN_REJECTED";
      return null;
    }

    eventBus.emit("ReplanProposed", featureId, "engine", {
      execution_id: executionId,
      replan_id: result.replan_id,
      strategy: result.strategy,
      reason: result.reason,
      plan_version: result.candidate_ir.metadata.plan_version,
    });

    if (result.evidence) this.allEvidence.push(result.evidence);

    const pre = validateExecutableIR(result.candidate_ir, {
      requireProviders: false,
    });
    if (!pre.ok) {
      eventBus.emit("ReplanRejected", featureId, "engine", {
        execution_id: executionId,
        code: "IR_INVALID",
        errors: pre.errors,
      });
      this.blockedReason = "REPLAN_REJECTED";
      return null;
    }

    // Policy boundary: never accept a plan that reintroduces a denied capability with same denial
    if (classification.disposition === "POLICY_BLOCKED") {
      eventBus.emit("ReplanRejected", featureId, "engine", {
        execution_id: executionId,
        code: "POLICY_BLOCKED",
      });
      this.blockedReason = "POLICY_BLOCKED";
      return null;
    }

    const hash = hashCapabilityIR(result.candidate_ir);
    if (this.recentPlanHashes.includes(hash)) {
      eventBus.emit("ReplanExhausted", featureId, "engine", {
        execution_id: executionId,
        code: "NO_PROGRESS",
        plan_hash: hash,
      });
      this.blockedReason = "NO_PROGRESS";
      return null;
    }

    this.replanCount += 1;
    this.accounting.replans = this.replanCount;
    this.recentPlanHashes.push(hash);
    this.lastFailureSignature = sig;
    this.currentIr = result.candidate_ir;
    this.currentPlanHash = hash;
    // A03: confirmation does not inherit across replan unless explicitly allowed
    if (!this.inheritConfirmationAcrossReplan) {
      this.confirmedForPlanHash = undefined;
    } else if (this.authorityContext.confirmed) {
      this.confirmedForPlanHash = hash;
    }

    // Reject candidate that only contains denied capabilities (fail-closed early)
    const denied = this.gateContext?.denied_capabilities ?? [];
    if (denied.length > 0) {
      const pendingCaps = result.candidate_ir.spec.nodes
        .filter((n) => n.type !== "gate")
        .map((n) => n.capability);
      const remaining = pendingCaps.filter((c) => !denied.includes(c));
      if (remaining.length === 0 && pendingCaps.some((c) => denied.includes(c))) {
        eventBus.emit("ReplanRejected", featureId, "engine", {
          execution_id: executionId,
          code: "POLICY_BLOCKED",
          reason: "Replan candidate only contains denied capabilities",
        });
        eventBus.emit("PolicyDenied", featureId, "engine", {
          code: "CAPABILITY_DENIED",
          reason: "replan_candidate_denied",
          denied,
        });
        this.blockedReason = "POLICY_BLOCKED";
        return null;
      }
    }

    const nextGraph = applyReplanPreservingCompleted(graph, result.candidate_ir);
    // Reset failed node to pending if still present with same id
    if (failedNode && nextGraph.getNode(failedNode.id)) {
      const n = nextGraph.getNode(failedNode.id)!;
      if (n.status === "failed" || n.status === "pending") {
        nextGraph.setNodeStatus(failedNode.id, "pending");
        if (this.budget?.reset_retries_on_replan !== false) {
          nextGraph.resetRetry(failedNode.id);
        }
      }
    }

    eventBus.emit("ReplanApplied", featureId, "engine", {
      execution_id: executionId,
      replan_id: result.replan_id,
      plan_version: result.candidate_ir.metadata.plan_version,
      parent_plan_id: result.candidate_ir.metadata.parent_plan_id,
      plan_hash: hash,
      replan_count: this.replanCount,
    });
    eventBus.emit("PlannerReplan", featureId, "engine", {
      ir_id: result.candidate_ir.metadata.id,
      replan_id: result.replan_id,
    });

    this.persistExecutionCheckpoint(nextGraph, featureId, "replan_applied", eventBus);

    return nextGraph;
  }

  /** Poll jobs dir for completed external executions and resume waiting nodes. */
  private pollWaitingJobs(
    graph: GraphStore,
    policy: ReturnType<PolicyEngine["resolve"]>,
    scheduler: SchedulerType,
    eventBus: EventBus,
    featureId: string,
    metrics: MetricsAccumulator,
    patternAggregator: PatternAggregator,
  ): number {
    if (!this.jobsDir) return 0;

    const store = new JobStore(this.jobsDir);
    let processed = 0;

    for (const node of graph.getAllNodes()) {
      if (node.status !== "waiting" || !node.run_id) continue;
      if (!store.hasCompletedResult(node.run_id)) continue;

      const job = store.readJob(node.run_id);
      const result = store.readResult(node.run_id);
      if (!job || !result) continue;

      const executeResult = jobResultToExecuteResult(job, result, node);
      graph.setNodeStatus(node.id, "running");
      this.processRunResult(
        executeResult,
        node.id,
        graph,
        policy,
        scheduler,
        eventBus,
        featureId,
        metrics,
        patternAggregator,
      );
      processed += 1;
    }

    return processed;
  }

  private ingestUsage(run: ExecuteResult): void {
    if (run.usage?.tokens != null) {
      this.accounting.tokens_used += run.usage.tokens;
      if (
        this.budget?.token_budget != null &&
        this.accounting.tokens_used > this.budget.token_budget
      ) {
        this.blockedReason = "TOKEN_BUDGET_EXCEEDED";
        this.lastErrorCode = "TOKEN_BUDGET_EXCEEDED";
      }
    } else if (run.usage?.cost_unknown || run.usage == null) {
      this.accounting.tokens_unknown_events += 1;
    }
  }

  /**
   * Same-capability provider fallback after retries exhausted.
   * Distinct from A04 replan. No provider repeat unless policy allows (we never repeat).
   */
  private tryProviderFallback(
    node: GraphNode,
    policy: ExecutionPolicy,
    graph: GraphStore,
    eventBus: EventBus,
    featureId: string,
    failedProviderId: string,
  ): boolean {
    const budget = this.budget;
    if (!budget?.provider_fallback_strategy) {
      return false;
    }
    const count = this.accounting.fallback_count.get(node.id) ?? 0;
    if (count >= budget.max_provider_fallbacks) {
      eventBus.emit("ProviderFallbackExhausted", featureId, "engine", {
        node_id: node.id,
        max_fallbacks: budget.max_provider_fallbacks,
        tried: this.accounting.providers_tried.get(node.id) ?? [],
      });
      return false;
    }

    recordProviderTried(this.accounting, node.id, failedProviderId);
    const tried = this.accounting.providers_tried.get(node.id) ?? [failedProviderId];
    const strategy = budget.provider_fallback_strategy;
    const constraints: Record<string, unknown> = {
      ...(node.constraints ?? {}),
      exclude_providers: tried,
    };

    let next;
    try {
      next = this.registry.selectWithEvidence(node.capability, strategy, constraints);
    } catch {
      eventBus.emit("ProviderFallbackExhausted", featureId, "engine", {
        node_id: node.id,
        reason: "no_eligible_provider",
        tried,
      });
      return false;
    }

    if (tried.includes(next.provider.id)) {
      eventBus.emit("ProviderFallbackExhausted", featureId, "engine", {
        node_id: node.id,
        reason: "fallback_loop_prevented",
        tried,
      });
      return false;
    }

    this.accounting.fallback_count.set(node.id, count + 1);
    this.accounting.fallback_switches += 1;
    node.constraints = {
      ...(node.constraints ?? {}),
      exclude_providers: tried,
      prefer_provider: next.provider.id,
    };
    graph.resetRetry(node.id);
    graph.setNodeStatus(node.id, "pending");

    eventBus.emit("ProviderFallbackUsed", featureId, "engine", {
      node_id: node.id,
      from_provider: failedProviderId,
      to_provider: next.provider.id,
      strategy,
      fallback_index: count + 1,
      max_fallbacks: budget.max_provider_fallbacks,
    });
    this.allEvidence.push(next.evidence);
    this.allEvidence.push(
      buildAuthorityEvidence(node.id, next.evidence.metadata.run_id, node.capability, {
        decision: "allow",
        reason: `provider_fallback:${failedProviderId}->${next.provider.id}`,
        capability: node.capability,
      }),
    );
    return true;
  }

  /**
   * Persist recoverable execution state (atomic rename).
   * Called after node completion, replan apply, and incomplete exit.
   */
  private persistExecutionCheckpoint(
    graph: GraphStore,
    featureId: string,
    reason: string,
    eventBus?: EventBus,
  ): void {
    if (!this.jobsDir || !this.policySnapshot || !this.currentIr || !this.budget) return;
    this.checkpointRevision += 1;
    const path = saveCheckpoint(this.jobsDir, {
      revision: this.checkpointRevision,
      feature_id: featureId,
      execution_id: this.executionId,
      policy_id: this.policySnapshot.metadata.id,
      ir_id: this.currentIr.metadata.id,
      plan_version: this.currentIr.metadata.plan_version ?? 1,
      plan_hash: this.currentPlanHash,
      parent_plan_id: this.currentIr.metadata.parent_plan_id,
      current_ir: this.currentIr,
      policy_snapshot: this.policySnapshot,
      graph: graph.snapshot(),
      accounting: serializeAccounting(this.accounting),
      replan_count: this.replanCount,
      recent_plan_hashes: [...this.recentPlanHashes],
      last_error_code: this.lastErrorCode,
      last_failed_node_id: this.lastFailedNodeId,
      last_failed_provider_id: this.lastFailedProviderId,
      blocked_reason: this.blockedReason,
      feature_started_at: this.featureStartedAtIso,
      delivery_semantics: "AT_LEAST_ONCE",
    });
    eventBus?.emit("CheckpointSaved", featureId, "engine", {
      path,
      revision: this.checkpointRevision,
      reason,
      execution_id: this.executionId,
      plan_hash: this.currentPlanHash,
    });
  }

  private selectProvider(
    node: GraphNode,
    policy: ReturnType<PolicyEngine["resolve"]>,
    eventBus: EventBus,
    featureId: string,
  ) {
    const strategy = this.policyEngine.providerStrategy(policy);
    const constraints = node.constraints as Record<string, unknown> | undefined;
    const versionOpts = { capability_version: node.capability_version };

    try {
      return this.registry.selectWithEvidence(node.capability, strategy, constraints, versionOpts);
    } catch (err) {
      if (!this.discovery || !this.agentsRoot) throw err;

      eventBus.emit("ProviderDiscoveryStarted", featureId, "engine", {
        capability: node.capability,
        query: node.capability,
      });

      const manifest = discoverManifestForCapability(node.capability, this.discovery);
      if (!manifest) throw err;

      const loader = new PluginLoader(this.agentsRoot);
      const executor = this.jobsDir ? new JobFileExecutor(this.jobsDir) : undefined;
      if (!executor) throw err;

      const runtime = loader.load(manifest, executor);
      this.providers.register(runtime);
      this.registry.registerFromManifest(manifest);

      eventBus.emit("ProviderDiscoveryCompleted", featureId, "engine", {
        capability: node.capability,
        provider_id: manifest.metadata.name,
      });

      return this.registry.selectWithEvidence(node.capability, strategy, constraints, versionOpts);
    }
  }

  private async waitForAny(scheduler: Scheduler): Promise<void> {
    const handles = scheduler.runningHandles();
    if (handles.length === 0) return;
    await Promise.race(handles.map((h) => h.promise));
  }

  private processRunResult(
    run: ExecuteResult,
    nodeId: string,
    graph: GraphStore,
    policy: ReturnType<PolicyEngine["resolve"]>,
    scheduler: Scheduler,
    eventBus: EventBus,
    featureId: string,
    metrics: MetricsAccumulator,
    patternAggregator: PatternAggregator,
  ): void {
    const node = graph.getNode(nodeId)!;
    const minConfidence = this.policyEngine.minConfidence(policy);

    if (!run.success && run.error?.code === "JOB_PENDING") {
      graph.setNodeStatus(nodeId, "waiting");
      if (run.evidence) this.allEvidence.push(run.evidence);
      return;
    }

    if (!run.success) {
      patternAggregator.record({
        event_id: run.run_id,
        type: "NodeFailed",
        timestamp: new Date().toISOString(),
        feature_id: featureId,
        source: "scheduler",
        payload: {
          node_id: nodeId,
          provider_id: run.provider_id,
          capability: node.capability,
          error: run.error,
        },
      });
      eventBus.emit("NodeFailed", featureId, "scheduler", {
        run_id: run.run_id,
        node_id: nodeId,
        provider_id: run.provider_id,
        capability: node.capability,
        error: run.error,
        attempt: node.retry_count + 1,
      }, run.run_id);

      this.ingestUsage(run);

      // B01 fail_fast: terminal — no retry, no fallback, no replan
      if (policy.spec.fail_fast) {
        graph.setNodeStatus(nodeId, "failed");
        this.registry.recordFailure(run.provider_id, run);
        this.lastFailedNodeId = nodeId;
        this.lastErrorCode = run.error?.code ?? "FAIL_FAST";
        this.lastFailedProviderId = run.provider_id;
        this.blockedReason = "FAIL_FAST";
        eventBus.emit("FailFastTriggered", featureId, "engine", {
          node_id: nodeId,
          provider_id: run.provider_id,
          error: run.error,
          policy_id: policy.metadata.id,
        });
        this.allEvidence.push(
          buildAuthorityEvidence(nodeId, run.run_id, node.capability, {
            decision: "deny",
            reason: "fail_fast",
            capability: node.capability,
          }),
        );
        return;
      }

      graph.incrementRetry(nodeId);
      this.accounting.total_retries += 1;
      const maxRetries = this.policyEngine.retriesFor(policy, node);

      if (node.retry_count <= maxRetries) {
        graph.setNodeStatus(nodeId, "pending");
        eventBus.emit("RetryScheduled", featureId, "scheduler", {
          node_id: nodeId,
          attempt: node.retry_count,
          max_retries: maxRetries,
        });
        metrics.recordEvent({
          event_id: "",
          type: "RetryScheduled",
          timestamp: "",
          feature_id: featureId,
          source: "scheduler",
          payload: { node_id: nodeId },
        });
        this.registry.recordFailure(run.provider_id, run);
        return;
      }

      eventBus.emit("RetryBudgetExceeded", featureId, "engine", {
        node_id: nodeId,
        max_retries: maxRetries,
        observed: node.retry_count,
        provider_id: run.provider_id,
      });

      // Provider fallback (same capability, new provider) — not a replan
      if (this.tryProviderFallback(node, policy, graph, eventBus, featureId, run.provider_id)) {
        return;
      }

      graph.setNodeStatus(nodeId, "failed");
      this.registry.recordFailure(run.provider_id, run);
      this.lastFailedNodeId = nodeId;
      this.lastErrorCode = run.error?.code ?? "EXECUTOR_FAILED";
      this.lastFailedProviderId = run.provider_id;
      this.blockedReason = "unrecoverable_failure";
      return;
    }

    this.ingestUsage(run);

    const validation = validateEvidence(
      run.evidence,
      node.definition_of_done,
      node,
      minConfidence,
    );

    if (run.evidence) this.allEvidence.push(run.evidence);

    if (!validation.valid) {
      if (validation.reason === "gate_rejected") {
        eventBus.emit("GateRejected", featureId, "scheduler", {
          node_id: nodeId,
          verdict: "rejected",
          findings: run.evidence?.spec.findings ?? [],
        }, run.run_id);

        graph.setNodeStatus(nodeId, "failed");
        scheduler.invalidateDownstream(graph, nodeId);

        if (policy.spec.on_gate_reject === "orchestrator") {
          this.blockedReason = "gate_rejected";
        } else if (policy.spec.on_gate_reject === "fail_fast") {
          this.blockedReason = "FAIL_FAST";
          eventBus.emit("FailFastTriggered", featureId, "engine", {
            node_id: nodeId,
            reason: "on_gate_reject",
          });
        }
        return;
      }

      graph.incrementRetry(nodeId);
      const maxRetries = this.policyEngine.retriesFor(policy, node);
      if (node.retry_count <= maxRetries && policy.spec.on_evidence_missing === "retry") {
        graph.setNodeStatus(nodeId, "pending");
        eventBus.emit("RetryScheduled", featureId, "scheduler", {
          node_id: nodeId,
          attempt: node.retry_count,
        });
        return;
      }

      graph.setNodeStatus(nodeId, "failed");
      this.blockedReason = validation.reason ?? "evidence_incomplete";
      return;
    }

    graph.setNodeStatus(nodeId, "satisfied");
    graph.setNodeEvidence(nodeId, run.evidence);
    this.registry.recordSuccess(run.provider_id, run);
    this.accounting.nodes_completed += 1;

    if (this.blockedReason === "TOKEN_BUDGET_EXCEEDED") {
      eventBus.emit("BudgetExceeded", featureId, "engine", {
        execution_id: this.executionId,
        kind: "token",
        limit: this.budget?.token_budget,
        observed: this.accounting.tokens_used,
        node_id: nodeId,
      });
    }

    eventBus.emit("NodeCompleted", featureId, "scheduler", {
      run_id: run.run_id,
      node_id: nodeId,
      provider_id: run.provider_id,
      capability: node.capability,
      duration_ms: run.duration_ms,
    }, run.run_id);

    this.persistExecutionCheckpoint(graph, featureId, "node_completed", eventBus);

    if (node.type === "gate") {
      eventBus.emit("GatePassed", featureId, "scheduler", {
        node_id: nodeId,
        verdict: run.evidence?.spec.verdict,
      }, run.run_id);
    }

    if (run.contextual_learnings?.length) {
      for (const entry of run.contextual_learnings) {
        this.memory.append(featureId, entry);
        eventBus.emit("MemoryWritten", featureId, "scheduler", {
          scope: featureId,
          entry,
        });
      }
    }

    if (run.durable_learnings?.length) {
      for (const proposal of run.durable_learnings) {
        const entry = this.knowledge.propose({ ...proposal, source_node: nodeId });
        eventBus.emit("KnowledgeProposed", featureId, "scheduler", {
          entry,
          source_node: nodeId,
        });
      }
    }

    const phaseMapping = policy.spec.phase_gates?.mapping;
    if (phaseMapping?.[node.capability]) {
      eventBus.emit("PhaseGateReached", featureId, "scheduler", {
        phase: phaseMapping[node.capability],
        node_id: nodeId,
      });
    }
  }
}
