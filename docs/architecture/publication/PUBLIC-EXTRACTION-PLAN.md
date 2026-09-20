# Public Extraction Plan — CursorSKILLS / MegaBrain

**Status:** `PUBLIC_EXTRACTION_PLAN_COMPLETE`  
**Generated:** 2026-09-20T02:24:13Z  
**Mode:** READ-ONLY blueprint (no product mutations)  
**Sources:** portability forensic, Wiki generalization, Knowledge/Profile seam, skill pruning, EvolveLoop V1 freeze

---

## 1. Executive Summary

O repositório já possui **arquitectura publicável** (orchestrator, KnowledgeBackend, EvolveLoop, skills podadas, hard gates). O que falta para uma `main` séria não é redesenhar o runtime — é **extrair overlay pessoal**, limpar artefactos de desenvolvimento, fechar gaps de onboarding (LICENSE, AGENT.md, README), e decidir **branding público** (MegaBrain = provisório).

**Recomendação estrutural:** `GaabType` = **profile overlay** (`profiles/gaabtype/` + env), **não** segundo core / não branch com código duplicado.

```text
CURRENT REPO
    │
    ├─► PUBLIC MAIN   = architecture + portable defaults + public docs/onboarding
    └─► GAABTYPE      = MAIN + profiles/gaabtype + personal hooks/commands optional + WIKI_ROOT corpus
```

## 2. Current Architecture (reconciled)

| Layer | State | Evidence |
|-------|-------|----------|
| Orchestrator / IR / Scheduler / Evidence | CORE | `orchestrator/src/*` |
| KnowledgeBackend + Wiki default | CORE + default backend | `knowledge/backend/*`, `profiles/default.yaml` |
| knowledge-grounding gate | CORE policy | `knowledge-grounding-gate.md` |
| EvolveLoop V1 | CORE frozen | `evolveloop/` + freeze docs |
| Skill pack | pruned/validated | pruning reports; 13 global + local pipeline |
| Profile boundary | present (minimal) | `profiles/default.yaml`, `config/profile.ts` |
| Personal corpus | EXTERNAL host | `WIKI_ROOT` → karpathyWiki |
| Branding | provisional | MegaBrain / CursorSKILLS / GaabDevWeb |

## 3. Main Boundary

See `PUBLIC-MAIN-MANIFEST.yaml`.

**In main:** orchestrator, contracts, providers (generic + Wiki *backend code*), Agents mirrors (generic), `.cursor/skills` pipeline (incl. wiki as Context Engineer), global-skills (pruned pack), `profiles/default.yaml`, agent-setup *mechanism*, scripts/install, mcp templates, docs user+architecture (curated), tests.

