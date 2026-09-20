import type {
  CapabilityIR,
  GraphNode,
  GraphSnapshot,
  NodeStatus,
} from "../types/index.js";

export class GraphStore {
  readonly featureId: string;
  private nodes: Map<string, GraphNode>;

  constructor(ir: CapabilityIR) {
    this.featureId = ir.metadata.id;
    this.nodes = new Map(
      ir.spec.nodes.map((n) => [
        n.id,
        {
          ...structuredClone(n),
          status: "pending" as NodeStatus,
          retry_count: 0,
        },
      ]),
    );
  }

  static fromSnapshot(snapshot: GraphSnapshot): GraphStore {
    const store = Object.create(GraphStore.prototype) as GraphStore;
    store.featureId = snapshot.feature_id;
    store.nodes = new Map(snapshot.nodes.map((n) => [n.id, structuredClone(n)]));
    return store;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  setNodeStatus(id: string, status: NodeStatus): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.status = status;
  }

  setNodeEvidence(id: string, evidence: GraphNode["evidence"]): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.evidence = evidence;
  }

  incrementRetry(id: string): number {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.retry_count += 1;
    return node.retry_count;
  }

  resetRetry(id: string): void {
    const node = this.nodes.get(id);
    if (node) node.retry_count = 0;
  }

  setProvider(id: string, providerId: string, runId: string): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.provider_id = providerId;
    node.run_id = runId;
  }

  dependenciesSatisfied(node: GraphNode): boolean {
    return node.dependencies.every((depId) => {
      const dep = this.nodes.get(depId);
      return dep?.status === "satisfied" || dep?.status === "skipped";
    });
  }

  transitiveDependents(rootId: string): GraphNode[] {
    const result: GraphNode[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      for (const node of this.nodes.values()) {
        if (node.dependencies.includes(id) && !visited.has(node.id)) {
          visited.add(node.id);
          result.push(node);
          visit(node.id);
        }
      }
    };

    visit(rootId);
    return result;
  }

  invalidateDownstream(rootId: string): string[] {
    const affected = this.transitiveDependents(rootId);
    const ids: string[] = [];

    for (const node of affected) {
      if (["satisfied", "running", "pending", "failed", "blocked"].includes(node.status)) {
        node.status = "pending";
        node.evidence = undefined;
        node.retry_count = 0;
        node.provider_id = undefined;
        node.run_id = undefined;
        ids.push(node.id);
      }
    }

    return ids;
  }

  hasRunning(): boolean {
    return this.getAllNodes().some((n) => n.status === "running" || n.status === "waiting");
  }

  hasFailedWithoutRetry(maxRetriesFn: (node: GraphNode) => number): boolean {
    return this.getAllNodes().some(
      (n) => n.status === "failed" && n.retry_count >= maxRetriesFn(n),
    );
  }

  isFinished(): boolean {
    return this.getAllNodes().every((n) => n.status === "satisfied" || n.status === "skipped");
  }

  snapshot(): GraphSnapshot {
    return {
      feature_id: this.featureId,
      nodes: this.getAllNodes().map((n) => structuredClone(n)),
    };
  }
}
