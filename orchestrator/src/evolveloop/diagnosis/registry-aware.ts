/**
 * Registry-aware diagnosis — consult existing mechanisms before proposing new ones.
 * Does not invent registry entries; accepts an injected inventory snapshot.
 */

import type { CandidateType, RootCauseType } from "../types.js";

export interface SystemInventory {
  skills: string[];
  capabilities: string[];
  providers: string[];
  agents: string[];
}

export interface DiagnosisAdvice {
  prefer: CandidateType;
  avoid: CandidateType[];
  rationale: string[];
  overlaps: string[];
}

export function diagnoseWithInventory(
  primary: RootCauseType,
  inventory: SystemInventory,
  domain: string,
): DiagnosisAdvice {
  const overlaps: string[] = [];
  const d = domain.toLowerCase();
  for (const s of inventory.skills) if (s.toLowerCase().includes(d) || d.includes(s.toLowerCase())) overlaps.push(`skill:${s}`);
  for (const c of inventory.capabilities) if (c.toLowerCase().includes(d)) overlaps.push(`capability:${c}`);

  const rationale: string[] = [];
  let prefer: CandidateType = "NO_CHANGE";
  const avoid: CandidateType[] = [];

  if (primary === "SKILL_GAP") {
    if (overlaps.some((o) => o.startsWith("skill:"))) {
      prefer = "KNOWLEDGE";
      rationale.push("existing_skill_overlap_prefer_knowledge_or_routing");
      avoid.push("AGENT");
    } else {
      prefer = "SKILL";
      rationale.push("no_skill_overlap_skill_candidate_ok");
      avoid.push("AGENT");
    }
  } else if (primary === "CAPABILITY_GAP") {
    if (overlaps.some((o) => o.startsWith("capability:"))) {
      prefer = "PROVIDER";
      rationale.push("capability_exists_check_provider");
    } else {
      prefer = "CAPABILITY";
      rationale.push("capability_missing");
    }
    avoid.push("AGENT");
  } else if (primary === "AGENT_BOUNDARY") {
    if (overlaps.some((o) => o.startsWith("skill:")) || overlaps.some((o) => o.startsWith("capability:"))) {
      prefer = "SKILL";
      rationale.push("reuse_skill_or_capability_before_agent");
      avoid.push("AGENT");
    } else {
      prefer = "AGENT";
      rationale.push("no_overlap_agent_may_be_justified_with_alternatives");
    }
  } else if (primary === "NO_CHANGE" || primary === "ENVIRONMENT" || primary === "USER_CONFIGURATION") {
    prefer = "NO_CHANGE";
    rationale.push("non_architecture_or_insufficient");
    avoid.push("AGENT", "RUNTIME", "CAPABILITY");
  } else {
    prefer = primary === "KNOWLEDGE_GAP" ? "KNOWLEDGE" : primary === "POLICY_GAP" ? "POLICY" : "NO_CHANGE";
    avoid.push("AGENT");
  }

  return { prefer, avoid, rationale, overlaps };
}
