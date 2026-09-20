import type { AgentBackend, AgentBackendIdentity } from "./types.js";

export class AgentBackendRegistry {
  private readonly backends = new Map<string, AgentBackend>();

  register(backend: AgentBackend): void {
    const id = backend.identity.backend_id;
    if (this.backends.has(id)) {
      throw new Error(`AgentBackend already registered: ${id}`);
    }
    this.backends.set(id, backend);
  }

  get(backend_id: string): AgentBackend | undefined {
    return this.backends.get(backend_id);
  }

  list(): AgentBackendIdentity[] {
    return [...this.backends.values()].map((b) => b.identity);
  }

  /** Explicit selection only — no auto-fallback (grill-me Q8). */
  resolve(backend_id: string): AgentBackend {
    const b = this.backends.get(backend_id);
    if (!b) {
      throw new Error(`BACKEND_UNAVAILABLE: unknown backend_id=${backend_id}`);
    }
    return b;
  }
}

export function createDefaultBackendRegistry(): AgentBackendRegistry {
  return new AgentBackendRegistry();
}
