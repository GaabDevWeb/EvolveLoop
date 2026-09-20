import type { EventEnvelope, FeatureMetrics } from "../types/index.js";

export class MetricsAccumulator {
  private featureId: string;
  private startedAt: number;
  private replanCount = 0;
  private reworkedNodes = new Set<string>();
  private capabilitiesUsed = new Set<string>();
  private providersUsed = new Set<string>();
  private eventsTotal = 0;

  constructor(featureId: string) {
    this.featureId = featureId;
    this.startedAt = Date.now();
  }

  recordEvent(event: EventEnvelope): void {
    this.eventsTotal++;

    if (event.type === "PlannerReplan") this.replanCount++;
    if (event.type === "RetryScheduled" || event.type === "SubgraphInvalidated") {
      const nodeId = event.payload.node_id as string | undefined;
      if (nodeId) this.reworkedNodes.add(nodeId);
      if (event.type === "SubgraphInvalidated" && Array.isArray(event.payload.affected)) {
        for (const id of event.payload.affected as string[]) this.reworkedNodes.add(id);
      }
    }
    if (event.type === "ProviderSelected") {
      this.providersUsed.add(event.payload.provider_id as string);
      const nodeId = event.payload.node_id as string;
      // capability tracked separately via graph
      void nodeId;
    }
  }

  recordCapability(capability: string): void {
    this.capabilitiesUsed.add(capability);
  }

  snapshot(graph: { nodes: Array<{ status: string; capability: string }> }, success: boolean): FeatureMetrics {
    const nodes = graph.nodes;
    return {
      feature_id: this.featureId,
      success,
      duration_ms: Date.now() - this.startedAt,
      total_nodes: nodes.length,
      satisfied_nodes: nodes.filter((n) => n.status === "satisfied").length,
      failed_nodes: nodes.filter((n) => n.status === "failed").length,
      reworked_nodes: this.reworkedNodes.size,
      replan_count: this.replanCount,
      events_total: this.eventsTotal,
      capabilities_used: [...this.capabilitiesUsed],
      providers_used: [...this.providersUsed],
    };
  }
}
