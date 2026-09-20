# ADR: Wiki as default Knowledge backend

## Status

Accepted (reaffirmed during public extraction)

## Context

Knowledge is abstracted behind `KnowledgeBackend`. Wiki is the production default; Fake is for tests.

## Decision

- Default `knowledge.backend: wiki` in `profiles/default.yaml`  
- Override via `KNOWLEDGE_BACKEND`  
- Personal corpus via `WIKI_ROOT` only — never hardcoded in core  
- External CLI module name (`gaabwiki`) may remain an implementation dependency of the vault tooling — not public product branding

## Consequences

Public users must configure `WIKI_ROOT` (or accept grounding limits without a vault).
