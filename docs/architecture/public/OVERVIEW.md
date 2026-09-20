# EvolveLoop — public architecture overview

EvolveLoop is a **local-first** agent development architecture. One core; profiles personalize.

## Layers

| Layer | Role |
|-------|------|
| **Agent** | Specialized roles (orchestrator root, workers, gates, Wiki context engineer) |
| **Capability** | Declared abilities in Capability IR — scheduler does not hardcode skill names |
| **Provider** | Implementations that satisfy capabilities (skills, deterministic tools, Wiki backend) |
| **Policy / PDA** | Risk tier, topology, budget, require[]; plan\|exec\|gate\|explore\|critic\|librarian |
| **Runtime** | Execution Engine (`orchestrator/`) — IR → policy → schedule → evidence |
| **Evidence** | JSON artifacts under feature `evidence_dir` for gates / continue decisions |
| **Knowledge** | `KnowledgeBackend` seam; default **Wiki**; `FakeKnowledgeBackend` for tests |
| **Telemetry** | Skill/run telemetry hooks (local) |
| **Evals** | Orchestrator eval suites (including EvolveLoop live evals) |
| **Evolution** | **EvolveLoop V1** — observation-first, gated candidates, frozen scope |

## Knowledge

```text
KNOWLEDGE_BACKEND env → profile → default (wiki)
```

Wiki skill + contracts are public. Personal corpora are **not** shipped; set `WIKI_ROOT`.

## Hard gates

- **knowledge-grounding** — before technical plan/implement when context is required  
- **grill-me** — conditional fail-closed after PRD when policy requires  
- **image-to-code** — when UI work has image attachments  

## Profiles

- `profiles/default.yaml` — public portable defaults (memory off)  
- Personal overlays (e.g. GaabType) configure paths, memory, hooks — **same core**

## Limitations

Documented as `V1_READY_WITH_LIMITATIONS`: observation-first, external production gate, incomplete adapter wiring, limited live observation vocabulary. No claim of fully autonomous self-modification.

## Deeper docs

- Knowledge seam: `docs/architecture/knowledge/`
- EvolveLoop freeze: `docs/architecture/evolveloopt/`
- Skill pack / pruning: `docs/architecture/skills/`
- Portability / publication: `docs/architecture/portability/`, `docs/architecture/publication/`
