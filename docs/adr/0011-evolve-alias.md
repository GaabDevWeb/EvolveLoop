# ADR: Public entrypoint `/evolve`

## Status

Accepted (public extraction phase)

## Context

Historical command `/MegaBrain` and brand MegaBrain are personal/meme-toned. The evolution subsystem is already named EvolveLoop.

## Decision

- Public project name: **EvolveLoop**  
- Canonical Cursor command: **`/evolve`**  
- Legacy `/evolve` may exist only on personal overlays (GaabType), redirecting to the same orchestration skill  
- No second orchestration mechanism

## Consequences

Docs, AGENT.md, and public commands use `/evolve`. Internal filenames (e.g. `skill-gates.ts`) may remain until a safe rename; behavior is unchanged.
