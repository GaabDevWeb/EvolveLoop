# Knowledge Architecture

**Status:** active (post `KNOWLEDGE_PROFILE_SEAM`)  
**Date:** 2026-09-20

## Model

```text
MegaBrain
   │
   ▼
Knowledge  (abstraction: contracts knowledge.* + EvidenceSet + KnowledgeStore)
   │
   ▼
KnowledgeBackend  (seam — operations: search / inspect / health)
   │
   ▼
Wiki  (default implementation)
```

| Layer | Role | Lives in |
|-------|------|----------|
| **Knowledge** | What the core needs (retrieve, provenance, evidence) | contracts, `EvidenceSet`, run-scoped `KnowledgeStore` |
| **KnowledgeBackend** | How retrieval is performed | `orchestrator/src/knowledge/backend/` |
| **Wiki** | Current default backend | `WikiKnowledgeBackend` + skill `wiki` + vault CLI |
| **Profile** | User/env configuration | `profiles/default.yaml` + env (`WIKI_ROOT`, `KNOWLEDGE_BACKEND`) |

## What is NOT Knowledge

- **Session / episodic memory** (`wiki-mem`) — complementary; not the RAG backend.
- **EvolveLoop / Engine / Policy** — consume Knowledge; do not embed Wiki paths.

## Selection

1. `KNOWLEDGE_BACKEND` env (highest)
2. `profiles/default.yaml` → `knowledge.backend`
3. Default: `wiki`

## Fail-closed

Missing root / unavailable CLI → `error_code` on `EvidenceSet` (`RAG_REPO_MISSING`, `WIKI_*`). Policy grounding remains required; do not skip on empty evidence without explicit `skipped_trivial`.
