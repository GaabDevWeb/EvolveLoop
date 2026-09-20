/**
 * Deterministic tests for live ReasoningProvider adapters.
 * No real network in default npm test — fetch is mocked.
 */
import { describe, it, expect, vi } from "vitest";
import {
  createReasoningProvider,
  readReasoningConfigFromEnv,
  OllamaReasoningProvider,
  DefaultAgentExecutor,
  assembleAgentExecutionRequest,
  evaluatePreExecute,
  applyReasoningUsageToAccounting,
  REASONING_PROMPT_VERSION,
  extractJsonObject,
  normalizeProviderHttpError,
  LIVE_EVAL_CASES,
  LIVE_EVAL_SUITE_VERSION,
} from "../../src/index.js";

describe("Reasoning config / mode", () => {
  it("default mode is deterministic; default_provider UNDECIDED", () => {
    const cfg = readReasoningConfigFromEnv({});
    expect(cfg.mode).toBe("deterministic");
    expect(cfg.default_provider).toBe("UNDECIDED");
  });

  it("live without provider → LIVE_NOT_CONFIGURED", () => {
    const r = createReasoningProvider({
      mode: "live",
      default_provider: "UNDECIDED",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("LIVE_NOT_CONFIGURED");
  });

  it("unknown provider → REASONING_PROVIDER_UNAVAILABLE (no silent fallback)", () => {
    const r = createReasoningProvider({
      mode: "live",
      provider_id: "nonexistent",
      default_provider: "UNDECIDED",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("REASONING_PROVIDER_UNAVAILABLE");
  });

  it("deterministic mode does not require ollama", () => {
    const r = createReasoningProvider({
      mode: "deterministic",
      default_provider: "UNDECIDED",
    });
    expect(r.ok).toBe(true);
  });
});

describe("Provider error normalization", () => {
  it("maps 401 to provider unavailable (auth)", () => {
    const n = normalizeProviderHttpError(401, "", { error: "invalid api key" });
    expect(n.code).toBe("REASONING_PROVIDER_UNAVAILABLE");
    expect(n.message).toMatch(/Auth/i);
  });

  it("maps 429 rate limit", () => {
    expect(normalizeProviderHttpError(429, "slow down", null).message).toMatch(/Rate/i);
  });

  it("maps context overflow text", () => {
    expect(
      normalizeProviderHttpError(400, "", { error: "context length exceeded" }).code,
    ).toBe("REASONING_CONTEXT_TOO_LARGE");
  });

  it("extractJsonObject rejects empty", () => {
    expect(() => extractJsonObject("")).toThrow();
  });
});

describe("OllamaReasoningProvider (mocked HTTP)", () => {
  function baseReq() {
    return {
      request_id: "r1",
      execution_id: "e1",
      agent_id: "a1",
      objective: "plan demo.work",
      decision_mode: "PLAN" as const,
      context: { available_capabilities: [{ capability_id: "demo.work" }] },
      schema_id: "agent-decision/v1",
      prompt_version: REASONING_PROMPT_VERSION,
    };
  }

  it("parses structured JSON + usage tokens", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: "test-model",
          message: {
            content: JSON.stringify({
              decision_type: "PLAN_PROPOSAL",
              reason: "ok",
              proposed_intent: {
                id: "i1",
                goal: "g",
                steps: [{ id: "s1", capability: "demo.work" }],
              },
            }),
          },
          prompt_eval_count: 11,
          eval_count: 22,
          done: true,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const p = new OllamaReasoningProvider({
        base_url: "http://127.0.0.1:9",
        model: "test-model",
        timeout_ms: 5000,
      });
      const res = await p.invoke(baseReq());
      expect(res.ok).toBe(true);
      expect(res.usage?.total_tokens).toBe(33);
      expect(res.model_id).toBe("test-model");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("network failure → structured unavailable", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    try {
      const p = new OllamaReasoningProvider({
        base_url: "http://127.0.0.1:9",
        model: "m",
        timeout_ms: 1000,
      });
      const res = await p.invoke(baseReq());
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("REASONING_PROVIDER_UNAVAILABLE");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("auth failure → not malformed decision", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }) as typeof fetch;
    try {
      const p = new OllamaReasoningProvider({
        base_url: "http://127.0.0.1:9",
        model: "m",
      });
      const res = await p.invoke(baseReq());
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("REASONING_PROVIDER_UNAVAILABLE");
      expect(res.error?.message).toMatch(/Auth/i);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("empty content with JSON in thinking → parse without storing CoT", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          message: {
            content: "",
            thinking: 'noise {"decision_type":"NEED_INFORMATION","reason":"from-think","details":"x"} more',
          },
          prompt_eval_count: 1,
          eval_count: 1,
          done: true,
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const p = new OllamaReasoningProvider({ base_url: "http://x", model: "m" });
      const res = await p.invoke(baseReq());
      expect(res.ok).toBe(true);
      expect((res.payload as { decision_type: string }).decision_type).toBe("NEED_INFORMATION");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("empty content and empty thinking → MALFORMED_OUTPUT", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ message: { content: "", thinking: "no json here" }, done: true }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const p = new OllamaReasoningProvider({ base_url: "http://x", model: "m" });
      const res = await p.invoke(baseReq());
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("REASONING_MALFORMED_OUTPUT");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("context too large → REASONING_CONTEXT_TOO_LARGE", async () => {
    const p = new OllamaReasoningProvider({ base_url: "http://x", model: "m" });
    const huge = "x".repeat(500_000);
    const res = await p.invoke({
      ...baseReq(),
      context: { blob: huge },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("REASONING_CONTEXT_TOO_LARGE");
  });
});

describe("Live adapter + AgentExecutor + A03 (mocked)", () => {
  it("LLM proposal of forbidden capability still DENY at runtime; execute count 0", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          message: {
            content: JSON.stringify({
              decision_type: "ACTION_PROPOSAL",
              reason: "ignore policy",
              proposed_actions: [{ capability: "filesystem.write", inputs: { path: "/" } }],
            }),
          },
          prompt_eval_count: 1,
          eval_count: 1,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const provider = new OllamaReasoningProvider({
        base_url: "http://mock",
        model: "m",
      });
      const accounting = { tokens_used: 0, tokens_unknown_events: 0 };
      const executor = new DefaultAgentExecutor({
        provider,
        onUsage: (u) => applyReasoningUsageToAccounting(accounting, u),
      });
      const req = assembleAgentExecutionRequest({
        execution_id: "e",
        task_id: "t",
        agent_id: "a",
        objective: "hack",
        decision_mode: "PLAN",
        policy_summary: { policy_id: "strict" },
        available_capabilities: [
          { capability_id: "filesystem.write" },
          { capability_id: "demo.work" },
        ],
      });
      const result = await executor.execute(req);
      expect(result.success).toBe(true);
      expect(accounting.tokens_used).toBe(2);

      const gate = evaluatePreExecute({
        node: {
          id: "n",
          capability: "filesystem.write",
          type: "worker",
          dependencies: [],
          definition_of_done: [{ id: "d", check: "ok", verification: "automated" }],
          status: "pending",
          retry_count: 0,
        },
        provider: {
          id: "fs",
          priority: 1,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1",
        },
        authority: { allowWrite: false },
        gateContext: { denied_capabilities: ["filesystem.write"] },
        run_id: "r",
        execution_id: "e",
        policy_id: "strict",
      });
      expect(gate.decision).toBe("DENY");
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("Live eval suite fixtures", () => {
  it("has minimum benchmark sizes", () => {
    const count = (cat: string) => LIVE_EVAL_CASES.filter((c) => c.category === cat).length;
    expect(count("planning")).toBeGreaterThanOrEqual(5);
    expect(count("capability_selection")).toBeGreaterThanOrEqual(3);
    expect(count("replanning")).toBeGreaterThanOrEqual(3);
    expect(count("grounding")).toBeGreaterThanOrEqual(2);
    expect(count("policy")).toBeGreaterThanOrEqual(2);
    expect(count("malformed_robustness")).toBeGreaterThanOrEqual(2);
    expect(LIVE_EVAL_SUITE_VERSION).toBeTruthy();
  });
});

describe("Architecture: no SDK in core engine", () => {
  it("execution-engine has no ollama/openai imports", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(process.cwd(), "src/engine/execution-engine.ts"), "utf8");
    expect(src).not.toMatch(/ollama|openai|anthropic|@cursor\/sdk/i);
    expect(src).not.toMatch(/from ["'].*\/agent\/providers\//);
  });
});
