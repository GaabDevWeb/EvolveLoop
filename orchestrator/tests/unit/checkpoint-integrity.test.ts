import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, statSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ExecutionEngine, ProviderRouter, createMockProvider } from "../../src/index.js";
import {
  CheckpointError,
  loadCheckpoint,
  saveCheckpoint,
  type EngineCheckpoint,
} from "../../src/jobs/checkpoint.js";
import type { CapabilityIR, CapabilityRegistry, GraphNode, NodeStatus } from "../../src/types/index.js";

const KEY_ENV = "EVOLVELOOP_CHECKPOINT_HMAC_KEY";
const originalKey = process.env[KEY_ENV];

afterEach(() => {
  if (originalKey === undefined) delete process.env[KEY_ENV];
  else process.env[KEY_ENV] = originalKey;
});

function workspace(): string {
  return mkdtempSync(join(tmpdir(), "checkpoint-"));
}

function graphNode(status: NodeStatus): GraphNode {
  return {
    id: "n1",
    capability: "testing",
    type: "worker",
    dependencies: [],
    definition_of_done: [],
    status,
    retry_count: 0,
  };
}

function draft(featureId: string, status: NodeStatus = "waiting") {
  return {
    feature_id: featureId,
    policy_id: "rapid-prototype",
    ir_id: featureId,
    graph: { feature_id: featureId, nodes: [graphNode(status)] },
  };
}

function errorCode(run: () => void): string {
  try {
    run();
  } catch (error) {
    if (error instanceof CheckpointError) return error.code;
    throw error;
  }
  return "NO_THROW";
}

function registry(): CapabilityRegistry {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityRegistry",
    metadata: {},
    capabilities: {
      testing: {
        providers: [
          {
            id: "testing",
            priority: 1,
            cost: "low",
            quality_score: 1,
            availability: "active",
            version: "0.0.0",
          },
        ],
      },
    },
  };
}

function resumeEngine(jobsDir: string): ExecutionEngine {
  const router = new ProviderRouter();
  router.register(createMockProvider("testing"));
  return new ExecutionEngine({ registry: registry(), providers: router, jobsDir });
}

function irFor(featureId: string): CapabilityIR {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityGraph",
    metadata: { id: featureId, ir_version: "2.0.0", policy_ref: "rapid-prototype" },
    spec: {
      nodes: [
        {
          id: "n1",
          capability: "testing",
          type: "worker",
          dependencies: [],
          definition_of_done: [],
        },
      ],
    },
  };
}

