# EvolveLoop

**Controlled, observation-first agent development architecture** — local-first, gated, modular.

EvolveLoop is a reusable system for orchestrating specialized agents with explicit capabilities, providers, policy, knowledge, evidence, evaluation, and a frozen V1 **evolution loop**. It is not a chatbot product, not a claim of fully autonomous self-modification, and not a hosted SaaS.

| Layer | Public identity |
|-------|-----------------|
| Project | **EvolveLoop** |
| Entrypoint | **`/evolve`** |
| Knowledge default | **Wiki** (`KnowledgeBackend`) |
| Personal distribution | **GaabType** (profile overlay — not a second core) |
| Legacy alias | MegaBrain / `/MegaBrain` (non-public; optional on personal profiles) |

---

## Why it exists

Coding agents need more than prompts: they need **routing**, **gates**, **evidence**, and **honest limits**. EvolveLoop packages a Capability IR → Policy → Scheduler → Providers pipeline, hard gates for design/vision/knowledge, and an observation-first evolution subsystem (EvolveLoop V1) that proposes change under gates — not silent self-rewrites.

## Core architecture

```text
Agent  →  Capability  →  Provider
                ↓
             Policy / PDA
                ↓
             Runtime / Evidence
                ↓
        Knowledge (Wiki default)
                ↓
     Telemetry · Evals · Evolution
```

See [docs/architecture/public/OVERVIEW.md](docs/architecture/public/OVERVIEW.md).

### Delivery flow

```text
Input → Routing → Brainstorming? → PRD → Grill-me [when applicable]
  → Planner → PDA → Testing → Debugger [when needed]
  → Gates → Validator → Documentation
```

### Evolution flow (V1, observation-first)

```text
Execution → Observation → Signal → Pattern → Need → RCA
  → Evolution Candidate → Gate → Outcome
```

V1 is **frozen** with documented limitations (observation vocabulary, external production gate, incomplete Evidence/Eval/Feedback adapters). Status: `V1_READY_WITH_LIMITATIONS`.

## Hard gates

| Gate | Mode |
|------|------|
| `knowledge-grounding` | Required when the flow needs wiki/RAG context |
| `grill-me` | Conditional, fail-closed (after PRD, before plan when policy says so) |
| `image-to-code` | Hard gate when images are attached for UI work |

## Local-first philosophy

- Runs in your environment (Cursor + optional Node orchestrator).
- Knowledge corpus is **your** Wiki vault via `WIKI_ROOT` — not shipped.
- Episodic memory (`wiki-mem`) is **optional** on the public default profile.
- Secrets stay in env / untracked files — never in git.

## Profiles

```text
EvolveLoop (main)
   └── profiles/default.yaml   → portable public defaults

GaabType (personal branch/profile)
   └── same core
       + profiles/gaabtype/*   → personal Wiki path, memory, hooks, project maps
```

**GaabType does not duplicate** orchestrator, agents, EvolveLoop, or KnowledgeBackend source.

## Quick start

1. Clone this repository.
2. Open it in Cursor (or attach [`AGENT.md`](AGENT.md) to your agent).
3. Let the agent follow **AGENT.md**: detect → inspect → backup → ask → configure → install → validate → report.
4. Set `WIKI_ROOT` if you use Wiki grounding (create new, use existing, or skip with documented limits).
5. Optional: enable memory in profile / hooks when you want episodic continuity.

Manual install helpers: `scripts/install-agents-global.sh`, `agent-setup/` (declarative profiles). Prefer AGENT.md for first-time setup.

### Environment (portable)

| Variable | Role |
|----------|------|
| `WIKI_ROOT` | Canonical Wiki vault path |
| `RAG_REPO_ROOT` | Alias of `WIKI_ROOT` |
| `KNOWLEDGE_BACKEND` | Override (`wiki` default; `fake` for tests) |
| `AGENTS_ROOT` | Repo root for global skill/agent install |
| `ORCHESTRATOR_ROOT` | Path to `orchestrator/` when using the engine |
| `EVOLVELOOP_PROFILE_PATH` | Optional profile file override |

External Wiki CLI module (when used): `WIKI_CLI_MODULE` — implementation detail of the vault tooling; **not** a public product identity.

## Repository map

| Path | Role |
|------|------|
| `orchestrator/` | Execution Engine (Capability IR, policy, EvolveLoop, KnowledgeBackend) |
| `.cursor/skills/` | Essential skill pack + Wiki |
| `.cursor/commands/` | `/evolve`, `/wiki`, `/prd`, `/planejar`, … |
| `profiles/default.yaml` | Public defaults |
| `Agents/` | Human-readable agent mirrors |
| `global-skills/` | Tier-3 essentials (e.g. grill-me, image-to-code) |
| `docs/` | Getting started, concepts, architecture |

## Limitations (honest)

- Not “fully autonomous” or “production-proven self-modifying AI”.
- EvolveLoop V1 is **observation-first** and gated.
- Production deployment gates remain **external** to this repo’s claims.
- Some Evidence / Eval / Feedback adapters are not fully connected.
- Live observation vocabulary is intentionally limited in V1.

## Security

See [SECURITY.md](SECURITY.md). Treat MCP, filesystem, and agent tools as powerful; keep secrets out of the tree.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Preserve contracts, hard gates, and skill discipline. No arbitrary framework additions.

## License

[MIT](LICENSE) — see also [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Roadmap (high level)

- Fresh-clone and clean-environment validation (next phase).
- Full regression / eval battery (next phase).
- Public release (not done in this extraction).

---

*Legacy name MegaBrain referred to an earlier personal branding of this architecture. Public identity is EvolveLoop.*
