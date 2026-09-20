/**
 * Deterministic agent eligibility — no LLM.
 */

import type { EngineeringTask } from "../tasks/types.js";
import type { AgentContract } from "./types.js";

export interface EligibilityResult {
  ok: boolean;
  reasons: string[];
}

export function evaluateAgentEligibility(
  task: EngineeringTask,
  agent: AgentContract,
): EligibilityResult {
  const reasons: string[] = [];

  if (agent.available === false) {
    reasons.push("agent unavailable");
  }

  const preferred = task.preferred_agent_role;
  const compatible = task.compatible_agent_roles ?? [];
  if (preferred) {
    const roleOk =
      agent.role === preferred ||
      (agent.compatible_roles ?? []).includes(preferred) ||
      compatible.includes(agent.role);
    if (!roleOk) {
      reasons.push(`role mismatch: need ${preferred}, agent is ${agent.role}`);
    }
  }

  const forbidden = new Set([
    ...(agent.forbidden_capabilities ?? []),
    "unrestricted.shell",
    "unrestricted.filesystem",
    "unrestricted.network",
  ]);

  for (const cap of task.required_capabilities ?? []) {
    if (forbidden.has(cap) || /unrestricted/i.test(cap)) {
      reasons.push(`forbidden capability required by task: ${cap}`);
      continue;
    }
    if (!agent.allowed_capabilities.includes(cap) && !agent.allowed_capabilities.includes("*")) {
      // allow empty required_capabilities
      if ((task.required_capabilities?.length ?? 0) > 0) {
        reasons.push(`agent lacks capability: ${cap}`);
      }
    }
  }

  // Agent must not have only forbidden caps overlapping
  for (const cap of agent.allowed_capabilities) {
    if (forbidden.has(cap) && cap !== "*") {
      reasons.push(`agent contract allows forbidden capability: ${cap}`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

export function selectEligibleAgents(
  task: EngineeringTask,
  agents: AgentContract[],
): AgentContract[] {
  return agents.filter((a) => evaluateAgentEligibility(task, a).ok);
}
