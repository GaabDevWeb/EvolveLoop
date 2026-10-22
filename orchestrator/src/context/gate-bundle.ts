import { getCompactionReinjectContract } from "./compaction-contract.js";
import { deriveContextOwnerId, isValidPdaRole, normalizeContextOwner } from "./ownership.js";
import type { GateBundleFields, SpawnContextValidation } from "./types.js";

const REQUIRED_KEYS: (keyof GateBundleFields)[] = [
  "parent_cycle_id",
  "spawn_depth",
  "max_spawn_depth",
  "role",
];

function missingFields(bundle: Partial<GateBundleFields>): string[] {
  const miss: string[] = [];
  for (const k of REQUIRED_KEYS) {
    const v = bundle[k];
    if (v === undefined || v === null || (typeof v === "string" && !v.trim())) {
      miss.push(String(k));
    }
  }
  return miss;
}

/** Parse minimal GATE_BUNDLE from a plain object (host may YAML→JSON). */
export function parseGateBundle(raw: Record<string, unknown>): Partial<GateBundleFields> {
  const budgetRaw = raw.context_budget;
  let context_budget: GateBundleFields["context_budget"];
  if (budgetRaw && typeof budgetRaw === "object") {
    const b = budgetRaw as Record<string, unknown>;
    context_budget = {
      max_paths: typeof b.max_paths === "number" ? b.max_paths : undefined,
      max_pages: typeof b.max_pages === "number" ? b.max_pages : undefined,
      max_tokens: typeof b.max_tokens === "number" ? b.max_tokens : undefined,
    };
  }

  return {
    parent_cycle_id: String(raw.parent_cycle_id ?? ""),
    spawn_depth: Number(raw.spawn_depth),
    max_spawn_depth: Number(raw.max_spawn_depth ?? 3),
    role: String(raw.role ?? "") as GateBundleFields["role"],
    skill_path: raw.skill_path ? String(raw.skill_path) : undefined,
    knowledge_grounding: raw.knowledge_grounding as GateBundleFields["knowledge_grounding"],
    context_owner_id: raw.context_owner_id ? String(raw.context_owner_id) : undefined,
    context_budget,
  };
}

export function validateSpawnContext(bundleInput: Partial<GateBundleFields>): SpawnContextValidation {
  const compaction = getCompactionReinjectContract();
  const contractRef = {
    status: compaction.status,
    adr: compaction.adr,
    reinject_allowed: compaction.reinject_allowed,
  };

  const miss = missingFields(bundleInput);
  if (miss.length > 0) {
    return { valid: false, reason: "missing_gate_bundle", compaction: contractRef };
  }

  const role = String(bundleInput.role);
  if (!isValidPdaRole(role)) {
    return { valid: false, reason: "invalid_pda_role", compaction: contractRef };
  }

  const depth = bundleInput.spawn_depth!;
  const maxDepth = bundleInput.max_spawn_depth ?? 3;
  if (depth < 1 || depth > maxDepth) {
    return { valid: false, reason: "spawn_depth_out_of_range", compaction: contractRef };
  }

  const normalized = normalizeContextOwner(bundleInput as GateBundleFields);
  const context_owner_id = normalized.context_owner_id ?? deriveContextOwnerId(normalized);

  return {
    valid: true,
    context_owner_id,
    gate_bundle: normalized,
    compaction: contractRef,
  };
}
