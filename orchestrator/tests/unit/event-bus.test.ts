import { describe, it, expect } from "vitest";
import { EventBus } from "../../src/events/event-bus.js";

describe("EventBus", () => {
  it("emits and stores events", () => {
    const bus = new EventBus();
    bus.emit("FeatureStarted", "feat-1", "engine", { policy_id: "rapid-prototype" });
    expect(bus.getEvents()).toHaveLength(1);
    expect(bus.getEvents()[0].type).toBe("FeatureStarted");
  });

  it("notifies subscribers", () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.subscribe("NodeCompleted", (e) => received.push(e.payload.node_id as string));
    bus.emit("NodeCompleted", "f1", "scheduler", { node_id: "be-auth" });
    expect(received).toEqual(["be-auth"]);
  });
});
