# Portability Forensic Audit — MegaBrain / CursorSKILLS

**Status:** `PORTABILITY_AUDIT_COMPLETE`  
**Date:** 2026-09-20  
**Mode:** diagnostic only — no renames, moves, refactors, branches, or `AGENT.md`  
**Policy:** `risk_tier=audit` · `topology=swarm-explore` · `gaabwiki_grounding=applied`  
**Vault note:** scout OK on meta-wiki; CursorSKILLS pack search = `no_hits` (GAP)

---

## 1. Executive Summary

O MegaBrain **já possui um núcleo arquitectónico genérico e publicável** (Capability IR, Execution Engine, Policy Engine, Evidence Bus, Provider/Capability model, EvolveLoop, PDA roles, hard gates `grill-me` / `image-to-code`, skills de worker/gate).

Em paralelo, o **loop normativo de grounding** está **fortemente acoplado** ao ambiente pessoal do autor:

1. **Paths absolutos** `/home/gaab/...` em runtime (`knowledge.ts`, `ground.sh`, `mem.py`, rules).
2. **Duas defaults de vault divergentes** (`Documentos/karpathyWiki` vs `Documentos/gitHub/karpathyWiki`) — ambas existem no host; o runtime activo usa a variante `gitHub`.
3. **Marca e CLI `GaabWiki` / `gaabwiki`** como HARD-GATE do orquestrador, não só como adapter opcional.
4. **Corpus e motor RAG fora do repo** (`karpathyWiki`), indispensáveis para cumprir o gate actual.
5. **Hooks episódicos** `gaabwiki-mem` always-on no Cursor global.

**Veredicto:** o produto **não** está `READY_AS_IS` para publicação sem ressalvas. A fronteira conceptual correcta é:

- **`main`** = arquitectura genérica + adapters portáteis + defaults sem username/vault pessoal  
- **`GaabType`** (nome proposto; **não existe no repo**) = `main` + profile GaabWiki + paths + packs de projectos + hooks `/wiki` `/mem`

Contratos `knowledge.*` e `context-grounding` **provam** abstracção de Knowledge; a implementação e a policy **ainda** amarram essa abstracção ao GaabWiki.

---

## 2. Scope

| Incluído | Excluído nesta fase |
|----------|---------------------|
| Inventário repo + `~/.cursor` / `~/.agents` (leitura) | Qualquer rename/move/refactor |
| Paths, identity, knowledge, agents, skills, commands, rules, hooks, providers, configs, ambiente | Criar branch `GaabType` / `AGENT.md` |
| Matrizes + grafo personal→core | Generalizar nomes (`GaabWiki`→`Wiki`) |
| Proposta conceptual main vs GaabType | Tornar o projecto publicável |

**Métricas (aprox., excl. `node_modules` / `.prune-snapshots` / `dist` onde aplicável):**

```yaml
audit:
  files_scanned: 1488
  directories_scanned: 424
  commands_scanned: 31
  agents_scanned: 23
  skills_scanned: 36   # 23 local + 13 global
  providers_scanned: 10  # TS modules under providers/
  configs_scanned: 25
  contracts_scanned: 40
  personal_references: 180   # files mentioning GaabWiki/gaabwiki
  personal_paths: 142        # files with /home/gaab/ (follow-up scan excl. nm/dist/prune; ~637 hits)
  personal_path_hits: 637
  dual_vault_inodes_distinct: true  # follow-up confirmed — not the same directory
  agent_setup_agents_root_default_missing_on_disk: true
  personal_components: 12    # skills/commands/rules/hooks/adapters chave
  core_components: 18
  external_dependencies: 15  # MCP + optional tools
  host_dependencies: 8
  unknown_items: 6
```

Artefactos espelho: `*.yaml` neste directório.

---

## 3. Repository Inventory

### 3.1 Top-level

