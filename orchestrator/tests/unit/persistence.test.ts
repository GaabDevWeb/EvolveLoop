import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EventBus } from "../../src/events/event-bus.js";
import { JsonlEventPersister } from "../../src/persistence/jsonl-event-persister.js";

describe("JsonlEventPersister", () => {
  it("appends events to feature jsonl file", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-events-"));
    const persister = new JsonlEventPersister(dir);
    const bus = new EventBus();

    const detach = persister.attach(bus, "feat-1");
    bus.emit("FeatureStarted", "feat-1", "engine", { policy_id: "rapid-prototype" });
    bus.emit("NodeCompleted", "feat-1", "scheduler", { node_id: "be-auth" });
    detach();

    const path = join(dir, "feat-1.jsonl");
    expect(existsSync(path)).toBe(true);
    const lines = readFileSync(path, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).type).toBe("FeatureStarted");
    expect(JSON.parse(lines[1]).type).toBe("NodeCompleted");
  });

  it("loads persisted events", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-events-"));
    const persister = new JsonlEventPersister(dir);
    const bus = new EventBus();
    persister.attach(bus, "login");
    bus.emit("FeatureStarted", "login", "engine", {});
    const loaded = persister.load("login");
    expect(loaded).toHaveLength(1);
    expect(loaded[0].feature_id).toBe("login");
  });
});

describe("EventBus.onEvent", () => {
  it("notifies global handlers", () => {
    const bus = new EventBus();
    const types: string[] = [];
    bus.onEvent((e) => types.push(e.type));
    bus.emit("FeatureStarted", "f1", "engine", {});
    bus.emit("NodeCompleted", "f1", "scheduler", { node_id: "a" });
    expect(types).toEqual(["FeatureStarted", "NodeCompleted"]);
  });
});
