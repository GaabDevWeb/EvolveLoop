# KnowledgeBackend Contract

**id:** `knowledge-backend`  
**version:** `1.0.0`  
**purpose:** Minimal typed seam between MegaBrain core and retrieval backends.

## Operations

| Operation | Input | Output | Notes |
|-----------|-------|--------|-------|
| `search` | `query: string` | `EvidenceSet` | Primary retrieval |
| `inspect` | `query?: string` | `EvidenceSet` + `cli_available` + `rag_root` + `backend` | Health-ish probe |
| `health` | — | `KnowledgeHealth` | Availability without inventing hits |

## Errors (via EvidenceSet.error_code)

| Code | Meaning |
|------|---------|
| `RAG_REPO_MISSING` | Root unset or path missing |
| `WIKI_TIMEOUT` | Wiki CLI timeout (wiki backend) |
| `WIKI_UNAVAILABLE` | CLI/module unavailable |
| `WIKI_ERROR` | Other CLI failure |

Backend-agnostic codes preferred for missing root; wiki-specific codes remain for the Wiki implementation (implementation detail, not core policy).

## Evidence

Must preserve: `hits[].source`, `excerpt`, `retrieval_method`, `degraded`, `error_code`.

## Configuration

| Key | Role |
|-----|------|
| `KNOWLEDGE_BACKEND` | Backend id (`wiki` \| `fake`) |
| `WIKI_ROOT` | Canonical corpus root for Wiki backend |
| `RAG_REPO_ROOT` | Alias for `WIKI_ROOT` |
| `WIKI_CLI_MODULE` | EXTERNAL vault Python module (default `gaabwiki`) |

## Forbidden in this contract

Host usernames, personal brand names, Obsidian/Cursor assumptions, personal project lists.

## Implementation

TypeScript: `orchestrator/src/knowledge/backend/types.ts`
