/**
 * Live inventory snapshot from CapabilityRegistry (+ optional agentsRoot scan).
 * Reuses existing registry — does not create a second registry.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { CapabilityRegistry } from "../../types/index.js";
import type { SystemInventory } from "./registry-aware.js";

export type InventorySnapshotStatus = "FRESH" | "STALE" | "UNKNOWN" | "UNAVAILABLE";

export interface InventorySnapshot {
  inventory: SystemInventory;
  source_revision: string;
  timestamp: string;
  status: InventorySnapshotStatus;
  notes?: string[];
}

export interface SnapshotInventoryOptions {
  agentsRoot?: string;
  skillsHint?: string[];
  now?: Date;
}

/** Hash of sorted capability ids + provider ids for revision tracking. */
export function inventorySourceRevision(registry: CapabilityRegistry): string {
  const capIds = Object.keys(registry.capabilities).sort();
  const providerIds = new Set<string>();
  for (const id of capIds) {
    for (const p of registry.capabilities[id]?.providers ?? []) {
      providerIds.add(p.id);
    }
  }
  const material = `${capIds.join(",")}|${[...providerIds].sort().join(",")}`;
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}

function resolveSkillsDir(agentsRoot: string): string | null {
  const nested = join(agentsRoot, ".cursor", "skills");
  if (existsSync(nested)) return nested;
  const flat = join(agentsRoot, "skills");
  if (existsSync(flat)) return flat;
  return null;
}

function resolveAgentsDir(agentsRoot: string): string | null {
  const nested = join(agentsRoot, ".cursor", "agents");
  if (existsSync(nested)) return nested;
  const flat = join(agentsRoot, "agents");
  if (existsSync(flat)) return flat;
  return null;
}

/** Shallow scan: directory names with SKILL.md (skills) or plain dirs (agents). */
function scanAgentsRoot(agentsRoot: string): {
  skills: string[];
  agents: string[];
  notes: string[];
  ok: boolean;
} {
  const notes: string[] = [];
  const skills: string[] = [];
  const agents: string[] = [];

  if (!existsSync(agentsRoot)) {
    return { skills, agents, notes: [`agentsRoot_missing:${agentsRoot}`], ok: false };
  }

  try {
    const skillsDir = resolveSkillsDir(agentsRoot);
    if (skillsDir) {
      for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillMd = join(skillsDir, entry.name, "SKILL.md");
        if (existsSync(skillMd)) skills.push(entry.name);
      }
    } else {
      notes.push("skills_dir_not_found");
    }

    const agentsDir = resolveAgentsDir(agentsRoot);
    if (agentsDir) {
      for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
        if (entry.isDirectory()) agents.push(entry.name);
      }
    } else {
      notes.push("agents_dir_not_found");
    }

    return { skills, agents, notes, ok: true };
  } catch (err) {
    return {
      skills: [],
      agents: [],
      notes: [`agentsRoot_scan_failed:${err instanceof Error ? err.message : String(err)}`],
      ok: false,
    };
  }
}

/**
 * Snapshot system inventory from a live CapabilityRegistry.
 * Does not invent capability/provider entries — only reads the registry.
 */
export function snapshotInventoryFromRegistry(
  registry: CapabilityRegistry,
  opts?: SnapshotInventoryOptions,
): InventorySnapshot {
  const now = opts?.now ?? new Date();
  const notes: string[] = [];

  const capabilities = Object.keys(registry.capabilities).sort();
  const providers = new Set<string>();
  for (const capId of capabilities) {
    for (const p of registry.capabilities[capId]?.providers ?? []) {
      providers.add(p.id);
    }
  }

  let skills: string[] = [];
  let agents: string[] = [];
  let status: InventorySnapshotStatus = "FRESH";

  if (opts?.agentsRoot) {
    const scanned = scanAgentsRoot(opts.agentsRoot);
    notes.push(...scanned.notes);
    if (scanned.ok) {
      skills = scanned.skills;
      agents = scanned.agents;
    } else {
      status = "UNAVAILABLE";
      if (opts.skillsHint?.length) {
        skills = [...opts.skillsHint];
        notes.push("skills_from_hint_after_scan_failure");
      }
    }
  } else if (opts?.skillsHint?.length) {
    skills = [...opts.skillsHint];
    status = "UNKNOWN";
    notes.push("skills_from_hint_no_agentsRoot");
  } else {
    status = "UNKNOWN";
    notes.push("agents_skills_not_scanned");
  }

  // Registry capabilities still usable even when agent scan is UNKNOWN/UNAVAILABLE
  if (capabilities.length > 0 && status === "UNAVAILABLE") {
    notes.push("capabilities_present_despite_agentsRoot_unavailable");
  }

  return {
    inventory: {
      skills,
      capabilities,
      providers: [...providers].sort(),
      agents,
    },
    source_revision: inventorySourceRevision(registry),
    timestamp: now.toISOString(),
    status,
    notes: notes.length ? notes : undefined,
  };
}
