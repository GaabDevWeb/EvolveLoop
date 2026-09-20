/**
 * MegaBrain profile — configuration / personalization boundary (not a runtime).
 * Profile configures core; core must not import personal paths.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { KnowledgeBackendId } from "../knowledge/backend/types.js";

export interface MegaBrainProfileKnowledge {
  /** Default: wiki */
  backend: KnowledgeBackendId | string;
}

export interface MegaBrainProfileMemory {
  enabled: boolean;
  /** Episodic provider id — wiki-mem today */
  provider?: string;
}

export interface MegaBrainProfile {
  id: string;
  version: string;
  knowledge: MegaBrainProfileKnowledge;
  memory: MegaBrainProfileMemory;
}

export const DEFAULT_PROFILE: MegaBrainProfile = {
  id: "default",
  version: "1.0.0",
  knowledge: { backend: "wiki" },
  memory: { enabled: true, provider: "wiki-mem" },
};

function agentsRoot(): string {
  return process.env.AGENTS_ROOT ?? process.env.MEGABRAIN_ROOT ?? "";
}

/**
 * Resolve profile file path.
 * Canonical: $AGENTS_ROOT/profiles/default.yaml
 * Override: MEGABRAIN_PROFILE_PATH
 */
export function resolveProfilePath(): string | null {
  if (process.env.MEGABRAIN_PROFILE_PATH) {
    return process.env.MEGABRAIN_PROFILE_PATH;
  }
  const root = agentsRoot();
  if (!root) return null;
  const p = join(root, "profiles", "default.yaml");
  return existsSync(p) ? p : null;
}

export function loadMegaBrainProfile(): MegaBrainProfile {
  const path = resolveProfilePath();
  if (!path) return { ...DEFAULT_PROFILE, knowledge: { ...DEFAULT_PROFILE.knowledge }, memory: { ...DEFAULT_PROFILE.memory } };

  try {
    const raw = parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
    const knowledge = (raw.knowledge ?? {}) as Record<string, unknown>;
    const memory = (raw.memory ?? {}) as Record<string, unknown>;
    return {
      id: String(raw.id ?? DEFAULT_PROFILE.id),
      version: String(raw.version ?? DEFAULT_PROFILE.version),
      knowledge: {
        backend: String(knowledge.backend ?? DEFAULT_PROFILE.knowledge.backend),
      },
      memory: {
        enabled: memory.enabled === undefined ? DEFAULT_PROFILE.memory.enabled : Boolean(memory.enabled),
        provider: memory.provider ? String(memory.provider) : DEFAULT_PROFILE.memory.provider,
      },
    };
  } catch {
    return { ...DEFAULT_PROFILE, knowledge: { ...DEFAULT_PROFILE.knowledge }, memory: { ...DEFAULT_PROFILE.memory } };
  }
}

/** Effective knowledge backend id: env wins over profile, default wiki. */
export function resolveKnowledgeBackendId(profile?: MegaBrainProfile): string {
  if (process.env.KNOWLEDGE_BACKEND?.trim()) {
    return process.env.KNOWLEDGE_BACKEND.trim().toLowerCase();
  }
  const p = profile ?? loadMegaBrainProfile();
  return String(p.knowledge.backend ?? "wiki").toLowerCase();
}