describe("checkpoint integrity", () => {
  it("round-trips a signed checkpoint and keeps the MAC out of the signed payload", () => {
    const dir = workspace();
    const path = saveCheckpoint(dir, draft("feat-a", "waiting"));
    const envelope = JSON.parse(readFileSync(path, "utf-8")) as {
      kind: string;
      alg: string;
      envelope_version: number;
      mac: string;
      payload: EngineCheckpoint;
    };
    expect(envelope.kind).toBe("EngineCheckpointEnvelope");
    expect(envelope.alg).toBe("HMAC-SHA256");
    expect(envelope.envelope_version).toBe(1);
    expect(envelope.mac).toMatch(/^[0-9a-f]{64}$/);
    expect(envelope.payload).not.toHaveProperty("mac");
    expect((statSync(path).mode & 0o777) === 0o600).toBe(true);

    const loaded = loadCheckpoint(dir, "feat-a");
    expect(loaded?.feature_id).toBe("feat-a");
    expect(loaded?.graph.nodes[0]?.status).toBe("waiting");
    expect(JSON.stringify(envelope)).not.toContain(process.env[KEY_ENV]);
  });

  it("rejects a tampered payload and a replaced MAC", () => {
    const dir = workspace();
    const path = saveCheckpoint(dir, draft("feat-a"));
    const envelope = JSON.parse(readFileSync(path, "utf-8")) as { payload: { graph: { nodes: Array<{ status: string }> } }; mac: string };
    envelope.payload.graph.nodes[0].status = "satisfied";
    writeFileSync(path, JSON.stringify(envelope));
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("SIGNATURE_INVALID");

    const again = JSON.parse(readFileSync(saveCheckpoint(dir, draft("feat-a")), "utf-8")) as { mac: string };
    again.mac = `${"ab".repeat(32)}`;
    writeFileSync(path, JSON.stringify(again));
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("SIGNATURE_INVALID");
  });

  it("rejects a legacy checkpoint without a signature", () => {
    const dir = workspace();
    const path = join(dir, "checkpoints", "feat-a.json");
    mkdirSync(join(dir, "checkpoints"), { recursive: true });
    writeFileSync(path, JSON.stringify({ ...draft("feat-a"), apiVersion: "capability-orchestrator.io/v2", kind: "EngineCheckpoint", saved_at: new Date().toISOString() }));
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("SIGNATURE_ABSENT");
  });

  it("rejects truncated JSON, an unknown algorithm and an unknown envelope version", () => {
    const dir = workspace();
    const path = saveCheckpoint(dir, draft("feat-a"));
    writeFileSync(path, "{");
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("CORRUPT");

    saveCheckpoint(dir, draft("feat-a"));
    const badAlg = JSON.parse(readFileSync(path, "utf-8")) as { alg: string };
    badAlg.alg = "HMAC-SHA1";
    writeFileSync(path, JSON.stringify(badAlg));
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("UNSUPPORTED_INTEGRITY");

    saveCheckpoint(dir, draft("feat-a"));
    const badVersion = JSON.parse(readFileSync(path, "utf-8")) as { envelope_version: number };
    badVersion.envelope_version = 99;
    writeFileSync(path, JSON.stringify(badVersion));
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("UNSUPPORTED_INTEGRITY");
  });

  it("fails closed when the key is missing or too short and does not require a key for a missing file", () => {
    const dir = workspace();
    delete process.env[KEY_ENV];
    expect(loadCheckpoint(dir, "feat-a")).toBeNull();
    expect(errorCode(() => saveCheckpoint(dir, draft("feat-a")))).toBe("KEY_ABSENT");

    process.env[KEY_ENV] = randomBytes(32).toString("base64");
    saveCheckpoint(dir, draft("feat-a"));
    delete process.env[KEY_ENV];
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("KEY_ABSENT");

    process.env[KEY_ENV] = "too-short";
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("KEY_INVALID");
    const leaked = "checkpoint-key-material-do-not-leak-32b";
    process.env[KEY_ENV] = "short";
    try {
      loadCheckpoint(dir, "feat-a");
    } catch (error) {
      expect(error).toBeInstanceOf(CheckpointError);
      expect((error as Error).message).not.toContain(leaked);
      expect((error as Error).message).not.toContain("short");
    }
  });

  it("rejects another feature_id and a mismatched IR or policy", () => {
    const dir = workspace();
    const source = saveCheckpoint(dir, draft("feat-a"));
    const foreign = join(dir, "checkpoints", "feat-b.json");
    writeFileSync(foreign, readFileSync(source));
    expect(errorCode(() => loadCheckpoint(dir, "feat-b"))).toBe("FEATURE_MISMATCH");
    expect(errorCode(() => saveCheckpoint(dir, { ...draft("feat-a"), graph: { feature_id: "other", nodes: [graphNode("waiting")] } }))).toBe("CORRUPT");
    expect(errorCode(() => loadCheckpoint(dir, "feat-a", { ir_id: "other-ir" }))).toBe("CONTEXT_MISMATCH");
    expect(errorCode(() => loadCheckpoint(dir, "feat-a", { policy_id: "other-policy" }))).toBe("CONTEXT_MISMATCH");
  });

  it("accepts an older valid envelope copied over a newer one because there is no freshness store", () => {
    const dir = workspace();
    const path = saveCheckpoint(dir, draft("feat-a", "waiting"));
    const older = readFileSync(path);
    saveCheckpoint(dir, draft("feat-a", "satisfied"));
    expect(loadCheckpoint(dir, "feat-a")?.graph.nodes[0]?.status).toBe("satisfied");
    writeFileSync(path, older);
    const rolled = loadCheckpoint(dir, "feat-a");
    expect(rolled?.graph.nodes[0]?.status).toBe("waiting");
  });

  it("keeps a single file per feature and replaces it on the next save", () => {
    const dir = workspace();
    saveCheckpoint(dir, draft("feat-a", "pending"));
    saveCheckpoint(dir, draft("feat-a", "waiting"));
    const files = readdirSync(join(dir, "checkpoints")).filter((name) => !name.endsWith(".tmp"));
    expect(files).toEqual(["feat-a.json"]);
    expect(loadCheckpoint(dir, "feat-a")?.graph.nodes[0]?.status).toBe("waiting");
  });

  it("rejects a path escape and does not follow a symlink", () => {
    const dir = workspace();
    expect(errorCode(() => saveCheckpoint(dir, draft("../outside")))).toBe("CHECKPOINT_PATH_DENIED");

    const outside = join(dir, "outside.json");
    writeFileSync(outside, "untouched");
    mkdirSync(join(dir, "checkpoints"), { recursive: true });
    symlinkSync(outside, join(dir, "checkpoints", "feat-a.json"));
    expect(errorCode(() => saveCheckpoint(dir, draft("feat-a")))).toBe("CHECKPOINT_PATH_DENIED");
    expect(readFileSync(outside, "utf-8")).toBe("untouched");
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("CHECKPOINT_PATH_DENIED");
  });

  it("rejects a truncated file left in place of a checkpoint", () => {
    const dir = workspace();
    const path = saveCheckpoint(dir, draft("feat-a"));
    writeFileSync(path, "{\"kind\":\"EngineCheckpointEnvelope\"");
    expect(errorCode(() => loadCheckpoint(dir, "feat-a"))).toBe("CORRUPT");
  });
});

