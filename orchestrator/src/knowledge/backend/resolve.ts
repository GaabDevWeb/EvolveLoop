/**
 * Resolve the active KnowledgeBackend.
 * Default: wiki. Test-only: fake (when KNOWLEDGE_BACKEND=fake).
 */

import { loadMegaBrainProfile, resolveKnowledgeBackendId } from "../../config/profile.js";
import { FakeKnowledgeBackend } from "./fake-backend.js";
import type { KnowledgeBackend } from "./types.js";
import { WikiKnowledgeBackend } from "./wiki-backend.js";

let cached: KnowledgeBackend | null = null;
let cachedKey: string | null = null;

/** Clear cache (tests). */
export function resetKnowledgeBackendCache(): void {
  cached = null;
  cachedKey = null;
}

export function resolveKnowledgeBackend(options?: {
  /** Force backend id (tests). */
  backendId?: string;
  /** Inject instance (tests). */
  instance?: KnowledgeBackend;
}): KnowledgeBackend {
  if (options?.instance) return options.instance;

  const profile = loadMegaBrainProfile();
  const id = (options?.backendId ?? resolveKnowledgeBackendId(profile)).toLowerCase();

  if (cached && cachedKey === id) return cached;

  let backend: KnowledgeBackend;
  switch (id) {
    case "fake":
      backend = new FakeKnowledgeBackend();
      break;
    case "wiki":
    default:
      // Unknown ids fall back to wiki (safe default) — do not silently skip grounding.
      backend = new WikiKnowledgeBackend();
      break;
  }

  cached = backend;
  cachedKey = id === "fake" || id === "wiki" ? id : "wiki";
  return backend;
}
