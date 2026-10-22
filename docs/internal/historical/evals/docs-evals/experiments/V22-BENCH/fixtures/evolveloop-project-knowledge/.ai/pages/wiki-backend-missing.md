---
title: Wiki backend sem vault
status: atual
source_paths:
  - orchestrator/src/knowledge/backend/wiki-backend.ts
keywords: RAG_REPO_MISSING WIKI_ROOT wiki backend degraded
---

Sem `WIKI_ROOT`/`RAG_REPO_ROOT`, `WikiKnowledgeBackend.search` devolve `error_code: RAG_REPO_MISSING` (ver `wiki-backend.ts`).
