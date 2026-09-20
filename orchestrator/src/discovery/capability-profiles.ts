/** Capability discovery profiles — scope relevant caps for the agent context. */

import type { CapabilityRegistry } from "../types/index.js";

export type CapabilityProfile = "coding" | "research" | "diagnose" | "all";

export const CAPABILITY_PROFILES: Record<Exclude<CapabilityProfile, "all">, string[]> = {
  coding: [
    "filesystem.read",
    "filesystem.write",
    "filesystem.list",
    "filesystem.search",
    "git.status",
    "git.diff",
    "git.log",
    "git.inspect",
    "project.inspect",
    "project.search",
    "shell.execute",
    "knowledge.search",
  ],
  research: [
    "knowledge.search",
    "knowledge.inspect",
    "browser.navigate",
    "browser.extract",
    "filesystem.read",
    "filesystem.search",
  ],
  diagnose: [
    "system.inspect",
    "system.cpu",
    "system.memory",
    "system.disk",
    "system.processes",
    "project.inspect",
    "git.inspect",
    "knowledge.search",
    "filesystem.search",
  ],
};

export function capabilitiesForProfile(profile: CapabilityProfile): string[] | null {
  if (profile === "all") return null;
  return CAPABILITY_PROFILES[profile];
}

export function filterRegistryByProfile(
  registry: CapabilityRegistry,
  profile: CapabilityProfile,
): CapabilityRegistry {
  const allowed = capabilitiesForProfile(profile);
  if (!allowed) return registry;

  const set = new Set(allowed);
  const capabilities: CapabilityRegistry["capabilities"] = {};
  for (const [id, entry] of Object.entries(registry.capabilities)) {
    if (set.has(id)) capabilities[id] = entry;
  }
  return {
    ...registry,
    capabilities,
  };
}
