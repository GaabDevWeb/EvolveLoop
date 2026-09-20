import type { KnowledgeEntry, ProposedKnowledgeEntry } from "../types/index.js";

export interface KnowledgeQuery {
  capability?: string;
  tags?: string[];
  text?: string;
}

export class KnowledgeStore {
  private entries: KnowledgeEntry[] = [];

  constructor(initial: KnowledgeEntry[] = []) {
    this.entries = [...initial];
  }

  search(query: KnowledgeQuery): KnowledgeEntry[] {
    return this.entries.filter((e) => {
      if (query.capability && !e.capabilities?.includes(query.capability)) return false;
      if (query.tags?.length && !query.tags.some((t) => e.tags?.includes(t))) return false;
      if (query.text && !e.content.toLowerCase().includes(query.text.toLowerCase())) return false;
      return true;
    });
  }

  propose(entry: ProposedKnowledgeEntry): KnowledgeEntry {
    const full: KnowledgeEntry = {
      id: `kb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: entry.kind,
      content: entry.content,
      tags: entry.tags,
      capabilities: entry.capabilities,
      confidence: entry.confidence ?? 0.5,
    };
    this.entries.push(full);
    return full;
  }

  verify(entryId: string): void {
    const entry = this.entries.find((e) => e.id === entryId);
    if (entry) entry.confidence = Math.min(1, (entry.confidence ?? 0.5) + 0.3);
  }

  getAll(): KnowledgeEntry[] {
    return [...this.entries];
  }
}
