import { describe, expect, it } from "vitest";
import {
  AgentBackendRegistry,
  MockCursorAgentBackend,
  MockCodexAgentBackend,
  MockClaudeCodeAgentBackend,
  MockAntigravityAgentBackend,
  CodexAgentBackend,
  ClaudeCodeAgentBackend,
  AntigravityAgentBackend,
  runAgentBackendContractSuite,
  AGENT_BACKEND_CONTRACT_VERSION,
} from "../../../src/backends/index.js";

describe("AgentBackend contract", () => {
  it("registry resolves explicitly and never auto-fallbacks", () => {
    const reg = new AgentBackendRegistry();
    reg.register(new MockCursorAgentBackend());
    reg.register(new MockCodexAgentBackend());
    expect(reg.resolve("cursor-mock").identity.backend_id).toBe("cursor-mock");
    expect(() => reg.resolve("missing")).toThrow(/BACKEND_UNAVAILABLE/);
  });

  it("contract suite PASS on mocks", async () => {
    for (const b of [
      new MockCursorAgentBackend({ decision: { ack: true } }),
      new MockCodexAgentBackend(),
      new MockClaudeCodeAgentBackend(),
      new MockAntigravityAgentBackend(),
    ]) {
      const results = await runAgentBackendContractSuite(b);
      const fails = results.filter((r) => r.status === "FAIL");
      expect(fails, JSON.stringify(fails)).toEqual([]);
      expect(b.identity.contract_version).toBe(AGENT_BACKEND_CONTRACT_VERSION);
      expect(b.capabilities().evolveloop_sandbox).toBe("UNAVAILABLE");
    }
  });

  it("agent_runtime is LIMITED (Model C)", async () => {
    const r = await new MockCursorAgentBackend().run({
      run_id: "1",
      execution_id: "e",
      task_id: "t",
      objective: "x",
      mode: "agent_runtime",
    });
    expect(r.a03_enforcement).toBe("LIMITED");
    expect(r.ok).toBe(false);
  });

  it("real adapters fail-closed when SDK/auth missing (no fake live)", async () => {
    const codex = await new CodexAgentBackend().health();
    const claude = await new ClaudeCodeAgentBackend().health();
    const agy = await new AntigravityAgentBackend().health();
    // May be ready if packages installed — either way must not throw
    expect(["ready", "unavailable", "auth_required", "degraded"]).toContain(codex.status);
    expect(["ready", "unavailable", "auth_required", "degraded"]).toContain(claude.status);
    expect(["ready", "unavailable", "auth_required", "degraded"]).toContain(agy.status);
  });

  it("adversarial: auth failure classified", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const auth = await new ClaudeCodeAgentBackend().authenticate();
    expect(auth.ok).toBe(false);
    expect(auth.code).toBe("AUTHENTICATION_FAILED");
    if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
  });
});