describe("checkpoint resume", () => {
  it("does not re-execute a node that was running when the process stopped", async () => {
    const dir = workspace();
    saveCheckpoint(dir, draft("feat-run", "running"));
    const result = await resumeEngine(dir).run({
      ir: irFor("feat-run"),
      policy_id: "rapid-prototype",
      feature_id: "feat-run",
      resume: true,
    });
    expect(result.success).toBe(false);
    expect(result.blocked_reason).toBe("reconciliation_required");
    expect(result.events.some((event) => event.type === "ProviderSelected")).toBe(false);
    expect(result.graph.nodes[0]?.status).toBe("blocked");
    expect(result.graph.nodes[0]?.metadata?.reconciliation).toBe("interrupted_running");
  });

  it("does not create a new execution for a waiting external job", async () => {
    const dir = workspace();
    saveCheckpoint(dir, draft("feat-wait", "waiting"));
    const result = await resumeEngine(dir).run({
      ir: irFor("feat-wait"),
      policy_id: "rapid-prototype",
      feature_id: "feat-wait",
      resume: true,
    });
    expect(result.success).toBe(false);
    expect(result.blocked_reason).toBe("awaiting_external_jobs");
    expect(result.events.some((event) => event.type === "ProviderSelected")).toBe(false);
    expect(result.graph.nodes[0]?.status).toBe("waiting");
  });

  it("starts a fresh graph when the checkpoint file is absent", async () => {
    const dir = workspace();
    const result = await resumeEngine(dir).run({
      ir: irFor("feat-new"),
      policy_id: "rapid-prototype",
      feature_id: "feat-new",
      resume: true,
    });
    expect(loadCheckpoint(dir, "feat-new")).toBeNull();
    expect(result.events.some((event) => event.type === "ProviderSelected")).toBe(true);
  });
});
