import type {
  Evidence,
  ExecuteRequest,
  ExecutionPolicy,
  GraphNode,
  KnowledgeEntry,
  ProviderEntry,
  RunHandle,
} from "../types/index.js";
import type { GraphStore } from "../graph/graph-store.js";
import type { PolicyEngine } from "../policies/policy-engine.js";
import type { EventBus } from "../events/event-bus.js";
import type { KnowledgeStore } from "../knowledge/knowledge-store.js";
import type { ProviderRouter } from "../providers/mock-provider.js";
import { newRunId } from "../ir/validator.js";
import { buildSchedulingEvidence } from "../evidence/builders.js";

export class Scheduler {
  private running = new Map<string, RunHandle>();
  private schedulingEvidence: Evidence[] = [];

  constructor(
    private policyEngine: PolicyEngine,
    private eventBus: EventBus,
    private knowledge: KnowledgeStore,
    private providerRouter: ProviderRouter,
    private featureId: string,
  ) {}

  readyNodes(graph: GraphStore, policy: ExecutionPolicy): GraphNode[] {
    const candidates: GraphNode[] = [];

    for (const node of graph.getAllNodes()) {
      if (node.status !== "pending") continue;
      if (!graph.dependenciesSatisfied(node)) continue;

      if (node.type === "gate" && !this.policyEngine.gateEnabled(policy, node.capability)) {
        graph.setNodeStatus(node.id, "skipped");
        this.eventBus.emit("GateSkipped", this.featureId, "scheduler", {
          node_id: node.id,
          capability: node.capability,
        });
        continue;
      }

      candidates.push(node);
    }

    return this.orderForExecution(candidates, policy);
  }

  private orderForExecution(nodes: GraphNode[], policy: ExecutionPolicy): GraphNode[] {
    if (policy.spec.execution_order === "priority_field") {
      return [...nodes].sort(
        (a, b) => ((b.metadata?.priority as number) ?? 0) - ((a.metadata?.priority as number) ?? 0),
      );
    }
    // topological: fewer dependencies first, then stable id order
    return [...nodes].sort(
      (a, b) =>
        a.dependencies.length - b.dependencies.length || a.id.localeCompare(b.id),
    );
  }

  consumeSchedulingEvidence(): Evidence[] {
    const out = [...this.schedulingEvidence];
    this.schedulingEvidence = [];
    return out;
  }

  emitSchedulingEvidence(
    node: GraphNode,
    provider: ProviderEntry,
    rejected: Array<{ id: string; reason: string }>,
    policy: ExecutionPolicy,
    readyBatch: string[],
  ): void {
    const runId = newRunId();
    this.schedulingEvidence.push(
      buildSchedulingEvidence(node.id, runId, {
        type: "scheduling",
        selected_provider: provider.id,
        rejected_providers: rejected,
        strategy: policy.spec.provider_strategy,
        ready_batch: readyBatch,
        parallelism: policy.spec.parallelism.max_parallel,
        gate_depth: policy.spec.gate_depth,
      }),
    );
  }

  schedule(
    node: GraphNode,
    provider: ProviderEntry,
    policy: ExecutionPolicy,
    graph: GraphStore,
    rejected: Array<{ id: string; reason: string }> = [],
    readyBatch: string[] = [node.id],
  ): RunHandle {
    const runId = newRunId();
    const maxRetries = this.policyEngine.retriesFor(policy, node);

    graph.setNodeStatus(node.id, "running");
    graph.setProvider(node.id, provider.id, runId);

    this.emitSchedulingEvidence(node, provider, rejected, policy, readyBatch);

    this.eventBus.emit("ProviderSelected", this.featureId, "scheduler", {
      node_id: node.id,
      provider_id: provider.id,
      strategy: policy.spec.provider_strategy,
    });

    this.eventBus.emit("NodeScheduled", this.featureId, "scheduler", {
      node_id: node.id,
      provider_id: provider.id,
      attempt: node.retry_count + 1,
    }, runId);

    let knowledgeHits: KnowledgeEntry[] = [];
    if (policy.spec.knowledge?.consult_before_schedule) {
      knowledgeHits = this.knowledge.search({ capability: node.capability });
      if (knowledgeHits.length > 0) {
        this.eventBus.emit("KnowledgeHit", this.featureId, "scheduler", {
          query: node.capability,
          hits: knowledgeHits.map((h) => h.id),
        });
      }
    }

    const request: ExecuteRequest = {
      run_id: runId,
      node_id: node.id,
      capability: node.capability,
      inputs: node.inputs ?? [],
      definition_of_done: node.definition_of_done,
      policy: {
        retries_remaining: maxRetries - node.retry_count,
        timeout_ms: parseTimeoutMs(policy.spec.timeouts?.step_timeout),
      },
      provider_id: provider.id,
      executor_type: provider.plugin,
      memory_scope: this.featureId,
      knowledge_hits: knowledgeHits,
      briefing: `Execute ${node.capability} for node ${node.id}`,
      node,
    };

    const providerRuntime = this.providerRouter.get(provider.id);

    this.eventBus.emit("NodeStarted", this.featureId, "scheduler", {
      run_id: runId,
      node_id: node.id,
    }, runId);

    let cancelled = false;
    const promise = providerRuntime.execute(request).then((result) => {
      if (cancelled) {
        return {
          ...result,
          success: false,
          error: { code: "CANCELLED", message: "Run cancelled" },
        };
      }
      return result;
    });

    const handle: RunHandle = {
      run_id: runId,
      node_id: node.id,
      provider_id: provider.id,
      started_at: new Date().toISOString(),
      promise,
      cancel: () => {
        cancelled = true;
        void providerRuntime.cancel(runId);
      },
    };

    this.running.set(runId, handle);
    return handle;
  }

  runningHandles(): RunHandle[] {
    return [...this.running.values()];
  }

  removeRun(runId: string): void {
    this.running.delete(runId);
  }

  invalidateDownstream(graph: GraphStore, rootId: string): string[] {
    const affected = graph.invalidateDownstream(rootId);
    this.eventBus.emit("SubgraphInvalidated", this.featureId, "scheduler", {
      root_node_id: rootId,
      affected,
    });
    return affected;
  }
}

function parseTimeoutMs(timeout?: string): number | undefined {
  if (!timeout) return undefined;
  const m = timeout.match(/^(\d+)(m|h|s)$/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  if (m[2] === "h") return n * 3600_000;
  if (m[2] === "m") return n * 60_000;
  return n * 1000;
}