| Path | Classificação | Portátil? | Notas |
|------|---------------|-----------|-------|
| `orchestrator/` | CORE_ARCHITECTURE | sim (parcial knowledge) | Runtime TS; 0 deps runtime npm |
| `.cursor/skills/` | CORE + PERSONAL | parcial | Pipeline + `gaabwiki*` |
| `.cursor/commands/` | PERSONAL_WORKFLOW + CORE | parcial | Superfície PT + wiki/mem |
| `.cursor/hooks*` | PERSONAL_WORKFLOW | parcial | Pickup genérico + mem pessoal |
| `.cursor/rules/megabrain.mdc` | CORE | sim | Disciplina genérica |
| `Rules/gaabwiki-agent.mdc` | PERSONAL_PATH | não | alwaysApply global no install |
| `Agents/` | CORE / PERSONAL agents | parcial | Espelhos |
| `global-skills/` | OPTIONAL / CORE gates | sim | Pós-prune 13 skills |
| `agent-setup/` | PERSONAL_CONFIGURATION | parcial | Profiles = seam útil |
| `scripts/install-agents-global.sh` | CORE | sim | Usa `REPO_ROOT` dinâmico |
| `mcp/` | EXTERNAL_DEPENDENCY | parcial | Templates; secrets fora |
| `memory/` | DEVELOPMENT_ARTIFACT | não | Evidence de features |
| `docs/` | DEVELOPMENT_ARTIFACT | sim | Audits/research |
| `*-workspace/`, `.prune-snapshots/` | DEVELOPMENT_ARTIFACT | não | Eval/backup |

### 3.2 Orchestrator modules (core)

`engine`, `scheduler`, `ir`, `jobs`, `evidence`, `policies`/`policy`, `discovery`, `registry`, `contracts`, `evolveloop`, `telemetry`, `memory` (run store), `knowledge` (in-memory store), `providers/deterministic` (exceto default path em `knowledge.ts`).

Inventário detalhado: `PORTABILITY-INVENTORY.yaml`.

---

## 4. Personal Identity Findings

| Identifier | Classification | Risk | Notes |
|------------|----------------|------|-------|
| `GaabWiki` / `gaabwiki` | PERSONAL_IDENTITY (+ uso arquitectural) | HIGH | Dual: marca pessoal **e** hard-gate |
| `gaabwiki-mem` | PERSONAL_IDENTITY | MEDIUM | Episódico |
| `/home/gaab` username | PERSONAL_IDENTITY | CRITICAL | Em defaults de runtime |
| `GaabDevWeb` | PERSONAL_IDENTITY | LOW | Org GitHub no README |
| `karpathyWiki` | PERSONAL_IDENTITY | HIGH | Nome do vault |
| KernelBot / OrbitBot / … | PERSONAL_IDENTITY | MEDIUM | Pack routing |
| `MegaBrain` / `CursorSKILLS` | PROJECT_IDENTITY | LOW | Marca de produto — **não** nome pessoal |
| `orquestrar` | ARCHITECTURAL_NAME | LOW | Alias `MegaBrain` já existe |
| `GaabType` | UNKNOWN | INFO | **Não ocorre no código** — só proposta deste audit |
| Gabriel / Roese / DeCarli | UNKNOWN | INFO | Sem matches no scan scoped |

Detalhe: `IDENTITY-REFERENCE-MAP.yaml`.

---

## 5. Personal Paths Findings

### 5.1 Runtime-critical (CRITICAL)

```text
orchestrator/src/providers/deterministic/knowledge.ts
  DEFAULT_RAG_ROOT = "/home/gaab/Documentos/gitHub/karpathyWiki"

.cursor/skills/gaabwiki/scripts/ground.sh
  ROOT="${RAG_REPO_ROOT:-/home/gaab/Documentos/gitHub/karpathyWiki}"

.cursor/hooks/gaabwiki-mem/mem.py
  VAULT default = "/home/gaab/Documentos/karpathyWiki"   # DIVERGENTE
```

`RAG_REPO_ROOT` é seam existente (`EXISTING_SEAM`), mas o **fallback absoluto** anula a portabilidade.

### 5.2 Always-on rules (HIGH)

`Rules/gaabwiki-agent.mdc` e mirror `agent-setup/...` fixam vault em `/home/gaab/Documentos/karpathyWiki` (legado) e projectos pessoais.

### 5.3 Locale assumption (HIGH)

`agent-setup` usa `$HOME/Documentos/karpathyWiki` — assume pasta **Documentos** (PT), não `Documents`.

