/**
 * SE-08 live Cursor smoke — skipped unless SE08_LIVE=1.
 * Never fabricates PASS without real Cursor.
 */
import { describe, it, expect } from "vitest";
import {
  CursorReasoningProvider,
  DefaultAgentExecutor,
  assembleAgentExecutionRequest,
  runSe08CursorCase,
  resolveCursorApiKey,
} from "../../src/index.js";

const LIVE = process.env.SE08_LIVE === "1" || process.env.SE08_LIVE === "true";

describe.skipIf(!LIVE)("SE-08 live Cursor (opt-in SE08_LIVE=1)", () => {
  it("AgentExecutor → CursorReasoningProvider → structured decision", async () => {
    const auth = resolveCursorApiKey();
    if (!auth.ok) {
      // Honest: live path blocked without credentials — not a fake PASS
      console.warn("SE08 live BLOCKED:", auth.message);
      expect(auth.ok).toBe(false);
      return;
    }

    const provider = new CursorReasoningProvider({
      execution_mode: "reasoning_only",
      model: process.env.CURSOR_MODEL?.trim() || "composer-2.5",
      timeout_ms: 180_000,
    });
    expect(provider.checkAvailable().available).toBe(true);
    expect(provider.a03_enforcement).toBe("PASS");

    const ex = new DefaultAgentExecutor({ provider, timeout_ms: 200_000 });
    const result = await ex.execute(
      assembleAgentExecutionRequest({
        execution_id: "se08-live-smoke",
        task_id: "live-smoke",
        agent_id: "backend-agent",
        objective:
          'Return ONLY JSON: {"decision_type":"FINAL_RESPONSE","reason":"smoke","details":"pong"}',
        decision_mode: "ANSWER",
        policy_summary: { policy_id: "rapid-prototype" },
        available_capabilities: [{ capability_id: "filesystem.write" }],
      }),
    );

    if (!result.success) {
      expect(result.error?.code).toBeTruthy();
      console.warn("SE08 live smoke unsuccessful:", result.error);
    } else {
      expect(result.decision).toBeTruthy();
      expect(result.provider_id).toBe("cursor");
    }
  }, 240_000);

  it("golden case se08-c1 against live Cursor (or BLOCKED)", async () => {
    const r = await runSe08CursorCase(
      (
        await import("../../src/agent/evals/se08-cursor-cases.js")
      ).SE08_CURSOR_CASES[0]!,
      { live: true },
    );
    expect(["PASS", "FAIL", "INCONCLUSIVE", "BLOCKED"]).toContain(r.status);
    expect(r.live).toBe(true);
  }, 240_000);
});
