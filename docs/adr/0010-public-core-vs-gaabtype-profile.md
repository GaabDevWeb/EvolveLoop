# ADR: Public core vs GaabType profile

## Status

Accepted (public extraction phase)

## Context

The repository evolved from a personal agent environment into a reusable architecture. Publishing requires separating product identity from author personalization without forking the runtime.

## Decision

- **`main`** ships EvolveLoop core + portable `profiles/default.yaml`.  
- **`GaabType`** is a **branch/profile overlay** (same core) for personal Wiki path, memory defaults, hooks, and project maps.  
- **No duplicated** orchestrator / EvolveLoop / KnowledgeBackend trees.

## Consequences

Personal leaks must not appear in public defaults. Inheritance is configuration, not copy-paste architecture.