### 5.4 Docs / manifests (MEDIUM–INFO)

Rebuild YAMLs, reconciliation, research e workspaces citam `/home/gaab/Downloads/CursorSKILLS`, `reverseEnginering`, `AGENTS/Cursor` histórico.

Mapa: `PATH-REFERENCE-MAP.yaml`.

---

## 6. Knowledge/Wiki Findings

### Pergunta central

> O MegaBrain depende conceitualmente de uma Wiki chamada GaabWiki, ou de uma abstração Knowledge/Wiki com implementação pessoal?

### Resposta (evidência)

| Camada | Dependência |
|--------|-------------|
| Contratos `knowledge.*`, `context-grounding`, `KnowledgeStore` | **Abstracção genérica** |
| Provider deterministic + skill `gaabwiki` + CLI `python -m gaabwiki` | **Implementação pessoal** |
| HARD-GATE `gaabwiki-grounding` + ADR-0004 “RAG = GaabWiki” | **Policy/decisão amarra o core ao pessoal** |

Sem GaabWiki (ou substituto que implemente o mesmo contrato), o **loop MegaBrain normativo actual** não fecha. O `KnowledgeStore` TS (substring) **não** substitui o vault RAG.

Seams: `EXISTING_SEAM` (capability vs provider, env); `WEAK_SEAM` (default path); `MISSING_SEAM` (interface KnowledgeBackend tipada); `ACCIDENTAL_COUPLING` (nome do gate).

Mapa: `KNOWLEDGE-PERSONALIZATION-MAP.yaml`.

---

## 7. Personal Workflow Findings

| Item | Class | Notes |
|------|-------|-------|
| Sequência MegaBrain fases 0–6 | CORE_WORKFLOW | Genérico |
| Hard-gate wiki antes de plan | CORE_WORKFLOW concept / PERSONAL binding | Conceito core; GaabWiki = profile |
| Comandos PT (`/planejar`, `/testes`, …) | PERSONAL_PREFERENCE / PROFILE | Locale |
| `/wiki`, `/mem` | PERSONAL_WORKFLOW | |
| Packs KernelBot/OrbitBot… | PERSONAL_PREFERENCE | |
| Hooks episódicos always-on | PERSONAL_WORKFLOW | |
| `megabrain.mdc` disciplina | CORE_WORKFLOW | |

---

## 8. Agent Findings

- **CORE_ORCHESTRATION:** Orquestrador / MegaBrain (acoplamento textual ao GaabWiki).
- **PERSONAL_AGENT:** `gaabwiki`, `gaabwiki-mem`.
- **GENERIC_AGENT:** workers e gates (planner, backend, testing, security, po-review, …).

Matriz: `AGENT-PORTABILITY-MATRIX.yaml`.

---

## 9. Skill Findings

Reutiliza audits em `docs/architecture/skills/audit/` e `pruning/`.

| Classe | Exemplos |
|--------|----------|
| PUBLIC_CORE | orquestrar*, prd, planner, workers, gates, grill-me, image-to-code, systematic-debugging |
| PERSONAL | gaabwiki, gaabwiki-mem (+ host `ip-as-logo`) |
| PUBLIC_OPTIONAL / SPECIALIZED | tier3 restantes, meta-skills |
| EXTERNAL / HOST | wiki-carpaccio (host-only) |

\*orquestrar = core com **binding** pessoal no texto do gate.

Hard gates **preservados** (não alterar): `grill-me`, `image-to-code`.

---

## 10. Command Findings

| Class | Commands |
|-------|----------|
| PUBLIC_CORE | MegaBrain, prd, planejar, backend, frontend-pro, database, testes, seguranca, validar, documentar, debugger, grill-me |
| PERSONAL_WORKFLOW | wiki, mem |
| PUBLIC_OPTIONAL | adr, architect, research/pesquisar, skill-authoring, library-dossier, … |

---

## 11. Rule/Hook Findings

| Artefacto | Classificação |
|-----------|---------------|
| `.cursor/rules/megabrain.mdc` | generic rule / runtime-critical discipline |
| `Rules/gaabwiki-agent.mdc` | personal + environment-specific (paths, project map) |
| `.cursor/hooks.json` orchestrator pickup / after-engine | project/runtime-critical, mostly generic |
| `.cursor/hooks/gaabwiki-mem/**` | personal + machine path defaults |