**Out of main:** memory/* sessions, *-workspace, .prune-snapshots, research dumps with personal paths, absolute host rebuild manifests as SSOT, personal corpus, GaabDevWeb-only assumptions.

## 4. GaabType Boundary

See `GAABTYPE-MANIFEST.yaml`.

**Preferred form:** profile directory overlay under same repo (or private fork overlay), **NO DUPLICATED CORE**.

```text
profiles/gaabtype/
  knowledge.yaml      # backend wiki, notes
  paths.example.yaml  # WIKI_ROOT documented — real values in env
  projects.yaml       # KernelBot/OrbitBot pack map
  preferences.yaml    # locale PT commands?, memory always-on
hooks/ (optional enable) wiki-mem always-on
rules/ wiki-agent with author project table
```

## 5. Public Core

Engine, Policy, PDA, Capability/Provider, Evidence, Knowledge abstraction, Wiki *implementation as default backend*, EvolveLoop, hard gates grill-me/image-to-code/knowledge-grounding, worker/gate skills, megabrain.mdc *discipline* (rename brand later).

## 6. Personal Layer

Author vault corpus, pack tables KernelBot/…, always-on wiki-mem as *mandatory*, agents.env absolute paths, GaabDevWeb clone URLs, Documentos locale defaults, reverseEnginering research paths, prune snapshots, session memory/.

## 7. Config Layer

| Item | Placement |
|------|-----------|
| `KNOWLEDGE_BACKEND` | ENV override / profile |
| `WIKI_ROOT` | ENV (canonical) |
| `RAG_REPO_ROOT` | ENV alias |
| `WIKI_CLI_MODULE` | ENV (EXTERNAL default gaabwiki) |
| `AGENTS_ROOT` | ENV |
| `memory.enabled` | PROFILE |
| project pack map | GAAB_PROFILE |
| secrets MCP | ENV / mcp.env (never git) |

## 8. Wiki Layer

| Public | GaabType |
|--------|----------|
| Wiki backend code + skill `/wiki` | WIKI_ROOT → personal corpus |
| knowledge-grounding policy | personal pack routing |
| contracts knowledge.* | wiki-mem preferences / always-on hooks |

## 9. EvolveLoop Boundary

**All EvolveLoop source + tests → MAIN.**  
No personal config required for V1 freeze. Telemetry dirs gitignored. Do not fork EvolveLoop for GaabType.

## 10. Skill Pack Boundary

**PUBLIC_CORE:** orquestrar, prd, planner, backend, frontend-pro, testing, security, po-review, documentation, debugger, grill-me, image-to-code, systematic-debugging, wiki (as Knowledge Context Engineer).  
**PUBLIC_OPTIONAL:** tier3 remaining, meta-skills, devops, database, adr, architect, researcher, …  
**GAAB_PROFILE / optional:** wiki-mem as *required* always-on (public: optional/default-off or opt-in).  
**HOST_ONLY:** wiki-carpaccio, ip-as-logo (not in pack).  
**Do not re-prune.**

## 11. Command Boundary

See `PUBLIC-COMMAND-MATRIX.yaml`. `/MegaBrain` = public entry (rename with brand). `/wiki` public. `/mem` = public-optional or profile-default-on for GaabType.

## 12. Agent Boundary

Wiki, Orquestrador, workers, gates → public. Wiki-mem → public optional / Gaab default-on.

## 13. Hook Boundary

orchestrator pickup/after-engine → PUBLIC_CORE. wiki-mem hooks → GAAB_PROFILE (opt-in public).

## 14. Documentation Boundary

USER + ARCHITECTURE curated → main. RESEARCH HISTORY + INTERNAL AUDITS → keep but mark INTERNAL or move to `docs/internal/` later. PERSONAL NOTES → out.

## 15. Development Artifact Boundary

`memory/`, `*-workspace/`, `.prune-snapshots/`, `node_modules/`, `dist/` → GITIGNORE / REMOVE_BEFORE_PUBLICATION / KEEP_LOCAL_ONLY.

## 16. Publication Blockers

See `PUBLICATION-GAP-REGISTER.yaml`. Top: no LICENSE; README still personal-flavored; AGENT.md missing; Cursor command drift (`wiki-grounding` vs `knowledge-grounding`); wiki-mem always-on; host rebuild YAMLs; brand MegaBrain; GaabDevWeb; fresh-clone never proven.

## 17. Extraction Sequence

See `PUBLIC-EXTRACTION-SEQUENCE.yaml`.

## 18. AGENT.md Requirements

See `AGENT-MD-REQUIREMENTS.yaml`.

## 19. Main/Personal Relationship

```text
GaabType = main + profile overlay (NO duplicated source)
```

## 20. Naming Strategy

See `PROJECT-NAMING-AUDIT.md`. Direction: **RENAME or CODENAME_ONLY** for public product; keep MegaBrain as internal/codename optionally; GaabType stays personal profile name.


---

## Appendix A — Reconciliation note

Portability forensic audit (pre-seam) documented strong GaabWiki path coupling. **Post Knowledge/Profile seam** (current validated state):

- KnowledgeBackend present; Wiki default
- `profiles/default.yaml` present
- core personal path leaks reported **0** in latest validation sequence
- Wiki skill generalized; CLI module remains EXTERNAL `gaabwiki`
- EvolveLoop V1 frozen; skill pack pruned

This plan **does not contradict** those results: remaining work is **extraction/publication**, not re-architecture.

## Appendix B — Final classification table

| Area | Current | Public Main | GaabType | Action Later |
|------|---------|-------------|----------|--------------|
| Orchestrator | core | ✓ | inherited | none |
| EvolveLoop | core frozen | ✓ | inherited | none |
| KnowledgeBackend | generic | ✓ | inherited | none |
| Wiki backend | default | ✓ | inherited/configured | none |
| Personal corpus | external | ✗ | ✓ via WIKI_ROOT | profile |
| wiki-mem | mixed always-on | optional | default-on | extract hooks |
| Paths | env-normalized | ENV | profile+ENV | scrub docs |
| Skills pack | pruned | ✓ curated | +prefs | no re-prune |
| Commands | PT+MegaBrain | ✓ (+brand) | same | rename brand |
| Agents | mirrors | ✓ | optional mem | none |
| Hooks | mixed | split | split | extract |
| agent-setup | mechanism | ✓ | personal units | scrub |
| memory/ workspaces | local | ✗ | local | gitignore |
| LICENSE/AGENT.md | missing | required | n/a | create later |
| MegaBrain name | provisional | TBD | n/a | naming decision |

## Appendix C — Fresh-clone validation plan (NOT executed now)

```text
1. Clone public main to clean Linux user (no /home/gaab assumptions)
2. No WIKI_ROOT set initially
3. Follow AGENT.md → detect → ask → configure default profile
4. Cases matrix:
   - no Wiki / new Wiki / existing Wiki / custom WIKI_ROOT / Wiki disabled if supported
   - memory disabled
   - local model unavailable
   - browser tooling absent
   - external MCP absent
5. Run orchestrator test suite + EvolveLoop suite
6. Smoke KnowledgeBackend health with Fake or Wiki if configured
7. Confirm no personal paths in installed artifacts
```

## Appendix D — README future structure (do not write yet)

```text
README
├── What it is
├── Architecture
├── Why it exists
├── Quick Start
├── Agent-assisted setup (AGENT.md)
├── Knowledge/Wiki
├── Skills
├── EvolveLoop
├── Security
├── Evaluation
├── Limitations
└── Contributing
```

## Appendix E — License / contribution readiness (diagnose only)

| Artifact | Status |
|----------|--------|
| LICENSE | NO_LICENSE |
| NOTICE | absent |
| CONTRIBUTING | NO_CONTRIB |
| SECURITY | absent |
| CODE_OF_CONDUCT | absent |
| dependency license inventory | not done |
| third-party skill licenses | not inventoried |

## Appendix F — Public test matrix (plan)

| Scenario | Purpose |
|----------|---------|
| fresh Linux | baseline portability |
| existing Cursor | upgrade path |
| no Wiki | core without knowledge corpus |
| new Wiki | AGENT.md creates empty vault |
| existing Wiki | point WIKI_ROOT |
| custom WIKI_ROOT | env override |
| Wiki disabled if supported | optional backends |
| memory disabled | wiki-mem off |
| local model unavailable | policy/routing degrade |
| browser absent | optional tooling |
| MCP absent | core still works |

## Appendix G — High-risk extraction points

1. Brand rename surface (`MegaBrain.md`, `megabrain.mdc`, env `MEGABRAIN_PROFILE_PATH`)
2. wiki-mem hook default-on → public opt-in
3. Cursor command drift (`wiki-grounding` vs `knowledge-grounding`)
4. Remaining docs with Documentos/GaabDevWeb
5. Accidental publish of `memory/` or prune snapshots
6. Choosing GaabType as branch with duplicated core (anti-pattern)

## Appendix H — Required refactors (later; not now)

| Item | Class |
|------|-------|
| Brand string rename | CONFIG_EXTRACTION |
| wiki-mem default off in public hooks | PROFILE_EXTRACTION |
| AGENT.md + README rewrite | docs |
| LICENSE et al. | publication |
| profiles/gaabtype overlay files | PROFILE_EXTRACTION |
| Sanitize audit docs paths for public mirror | CLEAN_SPLIT |
| EvolveLoop | none (frozen) |
| KnowledgeBackend | none (seamed) |

---

**Files in this directory constitute the blueprint. Product code untouched.**
