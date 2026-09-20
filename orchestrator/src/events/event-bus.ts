import { randomUUID } from "node:crypto";
import type { EventEnvelope, EventSource, EventType } from "../types/index.js";

type EventHandler = (event: EventEnvelope) => void;

export class EventBus {
  private events: EventEnvelope[] = [];
  private handlers = new Map<EventType, Set<EventHandler>>();
  private globalHandlers = new Set<EventHandler>();
  private pendingResolvers: Array<{
    types: Set<EventType>;
    filter?: (e: EventEnvelope) => boolean;
    resolve: (e: EventEnvelope) => void;
  }> = [];

  emit(
    type: EventType,
    featureId: string,
    source: EventSource,
    payload: Record<string, unknown>,
    correlationId?: string,
  ): EventEnvelope {
    const event: EventEnvelope = {
      event_id: randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      feature_id: featureId,
      source,
      correlation_id: correlationId,
      payload,
    };

    this.events.push(event);

    for (const h of this.globalHandlers) h(event);

    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const h of handlers) h(event);
    }

    for (let i = this.pendingResolvers.length - 1; i >= 0; i--) {
      const pending = this.pendingResolvers[i];
      if (pending.types.has(type) && (!pending.filter || pending.filter(event))) {
        pending.resolve(event);
        this.pendingResolvers.splice(i, 1);
      }
    }

    return event;
  }

  subscribe(type: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  onEvent(handler: EventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  awaitEvent(
    types: EventType[],
    filter?: (e: EventEnvelope) => boolean,
    timeoutMs = 5000,
  ): Promise<EventEnvelope | null> {
    return new Promise((resolve) => {
      const typeSet = new Set(types);
      const timer = setTimeout(() => {
        const idx = this.pendingResolvers.findIndex((p) => p.resolve === resolveWrapper);
        if (idx >= 0) this.pendingResolvers.splice(idx, 1);
        resolve(null);
      }, timeoutMs);

      const resolveWrapper = (event: EventEnvelope) => {
        clearTimeout(timer);
        resolve(event);
      };

      this.pendingResolvers.push({ types: typeSet, filter, resolve: resolveWrapper });
    });
  }

  getEvents(): readonly EventEnvelope[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}

export function eventsToJsonl(events: EventEnvelope[]): string {
  return events.map((e) => JSON.stringify(e)).join("\n");
}
