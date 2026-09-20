import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { EventEnvelope } from "../types/index.js";
import type { EventBus } from "../events/event-bus.js";

export class JsonlEventPersister {
  constructor(private eventsDir: string) {}

  pathFor(featureId: string): string {
    return join(this.eventsDir, `${featureId}.jsonl`);
  }

  append(event: EventEnvelope): void {
    mkdirSync(this.eventsDir, { recursive: true });
    appendFileSync(this.pathFor(event.feature_id), `${JSON.stringify(event)}\n`, "utf-8");
  }

  attach(bus: EventBus, featureId: string): () => void {
    return bus.onEvent((event) => {
      if (event.feature_id === featureId) this.append(event);
    });
  }

  load(featureId: string): EventEnvelope[] {
    const path = this.pathFor(featureId);
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as EventEnvelope);
  }
}
