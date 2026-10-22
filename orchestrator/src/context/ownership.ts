import type { ContextOwnerId, GateBundleFields, PdaRole } from "./types.js";

const VALID_ROLES: PdaRole[] = ["plan", "exec", "gate", "explore", "critic", "librarian"];

export function isValidPdaRole(role: string): role is PdaRole {
  return (VALID_ROLES as string[]).includes(role);
}

/** Deterministic owner id per spawn (ADR-0013). */
export function deriveContextOwnerId(bundle: Pick<GateBundleFields, "parent_cycle_id" | "role" | "spawn_depth">): ContextOwnerId {
  const cycle = bundle.parent_cycle_id.trim() || "unknown-cycle";
  return `${cycle}:${bundle.role}:d${bundle.spawn_depth}`;
}

export function normalizeContextOwner(bundle: GateBundleFields): GateBundleFields {
  const id = bundle.context_owner_id?.trim() || deriveContextOwnerId(bundle);
  return { ...bundle, context_owner_id: id };
}
