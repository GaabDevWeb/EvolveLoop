# Inventário CursorSKILLS

Gerado para clonar e usar noutro PC. Pacote **lean** (sem workspaces/evals pesados).

## Skills pipeline (`.cursor/skills/`)

| Skill | Comando | Tipo |
|-------|---------|------|
| orquestrar | `/evolve` | raiz |
| wiki | `/wiki` | grounding vault+RAG |
| wiki-mem | `/mem` | memória episódica |
| prd | `/prd` | upstream |
| adr | `/adr` | upstream |
| planner | `/planejar` | worker |
| backend | `/backend` | worker |
| frontend-pro | `/frontend-pro` | worker+gate |
| database | `/database` | worker |
| testing | `/testes` | gate |
| security | `/seguranca` | gate |
| devops | `/devops` | worker |
| po-review | `/validar` | gate |
| documentation | `/documentar` | gate |
| skill-authoring | `/skill-authoring` | meta |

## Skills Tier 3 (`global-skills/`)

agent-browser, brainstorming, executing-plans, find-skills, finishing-a-development-branch, frontend-design, grill-me, image-to-code, subagent-driven-development, systematic-debugging, technical-library-dossier, ui-ux-pro-max, writing-plans

<!-- 2026-09-19 prune: removed linkedin-posts, gsap, framer-motion, lenis, hover-effects, particles, r3f-shaders from pack -->

## Agents (`Agents/`)

Orquestrador-v2.md, Prd.md, Planner.md, backend.md, Security.md, Po-review.md, DocumentationAgent.md, Skill-authoring.md

## Commands (`.cursor/commands/`)

EvolveLoop, wiki, mem, prd, adr, planejar, database, devops, frontend-pro, testes, seguranca, validar, skill-authoring, library-dossier (+ gerados no install: backend, documentar)

## Rules

- `Rules/Rules.md` → `~/.cursor/rules/evolveloop.mdc`
- `Rules/wiki-agent.mdc` → `~/.cursor/rules/wiki-agent.mdc`

## MCPs (`mcp/mcp.json`)

context7, playwright, browsermcp, puppeteer, github, sequential-thinking, filesystem, docker, firecrawl, memory, sentry, linear, railway (+ plugin Figma)

## Agent Setup

`agent-setup/` — instalador Python (`minimal` / `standard` / `full`).

## Orchestrator

`orchestrator/` — TypeScript capability engine (instalar com `npm install` localmente)
