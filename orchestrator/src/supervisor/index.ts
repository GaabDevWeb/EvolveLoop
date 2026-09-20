export type * from "./types.js";
export { canTransitionAssignment, assertTransition, InvalidAssignmentTransitionError } from "./lifecycle.js";
export { evaluateAgentEligibility, selectEligibleAgents, type EligibilityResult } from "./eligibility.js";
export { AssignmentStore, type ClaimAssignmentOptions, type ClaimAssignmentResult } from "./assignment-store.js";
export {
  validateDelegationDecision,
  buildDelegationResult,
  fingerprintResult,
  type DecisionValidationContext,
} from "./validate-decision.js";
export {
  SimulatedRuntimeBridge,
  ForbiddenDirectProviderBridge,
  decisionNeedsRuntime,
  type SimulatedRuntimeBridgeOptions,
} from "./runtime-bridge.js";
export {
  initialTaskStatuses,
  recomputeReadiness,
  listReadyTasks,
  countActiveAssignments,
} from "./readiness.js";
export { emitSupervisorTelemetry, type SupervisorTelemetryEvent } from "./telemetry.js";
export { buildDelegationEvidence } from "./evidence.js";
export { Supervisor, type SupervisorOptions, type DelegateTaskResult } from "./supervisor.js";

/** Default test/demo agent contracts */
export function defaultAgentCatalog(): import("./types.js").AgentContract[] {
  return [
    {
      agent_id: "backend-agent",
      agent_version: "0.1.0",
      role: "backend",
      compatible_roles: ["implementer"],
      allowed_capabilities: ["filesystem.write", "filesystem.read", "test.run"],
      forbidden_capabilities: ["unrestricted.shell", "unrestricted.network"],
      max_concurrent_assignments: 2,
      available: true,
    },
    {
      agent_id: "frontend-agent",
      agent_version: "0.1.0",
      role: "frontend",
      allowed_capabilities: ["filesystem.write", "filesystem.read"],
      forbidden_capabilities: ["unrestricted.shell"],
      available: true,
    },
    {
      agent_id: "tester-agent",
      agent_version: "0.1.0",
      role: "testing",
      compatible_roles: ["tester"],
      allowed_capabilities: ["test.run", "filesystem.read"],
      forbidden_capabilities: ["unrestricted.shell", "filesystem.write"],
      available: true,
    },
  ];
}
