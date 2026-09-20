/**
 * FakeKnowledgeBackend — test-only backend.
 * NOT for production. Selected only when KNOWLEDGE_BACKEND=fake.
 */

import type { EvidenceSet } from "../../capabilities/results.js";
import type {
  KnowledgeBackend,
  KnowledgeHealth,
  KnowledgeInspectResult,
} from "./types.js";

export class FakeKnowledgeBackend implements KnowledgeBackend {
  readonly id = "fake" as const;

  constructor(
    private readonly opts: {
      hits?: EvidenceSet["hits"];
      error_code?: string | null;
      available?: boolean;
    } = {},
  ) {}

  async search(query: string): Promise<EvidenceSet> {
    if (this.opts.error_code) {
      return {
        kind: "EvidenceSet",
        query,
        hits: [],
        retrieval_method: "unavailable",
        degraded: "fake_error",
        error_code: this.opts.error_code,
      };
    }
    return {
      kind: "EvidenceSet",
      query,
      hits: this.opts.hits ?? [
        {
          source: "fake://fixture",
          excerpt: `fake hit for: ${query}`,
          score: 1,
          retrieval_method: "fake",
        },
      ],
      retrieval_method: "fake",
      degraded: null,
      error_code: null,
    };
  }

  async inspect(query = ""): Promise<KnowledgeInspectResult> {
    const base = await this.search(query || "overview");
    return {
      ...base,
      cli_available: !this.opts.error_code,
      rag_root: "",
      backend: this.id,
    };
  }

  async health(): Promise<KnowledgeHealth> {
    const available = this.opts.available ?? !this.opts.error_code;
    return {
      available,
      backend: this.id,
      root: undefined,
      error_code: this.opts.error_code ?? null,
      degraded: available ? null : "fake_unavailable",
    };
  }
}