Install copia hooks para `~/.cursor` — **user-global** mirror do project-local.

---

## 12. Provider/Capability Findings

| Capability | Provider | Interface portátil? | Específico? |
|------------|----------|---------------------|-------------|
| filesystem.* / shell / git.* / system.* / project.inspect | deterministic | sim | local workspace |
| knowledge.search / inspect | deterministic → `python -m gaabwiki` | contrato sim | path+CLI pessoais |
| context-grounding | cursor-skill `gaabwiki` | contrato sim | skill pessoal |
| knowledge-promote | gaabwiki-mem | contrato sim | vault pessoal |
| mock-provider | mock | sim | testes |

**Não confundir:** capability genérica ≠ provider pessoal.

---

## 13. Configuration Findings

- `agents.env`: host-specific `AGENTS_ROOT` — mecanismo OK.
- `mcp.env.example`: placeholders; **não** abrir secrets reais no relatório (`SECRET_DETECTED` se existirem em `~/.cursor/mcp.env`).
- `agent-setup/profiles.yaml`: **seam forte** (`minimal`/`standard`/`full`) — mas `minimal` já inclui `gaabwiki`.
- Environment rebuild YAMLs: paths absolutos do autor.

---

## 14. Environment Findings

| Dependência | Class |
|-------------|-------|
| Cursor + Linux + Git + bash | REQUIRED |
| Node 20+ | RECOMMENDED (orchestrator) |
| Python + pacote gaabwiki + vault | PERSONAL (para grounding actual) |
| Ollama | OPTIONAL (degraded BM25) |
| Docker / MCP SaaS | OPTIONAL |
| systemd gaabwiki units | PERSONAL |
| Pasta `Documentos` | PERSONAL / HOST_SPECIFIC locale |

---

## 15. Architecture Core Findings

Preservar em `main` pública (conceito): Agent/PDA model, Capability+Contract, Provider seam, Policy Engine, Execution Engine, Evidence Bus, Knowledge **abstraction**, Telemetry, Evals, EvolveLoop, Task IR, Hard gates (excepto binding GaabWiki), Skill system, Observation/Outcome/Scope.

Detalhe: `CORE-ARCHITECTURE.yaml`.

---

## 16. Existing Adapter Seams

| Seam | Kind |
|------|------|
| Capability contract vs provider plugin | EXISTING_SEAM |
| `RAG_REPO_ROOT` / `VAULT_ROOT` env | EXISTING_SEAM |
| `REPO_ROOT` no installer | EXISTING_SEAM |
| agent-setup profiles minimal/standard/full | EXISTING_SEAM |
| KnowledgeStore vs RAG subprocess | EXISTING_SEAM (fraco) |
| Absolute `/home/gaab` defaults | WEAK_SEAM / ACCIDENTAL_COUPLING |
| HARD-GATE named `gaabwiki-grounding` | ACCIDENTAL_COUPLING |
| Tipagem `KnowledgeBackend` pluggable | MISSING_SEAM |
| Locale pack (PT commands) | MISSING_SEAM |

---

## 17. Personal → Core Dependency Graph

Ver `CORE-VS-PERSONAL-GRAPH.yaml` e `PERSONAL-CONNECTIONS.yaml`.

Arestas CRITICAL/HIGH: GaabWiki→Knowledge gate; `/home/gaab`→defaults; CLI gaabwiki→provider; hooks→session; ADR-0004→arquitectura.

---

## 18. Portability Matrix

