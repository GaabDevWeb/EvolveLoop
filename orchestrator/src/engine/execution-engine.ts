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
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from "../jobs/checkpoint.js";
import type { Scheduler as SchedulerType } from "../scheduler/scheduler.js";
import type { LongitudinalEvolveLoop } from "../evolveloop/longitudinal-controller.js";
import { attachEvolveLoopObserver } from "../evolveloop/adapters/runtime-observer.js";
import type { AnalysisScope } from "../evolveloop/longitudinal-types.js";
import type { LiveAnalysisCoordinator } from "../evolveloop/live/live-coordinator.js";

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

  private orchestratorDecision: OrchestratorDecision | null = null;
  private blockedReason: string | null = null;
  private replanIr: CapabilityIR | null = null;
  private runState: FeatureRunState = "created";
  private paused = false;
  private aborted = false;
  private allEvidence: Evidence[] = [];
  private nodesExecuted = 0;

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
    this.registry = new RegistryClient(options.registry, this.contracts);
  }

  async run(input: RunInput): Promise<RunResult> {
    const errors = validateIR(input.ir);
    if (errors.some((e) => ["IR_CYCLE_DETECTED", "IR_DUPLICATE_ID", "IR_DANGLING_EDGE"].includes(e.code))) {
      throw new Error(`IR validation failed: ${errors.map((e) => e.message).join(", ")}`);
    }

    const policyId = input.policy_id ?? input.ir.metadata.policy_ref ?? "high-reliability";
    const policy = this.policyEngine.resolve(policyId, input.orchestrator_overrides);
    const featureId = input.feature_id ?? input.ir.metadata.id;
    const waitForJobsMs = input.wait_for_jobs_ms ?? 0;
    const waitStartedAt = Date.now();

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
    if (input.resume && this.jobsDir) {
      const checkpoint = loadCheckpoint(this.jobsDir, featureId);
      if (checkpoint) {
        graph = GraphStore.fromSnapshot(checkpoint.graph);
        this.blockedReason = null;
      } else {
        graph = new GraphStore(input.ir);
      }
    } else {
      graph = new GraphStore(input.ir);
    }
    this.runState = "active";
    this.allEvidence = [];
    this.nodesExecuted = 0;
    this.paused = false;
    this.aborted = false;
    const patternAggregator = new PatternAggregator();

    eventBus.emit("FeatureStarted", featureId, "engine", {
      ir_id: input.ir.metadata.id,
      policy_id: policy.metadata.id,
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

    const maxIterations = 500;
    let iterations = 0;

    while (!graph.isFinished() && iterations++ < maxIterations && !this.aborted) {
      if (this.paused) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      if (this.orchestratorDecision === "replan" && this.replanIr) {
        graph = new GraphStore(this.replanIr);
        this.orchestratorDecision = null;
        this.replanIr = null;
        this.blockedReason = null;
        eventBus.emit("PlannerReplan", featureId, "engine", {
          ir_id: input.ir.metadata.id,
        });
        continue;
      }

      if (this.orchestratorDecision === "corrigir") {
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
        const decision = this.orchestrator.decide({
          blocked_reason: this.blockedReason,
          feature_id: featureId,
        });
        this.orchestrator.applyDecision(decision, eventBus, featureId, this.blockedReason);
        this.orchestratorDecision = decision;
        if (decision === "continuar") {
          this.blockedReason = null;
        }
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
      const batchIds = batch.map((n) => n.id);
      const handles = batch.map((node) => {
        metrics.recordCapability(node.capability);
        const selection = this.selectProvider(node, policy, eventBus, featureId);
        this.allEvidence.push(selection.evidence);
        return scheduler.schedule(node, selection.provider, policy, graph, selection.rejected, batchIds);
      });

      const results = await Promise.all(handles.map((h) => h.promise));

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const node = batch[i];
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

    const success = graph.isFinished() && !this.aborted;
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
      saveCheckpoint(this.jobsDir, {
        feature_id: featureId,
        policy_id: policy.metadata.id,
        ir_id: input.ir.metadata.id,
        graph: graph.snapshot(),
      });
      if (!this.blockedReason) this.blockedReason = "awaiting_external_jobs";
    } else if (success && this.jobsDir) {
      clearCheckpoint(this.jobsDir, featureId);
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

      graph.incrementRetry(nodeId);
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

      graph.setNodeStatus(nodeId, "failed");
      this.registry.recordFailure(run.provider_id, run);
      this.blockedReason = run.error?.message ?? "unrecoverable_failure";
      return;
    }

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

    eventBus.emit("NodeCompleted", featureId, "scheduler", {
      run_id: run.run_id,
      node_id: nodeId,
      provider_id: run.provider_id,
      capability: node.capability,
      duration_ms: run.duration_ms,
    }, run.run_id);

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
