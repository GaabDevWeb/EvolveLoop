import type { CapabilityIR, CapabilityRegistry, ProviderEntry } from "../../src/types/index.js";

export const loginDashboardIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: {
    id: "2026-06-30-login-dashboard",
    feature: "Login + Dashboard",
    ir_version: "2.0.0",
    policy_ref: "rapid-prototype",
  },
  spec: {
    nodes: [
      {
        id: "contract-1",
        capability: "api-contract",
        type: "worker",
        inputs: [{ ref: "global.feature-request" }],
        outputs: [{ id: "api-contract", path: "docs/contracts/login-api.md" }],
        dependencies: [],
        definition_of_done: [{ id: "dod-1", check: "OpenAPI documentado", verification: "evidence" }],
      },
      {
        id: "be-auth",
        capability: "backend-implementation",
        type: "worker",
        inputs: [{ ref: "contract-1.outputs" }],
        outputs: [{ id: "auth-module", path: "src/auth/" }],
        dependencies: ["contract-1"],
        definition_of_done: [{ id: "dod-be-1", check: "Endpoints implementados", verification: "automated" }],
      },
      {
        id: "fe-login",
        capability: "frontend-ui",
        type: "worker",
        inputs: [{ ref: "contract-1.outputs" }],
        outputs: [{ id: "ui-login", path: "src/pages/login/" }],
        dependencies: ["contract-1"],
        definition_of_done: [{ id: "dod-fe-1", check: "UI conforme spec", verification: "evidence" }],
      },
      {
        id: "test-suite",
        capability: "testing",
        type: "gate",
        dependencies: ["be-auth", "fe-login"],
        inputs: [{ ref: "be-auth.outputs" }, { ref: "fe-login.outputs" }],
        outputs: [{ id: "test-report", path: "telemetry/evidence/test-report.json" }],
        definition_of_done: [{ id: "dod-t-1", check: "Suite verde", verification: "automated" }],
        gate: { on_reject: "invalidate_downstream", verdict_required: true },
      },
    ],
  },
};

const mockProvider = (id: string, priority = 100): ProviderEntry => ({
  id,
  priority,
  cost: "medium",
  quality_score: 0.9,
  availability: "active",
  version: "1.0.0",
  telemetry: { success_rate: 0.95, average_duration_ms: 100 },
});

export const testRegistry: CapabilityRegistry = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityRegistry",
  metadata: { generated_at: new Date().toISOString() },
  capabilities: {
    "api-contract": { providers: [mockProvider("planner")] },
    "backend-implementation": { providers: [mockProvider("backend")] },
    "frontend-ui": { providers: [mockProvider("frontend-pro")] },
    testing: { providers: [mockProvider("testing")] },
    "security-review": { providers: [mockProvider("security")] },
    "po-acceptance": { providers: [mockProvider("po-review")] },
    documentation: { providers: [mockProvider("documentation")] },
    "frontend-visual-review": { providers: [mockProvider("frontend-pro", 90)] },
  },
};

export function buildMinimalIR(): CapabilityIR {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityGraph",
    metadata: { id: "minimal", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
    spec: {
      nodes: [
        {
          id: "a",
          capability: "api-contract",
          type: "worker",
          dependencies: [],
          inputs: [],
          outputs: [],
          definition_of_done: [{ id: "d1", check: "done", verification: "evidence" }],
        },
        {
          id: "b",
          capability: "backend-implementation",
          type: "worker",
          dependencies: ["a"],
          inputs: [],
          outputs: [],
          definition_of_done: [{ id: "d2", check: "done", verification: "evidence" }],
        },
      ],
    },
  };
}