| Component | Core | Personal | External | Portable | Coupling |
| --------- | ---: | -------: | -------: | -------: | -------: |
| Orchestrator engine/IR/scheduler | ✓ | | | ✓ | low |
| EvolveLoop | ✓ | | | ✓ | low |
| Evidence Bus | ✓ | | | ✓ | low |
| Policy Engine / PDA | ✓ | | | ✓ | low |
| Capability contracts | ✓ | | | ✓ | low |
| KnowledgeStore (TS) | ✓ | | | ✓ | low |
| knowledge.* provider impl | ✓* | ✓ | | partial | high |
| context-grounding contract | ✓ | | | ✓ | med |
| GaabWiki skill/CLI/vault | | ✓ | | ✗ | high |
| `/home/gaab/...` defaults | | ✓ | | ✗ | high |
| grill-me / image-to-code | ✓ | | | ✓ | low |
| MCP stack | | | ✓ | partial | med |
| install-agents-global.sh | ✓ | | | ✓ | low |
| gaabwiki-mem hooks | | ✓ | | ✗ | high |
| memory/* sessions | | ✓ | | ✗ | low |
| Docs research reverseEnginering | | ✓ | | ✗ | low |

\*interface core; binding pessoal na implementação.

---

## 19. Main vs GaabType Boundary

```text
MAIN = generic architecture
     + generic defaults (no username paths)
     + portable adapters
     + public skill/command pack
     + optional null/mock knowledge provider

GAABTYPE = MAIN
         + GaabWiki profile (skill, CLI, vault)
         + personal defaults/paths
         + personal project pack map
         + /wiki /mem + gaabwiki-mem hooks
         + gaabwiki-agent rule
```

**Nenhuma branch criada.** Proposta: `MAIN-VS-GAABTYPE-PROPOSAL.yaml`.

---

## 20. Publication Risks

Ver `PUBLICATION-RISK-REGISTER.yaml`.

Top: defaults `/home/gaab` (CRITICAL), dual vault path (CRITICAL), hard-gate GaabWiki (HIGH), corpus externo (HIGH), rename prematuro (HIGH process risk).

---

## 21. Recommended Next Phase

Ordem sugerida (**ainda só planeamento; não executar aqui**):

1. Unificar defaults de vault → **somente env** (sem absolute username).
2. Extrair `KnowledgeBackend` / profile pack sem rename de marca.
3. Reclassificar HARD-GATE normativo como `knowledge-grounding` **conceitualmente** (docs/policy), mantendo adapter GaabWiki no profile.
4. Mover `gaabwiki*`, hooks, pack maps, rule para profile `GaabType`.
5. Limpar artefactos `memory/`, snapshots, paths de research do núcleo público.
6. **Só depois** considerar renames de marca (`GaabWiki` → nome genérico).

**Proibido antes dos seams:** mass-rename, mover dirs, criar `AGENT.md`, fingir que está publicável.

---

## Checklist

```text
[x] repository inventory completed
[x] personal identity mapped
[x] personal paths mapped
[x] personal directories mapped
[x] personal knowledge mapped
[x] personal workflows mapped
[x] personal agents mapped
[x] personal skills mapped
[x] commands mapped
[x] rules mapped
[x] hooks mapped
[x] providers mapped
[x] capabilities mapped
[x] environment assumptions mapped
[x] external dependencies mapped
[x] core architecture mapped
[x] adapter seams mapped
[x] personal→core graph generated
[x] portability matrix generated
[x] main vs GaabType boundary proposed
[x] no product code modified (only docs/architecture/portability/* created)
[x] no names renamed
[x] no directories moved
[x] no skills changed
[x] no AGENT.md created
```

---

## Final conclusion (short)

1. **~60–70%** do runtime/arquitectura documentada já é genérico (engine, IR, evidence, evolveloop, workers/gates, installer pattern).  
2. **~30–40%** da experiência MegaBrain “completa” (grounding, mem, rules, defaults, packs) é pessoal.  
3. Acoplamentos fortes: path `/home/gaab`, dual vault, HARD-GATE GaabWiki, CLI `python -m gaabwiki`, hooks.  
4. Limite `main` vs `GaabType`: arquitectura+adapters vs profile vault/wiki/hooks/packs.  
5. Virar profile/adapter/config: gaabwiki*, paths, pack map, hooks, rule alwaysApply.  
6. Permanecer iguais: engine core, contracts genéricos, grill-me/image-to-code, megabrain.mdc, workers/gates.  
7. Antes de qualquer rename: eliminar defaults absolutos e extrair seams — rename agora seria CRITICAL breakage.

**Estado:** `PORTABILITY_AUDIT_COMPLETE`
