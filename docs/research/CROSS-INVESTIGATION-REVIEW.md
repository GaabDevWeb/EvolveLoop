# CROSS-INVESTIGATION-REVIEW

**Date:** 2026-09-18  
**Role:** Lead CROSS-INVESTIGATION REVIEW (não é investigação de alvo novo)  
**Inputs:** 21 dossiês `research/targets/{local,external}/*/`, `OUR-SYSTEM-BASELINE.md`, `findings/_aggregate_decisions.json`, skill `analysis-framework.md`  
**Corpus:** **não modificado**  
**Escopo:** higiene epistémica e conflitos entre investigadores — **sem rankings**, **sem implementação**

### Legenda de proveniência

| Classe | Alvos |
|--------|--------|
| **LOCAL_CORPUS** | `agency-agents`, `brag`, `mattpocock-skills`, `security-audit-skill`, `superpowers` |
| **OFFICIAL_EXTERNAL** | `aider`, `anthropic-agent-skills`, `claude-code`, `cline`, `codex`, `crewai`, `cursor`, `langgraph`, `llamaindex`, `mcp`, `microsoft-agent-framework`, `openai-agents-sdk`, `openhands`, `pydanticai`, `roo-code`, `swe-agent` |

### Meta-nota sobre contagens

- `MECHANISMS.yaml` (parseável): **~340** mecanismos com `decision` primária.
- `_aggregate_decisions.json`: **1211** decisões totais — **INFERRED:** inflação por decisões secundárias, tabelas de REPORT, e dual-tags (`ALREADY_PRESENT` + `ADAPT` no mesmo mecanismo). **Não** tratar o aggregate como “uma decisão = um mecanismo”.

---

## 1. Contradições entre investigadores

Conflitos **entre dossiês** (não só self-critique interno). Cada item: o que A diz vs B, e o risco para o Lead.

### 1.1 Handoff / delegação — “já temos” vs “falta contrato”

| Posição | Alvos / IDs | Claim |
|---------|-------------|--------|
| **ALREADY_PRESENT** (controle multi-agente ≈ PDA/Task) | `cursor/CUR-SUBAGENT`, `openhands/M09`, `cline/M11`, `claude-code/CC-SUBAGENT`, `codex/M12_multi_agent`, `openai-agents-sdk/M04-agents-as-tools` (parcial) | Subagents / delegação já cobertos pelo MegaBrain |
| **ADAPT** (falta *contrato* de handoff) | `roo-code/RC-ORCHESTRATOR` (Boomerang summary handoff), `openai-agents-sdk/M05-handoffs`, `llamaindex/LI-HANDOFF`, `microsoft-agent-framework/MAF-DEL`, `crewai/M05_hierarchical_manager`+`M08_delegation_tools` (PROTOTYPE) | Precisamos de ACL / histórico / ownership transfer |

**Contradicção:** vários investigadores fecham multi-agente como `ALREADY_PRESENT`, enquanto outros tratam handoff como gap de **semântica de controlo** (manager-retains vs peer-transfer vs summary-only).  
**Leitura cruzada (INFERRED):** não há conflito factual nos alvos — há **colisão de lente**. PDA Task ≠ Boomerang summary ≠ `transfer_to_*` ≠ Crew hierarchical tools. Lead deve exigir **três subtipos** antes de qualquer Principle Level-3.

### 1.2 Plan / Act — equivalência inconsistente

| Decisão | Alvos |
|---------|--------|
| `ALREADY_PRESENT` | `cursor/CUR-PLAN`, `openhands/M08`, `swe-agent/M17_prompt_planning`, `aider/AIDER-ARCHITECT-EDITOR` |
| `ADAPT` / `DEFER` | `langgraph/LG-GRAPH-EXEC` (ADAPT), `crewai/M07_crew_planner` (DEFER — prompt-append), `cline/M04` Plan/Act (ADAPT no REPORT; não “já igual”) |

**Contradicção:** “planning” no MegaBrain é Task IR / PDA; nos alvos é (a) UI mode read-only, (b) prompt procedural, (c) Pregel/FSM, (d) LLM planner que **append** a `task.description` (`crewai` — OBSERVED no adversarial).  
Tratar todos como o mesmo padrão = **falso**.

### 1.3 Sandbox / permissions — PROTOTYPE vs ADAPT vs DEFER

| Postura | Alvos / IDs |
|---------|-------------|
| **PROTOTYPE** (OS-enforceable / sandbox agent) | `codex/M02_os_sandbox`, `codex/M04_permission_profiles`, `claude-code/CC-SANDBOX`, `openai-agents-sdk/M12-sandbox`, `swe-agent/M03_swe_rex_env` |
| **ADAPT** (padrão operacional) | `openhands/M01`+`M04`, `roo-code/RC-HITL-AUTOAPPROVE` (HITL ≠ OS sandbox) |
| **DEFER / UNKNOWN** | `security-audit-skill/M09` (`os_sandbox_or_needs_validation`), baseline MegaBrain Sandbox **UNKNOWN–PARTIAL** |

**Contradicção:** `openhands` adversarial alerta que `ALREADY_PRESENT` de plan/delegate assenta em baseline **não re-auditada**; ao mesmo tempo promove ADAPT forte de sandbox. `codex` adversarial: App seatbelt ≠ CLI — risco de generalização falsa.  
**Lead:** sandbox é o tema com maior dispersão decisória; **não** consolidar Principle até auditar CursorSKILLS sandbox real.

### 1.4 Checkpoint / persistence — ADAPT agressivo vs DEFER cauteloso

| Decisão | Alvos |
|---------|--------|
| **ADAPT** | `langgraph/LG-CHECKPOINT`+`LG-INTERRUPT-HITL`, `crewai/M16_persist_checkpoint`, `openhands/M14`, `claude-code/CC-SESSION` |
| **DEFER** | `cursor/CUR-CKPT`, `cline/M08` shadow-git, `langgraph/LG-REPLAY-FORK`, `pydanticai/PAI-DURABLE` |
| **PROTOTYPE** | `openai-agents-sdk/M07-sessions`+`M09-hitl-runstate`, `microsoft-agent-framework/MAF-CKPT`, `llamaindex/LI-MEMORY` |

**Contradicção:** LangGraph e OpenHands empurram ADAPT de durabilidade; Cursor/Cline empurram DEFER no mesmo espaço conceptual (“rollback de ficheiros” / shadow-git). Problemas diferentes (ver §6).

### 1.5 Skills progressive disclosure — ALREADY_PRESENT vs ADAPT

| Decisão | Alvos |
|---------|--------|
| **ALREADY_PRESENT / EQUIVALENT** | `anthropic-agent-skills/AAS-01`+`AAS-05`, `claude-code/CC-SKILLS`, `cursor/CUR-SKILLS`, `crewai/M14_agent_skills`, `mattpocock-skills/M-SKILL-PACKAGE-BASE`, `openhands/M10`, `cline/M15` |
| **ADAPT** (harness / bootstrap / authoring) | `superpowers/M-BOOTSTRAP`+`M-PROG-DISCLOSURE`+`M-MANDATORY-INVOKE`, `codex/M10` (comment progressive), `anthropic-agent-skills` progressive **harness** tier, `brag/M-BRAG-04` |

**Contradicção suave:** formato de package = já presente; **activação obrigatória / bootstrap** = gap (`superpowers`). Investigadores que só olharam formato fecham ALREADY_PRESENT; quem olhou SessionStart fecha ADAPT. Ambos podem ser verdadeiros — **desde que o Principle separe package vs harness**.

### 1.6 MCP — único bloco ADOPT vs REJECT reimplementação

- `mcp`: **ADOPT** em `M-TRANSPORT` / host-level items (via Cursor Host) — os **únicos ADOPT** primários nos YAMLs parseados.
- Mesmo dossiê + `crewai/M15`, `cursor/CUR-MCP`, `codex/M11_mcp_host`: **ALREADY_PRESENT** semântico / host.
- Adversarial `mcp`: risco de ALREADY_PRESENT demais se executor `mcp` no orchestrator for aspiracional (U-03).

**Contradicção operacional:** ADOPT “via host” ≠ ADOPT protocolo no MegaBrain core. Leitores do aggregate (`ADOPT: 32`) podem sobrestimar vontade de adoptar — a maioria dos ADOPT do JSON **não** aparece como `decision: ADOPT` limpo nos YAMLs (só 3 no inventory machine-readable).

### 1.7 Memory / Knowledge — REJECT stack vs ADAPT retrieval-as-tool

- `llamaindex/LI-RAG-CORE` **REJECT**; `LI-RAG-TOOL` **ADAPT**.
- `crewai/M11_knowledge_rag` **REJECT**; `M10_unified_memory` **DEFER**.
- `claude-code/CC-AUTOMEM` **DEFER**; adversarial explicitamente: auto-memory ≠ Evidence Bus.
- `aider/AIDER-REPOMAP` **ADAPT** (mapa estrutural — **não** é RAG clássico).

Investigadores alinhados em rejeitar “importar RAG framework”, mas divergem no que conta como Knowledge MegaBrain (wiki/RAG gate vs repo-map vs memory bank).

### 1.8 Multi-agent product shells — REJECT vs DEFER

- **REJECT** como runtime/dependency: `crewai/M03_crew_container`, `microsoft-agent-framework` Agent SDK host, `pydanticai` Agent runtime, `agency-agents` roster bulk, `openhands` Canvas-as-core (REJECT no adversarial).
- **DEFER** magentic / hub-spoke / teams: `cline/M02`+`M12`, `microsoft-agent-framework/AG-MAGENTIC-ONE`, `llamaindex/LI-ORCH-PATTERNS`.

Consistente na direcção (não engolir frameworks), mas **inconsistente na urgência** de padrões de terminação/stall (`MAF-TERM` ADAPT vs vários DEFER).

### 1.9 Superpowers YAML hygiene (meta)

`local/superpowers/MECHANISMS.yaml` continha `)` solto ~L366 — parse quebrado até sanitização. **OBSERVED** no ficheiro; risco de tooling de aggregate ignorar/ silently skip mecanismos. Lead: re-validar inventário SP após fix de YAML (fix fora deste review se pedido).

---

## 2. Colisões de terminologia

Mesma palavra, significados **não intercambiáveis**. Usar sempre o par *(alvo · sentido)*.

### 2.1 Agent

| Sentido | Onde aparece | ≠ MegaBrain |
|---------|--------------|-------------|
| Unidade SDK (`Agent[Deps, Output]`, Runner loop) | `pydanticai`, `openai-agents-sdk` | Agent decide + Capability faz (baseline) |
| Persona Markdown / system prompt | `agency-agents`, Modes em `roo-code` | Skill + PDA role, não processo |
| Harness de coding IDE | `cursor`, `claude-code`, `cline`, `aider` | Produto host ≠ nosso Agent System |
| “Agent” WhatsApp / bots (baseline exclui) | fora destes 21, mas baseline avisa | Não misturar |
| Equipa / Crew / Magentic team | `crewai`, `microsoft-agent-framework` | Multi-agent PDA Task roles |

### 2.2 Skill

| Sentido | Onde | Nota |
|---------|------|------|
| Pacote `SKILL.md` + dirs (Agent Skills standard) | `anthropic-agent-skills`, `cursor`, `claude-code`, `mattpocock-skills`, `superpowers`, `brag` | Closest ao MegaBrain `.cursor/skills` |
| Progressive disclosure **no harness** (metadata → body → refs) | AAS, SP, Codex | Package ≠ loader |
| CrewAI “Skills” disclosure no agent | `crewai/M14` | Equivalence claim EQUIVALENT — **cuidado** |
| MCP Prompts (não são Skills) | `mcp` REPORT | Explicitamente separados |

### 2.3 Tool

| Sentido | Onde | ≠ |
|---------|------|---|
| Function/schema tools no SDK | PAI, OpenAI Agents, LlamaIndex | Capability Registry |
| Built-in IDE tools (shell, apply_patch, browser) | Cursor, Cline, Codex, Claude Code | Surface do **host** |
| MCP Tools (wire) | `mcp/M-TOOLS-SCHEMA` | Semantic ALREADY_PRESENT ≠ wire |
| Delegation tools (`AgentTools`) | `crewai` hierarchical | “Tool” que chama outro agent |
| Tool **groups** / ACL packs | `roo-code/RC-TOOL-GROUPS` | Mode permissions |

### 2.4 Memory

| Sentido | Onde | ≠ baseline Memory |
|---------|------|-------------------|
| Episodic / session continuity | MegaBrain gaabwiki-mem; `LI-MEMORY`; CC-AUTOMEM | Baseline: PARTIAL continuity, **not** working memory |
| Unified LLM-analyzed memory store | `crewai/M10` | DEFER — pollution risk |
| Checkpoint / thread state | `langgraph/LG-CHECKPOINT` | Persistence, não “memória” |
| File memory / harness todos | `MAF-HARNESS` | Product harness |
| “Memory Bank” (docs/community) | `cline` adversarial A9 | **Não** core runtime |

### 2.5 Workflow

| Sentido | Onde |
|---------|------|
| Event-driven `@step` / typed Events | `llamaindex` Workflow |
| Pregel super-step StateGraph | `langgraph` |
| Flow DSL ∘ Crew | `crewai` |
| Prompt pipeline (brainstorm→plan→impl) | `superpowers` M-WORKFLOW-PIPE |
| Coding loop explore→edit→test | `claude-code` CC-WORKFLOW (INFERRED) |
| Capability IR `plan.ir.yaml` | MegaBrain Task Graph |

**Colisão crítica:** “adopt Workflow” sem qualificar = misturar 5 arquitecturas.

### 2.6 Handoff

| Sentido | Onde | Controlo |
|---------|------|----------|
| Peer control transfer (`transfer_to_*`) | `openai-agents-sdk/M05` | Ownership muda |
| Agents-as-tools | `openai-agents-sdk/M04`, MAF agent-as-tool | Manager retém |
| Boomerang summary return | `roo-code/RC-ORCHESTRATOR` | Contexto **resumido** — risco Evidence fidelity |
| ACL `can_handoff_to` | `llamaindex/LI-HANDOFF` | Policy-shaped |
| NEXUS prose templates | `agency-agents/M-AA-06` | Docs only |
| Hierarchical manager + AgentTools | `crewai/M05`+`M08` | Não é scheduler verdadeiro (OBSERVED adversarial) |

---

## 3. Achados duplicados (mesmo mecanismo reescrito)

Candidatos a **um** Pattern Level-3 (framework § Cross-system) — não N recomendações isoladas:

| Tema recorrente | IDs representativos (amostra) | Nota |
|-----------------|------------------------------|------|
| Progressive skill packages | AAS-01/05, CC-SKILLS, CUR-SKILLS, SP-PROG-DISCLOSURE, M14 crewai, M10 openhands, mattpocock base | Package já presente; residual = harness |
| Subagent / Task delegation | CUR-SUBAGENT, CC-SUBAGENT, M11 cline, M09 openhands, M12 codex, SP-SDD-CONTROLLER | Já PDA; residual packaging |
| MCP host/client | CUR-MCP, CC-MCP, M11 codex, M15 crewai, RC-MCP, mcp/* | Um Principle “consume via Host” |
| Guardrails / approval / HITL | M03 cline, M03/M04 codex, M06 oai, M09 crewai, RC-HITL, LG-INTERRUPT, PAI ModelRetry | Mistura policy LLM vs OS vs UX |
| Checkpoint / resume | LG-CHECKPOINT, M16 crewai, M14 openhands, MAF-CKPT, M07 oai | Separar file-ckpt vs thread-ckpt vs job resume |
| OTel / tracing | PAI-OTEL, crewai M13, LI-INSTR, oai tracing | ADAPT taxonomia spans — um theme |
| Plan-then-act split | CUR-PLAN, cline M04, openhands M08, aider architect | Ver §1.2 / §6 |
| Repo/context map ≠ full dump | AIDER-REPOMAP, (parcial) Roo index DEFER | Não fundir com RAG LlamaIndex |
| Evidence / verify-before-done | SP-VERIFY-GATE, security-audit M03–M05, Evidence Bus baseline | LOCAL forte + baseline |
| Reject second orchestrator/registry | Quase todos os OFFICIAL SDK + agency-agents | Aggregate `reject_embed` lista 9 alvos — sinal saudável |

**Duplicate inflation risk:** theme_presence no aggregate marca `skills_progressive`, `handoff`, `evidence`, `telemetry`, `plan_act` em **21/21** reports — isso é **cobertura de lente**, não 21 mecanismos distintos. Lead: descontar presença temática = força de evidência.

---

## 4. Evidência fraca / DOCUMENTED tratado como OBSERVED

### 4.1 Definição operacional usada pelos investigadores (inconsistente)

| Uso de `OBSERVED` | Alvos | Risco |
|-------------------|-------|-------|
| Source/file read, **sem** execução | `aider` (adversarial: “OBSERVED=source read, not runtime”), `swe-agent`, LOCAL corpora | OK se declarado; perigoso se lido como runtime |
| Docs oficiais como arquitectura | `claude-code` (prefer DOCUMENTED; packages não inspeccionados), `microsoft-agent-framework` (quase só DOCUMENTED), `anthropic-agent-skills` | Alto DOCUMENTED_ONLY |
| Snippets GitHub raw = OBSERVED | `llamaindex`, `openai-agents-sdk` (parcial) | Aceitável; tip `main` pode ≠ release |
| Sessão Cursor tools = produto | `cursor` adversarial Attack 8 | OBSERVED sessão ≠ contract product |

### 4.2 Casos concretos de downgrade recomendado

| Alvo | Mecanismo / claim | Label actual | Reclassificar para Lead |
|------|-------------------|--------------|-------------------------|
| `microsoft-agent-framework` | Quase todo o inventário | DOCUMENTED dominante | Tratar decisões ADAPT como **DOCUMENTED_ONLY** até source pin |
| `claude-code` | Loop, permissions, sandbox | DOCUMENTED (+ INFERRED workflow) | Não promover a OBSERVED runtime |
| `anthropic-agent-skills` | Compaction protection, activate-tool guidance | DOCUMENTED client-guide | **Não** = Claude production OBSERVED |
| `codex` | M05/M12 multi-agent | OBSERVED “thin” (adversarial) | Cap confidence ≤ MEDIUM |
| `openhands` | StuckDetector defaults, Docker isolation | DOCUMENTED_AND_OBSERVED source | ≠ MEASURED; `run_executed: false` |
| `roo-code` | Comportamento Modes/Boomerang | Mistura | Sem run da extension → DOCUMENTED para comportamento |
| `pydanticai` | Arquitectura | DOCUMENTED; adversarial “Overclaim OBSERVED” | Manter DOCUMENTED |
| `crewai` | Flow scheduling depth | Parcial OBSERVED Crew; Flow UNKNOWN | Não elevar M06 ADAPT a “verified scheduler” |
| `superpowers` | RELEASE-NOTES “2× / 50% tokens” | MEASURED claim no vendor | DOCUMENTED vendor measure — **não** re-medido |
| `security-audit-skill` | Sandbox/write-isolation procedures | DOCUMENTED procedures | Implementation ABSENT — DEFER correcto |
| `agency-agents` | Install/convert | Structural OBSERVED | Scripts **não executados** |

### 4.3 Aggregate vs reality

`_aggregate_decisions.json` não carrega labels epistémicos. **Qualquer** consolidação que conte só decisões sem filtrar DOCUMENTED_ONLY está enviesada.

---

## 5. Riscos de extrapolação

1. **Baseline como prova de código MegaBrain** — Vários `ALREADY_PRESENT` citam `OUR-SYSTEM-BASELINE.md` COMPOSITE statuses sem audit fresco de `orchestrator/` (`openhands`, `aider` U-16, `mcp` U-03, `superpowers` UNKNOWN #12). Status baseline ≠ prova OBSERVED nesta onda.  
2. **App ≠ CLI ≠ SDK** — `codex` (App seatbelt vs CLI); `claude-code` product vs Agent SDK; `openhands` V0 CodeAct vs V1 Canvas (adversarial dual-generation HIGH).  
3. **Paper ACI → default tool bundle** — `swe-agent`: paper MEASURED ≠ bundle 1.1 actual (adversarial LOW confidence transfer).  
4. **Stars / badges → mérito** — Mitigado em adversarial, mas aggregate ainda lista presença temática; Lead deve ignorar popularidade (já flagado openhands/cline/crewai).  
5. **Host Cursor = MegaBrain** — `cursor` identity_warning explícito; residual: CUR-RULES/SKILLS ALREADY_PRESENT lido como “nós construímos o Cursor”.  
6. **ADOPT via host MCP** — Extrapolação para “MegaBrain deve implementar transports” contradiz REJECT de reimplementação no mesmo dossiê.  
7. **Prompt Iron Laws = Policy Engine** — `superpowers` adversarial #1; LOCAL skills com gates em prosa ≠ enforcement.  
8. **Nested decision inflation** — Extrair “32 ADOPT” do JSON sem ler YAMLs sobrestima adopção.  
9. **Version drift** — Tip `main` / docs live sem pin (`llamaindex`, `crewai` SHA, `microsoft-agent-framework` U-VER).  
10. **INFERRED coding workflows** apresentados junto de tabelas de decisão — `claude-code` workflow INFERRED; não misturar com OBSERVED tools.

---

## 6. Falsos padrões (features parecidas, problemas diferentes)

| Aparência | Problema A | Problema B | Não fundir |
|-----------|------------|------------|------------|
| “Plan mode” | UI read-only tools (`cline` M04, `cursor` CUR-PLAN) | Prompt checklist sem enforcement (`swe-agent` M17) | vs Task IR compilado |
| “Checkpoint” | File edit rollback (`cursor` CUR-CKPT) | Thread durable graph state (`langgraph` LG-CHECKPOINT) | vs git / shadow-git (`cline` M08) |
| “Memory” | Chat buffer serializável (`LI-MEMORY`) | LLM-curated long-term store (`crewai` M10) | vs Evidence artifacts |
| “Handoff” | Summary return Boomerang (`roo`) | Full ownership transfer (`oai` M05 / MAF-DEL) | vs agents-as-tools |
| “Skills” | Instruction packages | Mandatory bootstrap injection (`SP` M-BOOTSTRAP) | vs MCP prompts |
| “Sandbox” | Docker workspace (`openhands`) | OS seatbelt (`codex`) | vs `.rooignore` / approval UX (não OS) |
| “RAG / index” | Classic index→retrieve (`LI-RAG-CORE` REJECT) | Token-budgeted repo map (`AIDER-REPOMAP`) | vs semantic codebase index DEFER (`roo`) |
| “Multi-agent” | PDA/Task roles | Hub-spoke IDE runtime (`cline` M02 DEFER) | vs persona roster (`agency-agents`) |
| “Guardrail” | Schema/ModelRetry (`pydanticai`) | Task output retry (`crewai` M09) | vs OS permission profiles |
| “Orchestrator” | MegaBrain runtime | Roo empty-tools Orchestrator mode | vs Crew Flow event DSL |
| “Workflow” | LangGraph Pregel | LlamaIndex Events | vs Superpowers skill pipeline |
| “Eval” | SWE-bench MEASURED harness | Demo gallery (`brag`) | vs skill evals JSON MegaBrain |

---

## 7. Padrões em falta (recorrentes mas sub-anotados)

Sinais que aparecem em ≥3–4 dossiês / adversarial, mas **ainda não** estão consolidados como Pattern explícito cross-target:

1. **Separação ortogonal approval × sandbox × tool ACL** — Mais claro em `codex` (M03⊥M02); eco parcial em Claude permissions, Roo HITL matrix, OpenHands confirmation. Poucos dossiês nomeiam a ortogonalidade como Principle.  
2. **Budget reservation before critic/validation waves** — Forte em `security-audit-skill` (M13); eco em guardrail max_iter / max_turns — pouco cruzado com Evidence Bus.  
3. **Termination / stall / stuck detectors** — `openhands` M05 PROTOTYPE, `MAF-TERM`, OAI `max_turns`; tratado como features isoladas.  
4. **Dual-stack orchestration debt** — Crew+Flow (`crewai`), AutoGen→MAF lineage, OpenHands V0/V1, LlamaIndex DAG→Workflow: anti-padrão “two runtimes” sub-nomeado no aggregate.  
5. **Context poisoning via fat parent context** — Roo Boomerang rationale DOCUMENTED; Cline compaction PROTOTYPE; AAS protect-compaction DEFER — falta pattern “isolation vs summary fidelity”.  
6. **Provider capability profiles** — `pydanticai` PAI-MODEL ADAPT; Aider model/edit formats; Cursor per-model harness DEFER — sub-conectado ao Provider Registry baseline.  
7. **Deterministic validators beside LLM judges** — `security-audit-skill` schema validators OBSERVED; PAI typed outputs; OAI structured final — natural Level-3 com Evidence Bus, ainda fragmentado.  
8. **SessionStart / bootstrap for dead skills** — Dominado por `superpowers`; só eco fraco noutros (hooks Claude/Codex ADAPT) — deveria ser candidate Pattern harness-wide.  
9. **Anti-duplication success** — 9 alvos em `reject_embed`; pouco celebrado como finding positivo metodológico (vale registar para não reabrir “e se adoptássemos CrewAI?”).

---

## 8. Falsas equivalências com MegaBrain

Casos em que `ALREADY_PRESENT` / `EQUIVALENT` / `SUBSTANTIAL` **sobrecarregam** a lente canónica  
`Agent decide · Capability faz · Provider implementa · Policy autoriza · Runtime orquestra · Evidence prova · Knowledge grounds · Telemetry observa · Evals medem`.

| Claim de equivalência | Alvo / ID | Porquê é falsa ou frágil |
|-----------------------|-----------|---------------------------|
| Cursor Rules/Skills ≡ MegaBrain | `cursor/CUR-RULES`, `CUR-SKILLS` | Host product vs nosso conteúdo; adversarial Attack 2 |
| Plan Mode ≡ Task IR | `cursor/CUR-PLAN`, `openhands/M08` | UI/workflow ≠ Capability IR |
| Subagents ≡ PDA SDD controller | `CC-SUBAGENT`, `SP-SDD-CONTROLLER` residual | Isolamento de contexto ≠ dual-verdict ledger file-based |
| MCP Tools ≡ Capability Registry | `mcp/M-TOOLS-SCHEMA` | Semantic overlap; wire/host consent distintos (adversarial mcp §2) |
| Architect/editor ≡ PDA plan/exec | `aider/AIDER-ARCHITECT-EDITOR` | Pairing de modelos ≠ contratos PDA |
| Crew Task ≡ Task IR | `crewai/M02_task_unit` | Unidade de prompt/crew ≠ IR validado |
| LlamaIndex AgentWorkflow ≡ Orchestrator | `LI-AGENT-WF` | Event/agent SDK ≠ nosso runtime |
| Middleware MAF ≡ Policy Engine | `MAF-MW` | Interceptores de chat/tool ≠ policy autoriza |
| Auto memory / unified memory ≡ Evidence Bus | CC-AUTOMEM, crewai M10 | Continuity/pollution ≠ evidence gates |
| CLAUDE.md hierarchy ≡ Policy | `CC-CLAUDEMD` (ADAPT residual) | Instruções ≠ autorização |
| Progressive skills EQUIVALENT | `cline/M15`, `crewai/M14`, `CUR-SKILLS` | Formato sim; enforcement/bootstrap não |
| Blocklist ≡ Policy Engine | `swe-agent/M14` | Deny-list de comandos ≠ policy engine |
| Repo map gap = Knowledge ABSENT | `aider` ADAPT + U-16 | Wiki/RAG PARTIAL ≠ ausência de code-map; não inventar ABSENT sem audit |
| Persona Reality Checker ≡ Evidence | `agency-agents/M-AA-11` | Ethos ALREADY_PRESENT; enforcement é nosso |
| Tool loop Cursor ≡ nosso Tools | `CUR-TOOLS` eq=`NONE` no YAML — inconsistente com ALREADY_PRESENT noutros tool loops | Bom sinal de honestidade; não uniformizar |

**Regra Lead (reestado do framework):** se equivalência não for `EQUIVALENT` com residual vazio → **não** fechar Principle como “já temos”; usar `ALREADY_PRESENT` + residual ou `ADAPT`.

---

## 9. Scorecard de higiene epistémica (por alvo)

Critérios breves (PASS / PASS* / FAIL): labels epistémicos; UNKNOWN honestos; anti-ranking; anti-implementação; adversarial presente; distinção DOCUMENTED/OBSERVED; comparação baseline sem inventar MegaBrain.

`PASS*` = utilizável com caveats materiais (docs-heavy, closed product, dual-stack, ou ALREADY_PRESENT frágil).

| Target | Classe | Score | Nota curta |
|--------|--------|-------|------------|
| `local/agency-agents` | LOCAL | **PASS** | Identidade “não runtime” bem defendida; scripts não executados |
| `local/brag` | LOCAL | **PASS** | AUXILIARY disciplinado; demo≠eval |
| `local/mattpocock-skills` | LOCAL | **PASS*** | Forte OBSERVED corpus; risco over-ADAPT / doc-as-runtime (adversarial) |
| `local/security-audit-skill` | LOCAL | **PASS** | DOCUMENTED procedures vs ABSENT harness claro; validators≠efficacy |
| `local/superpowers` | LOCAL | **PASS*** | Rico OBSERVED; Iron Laws/prompt gates; YAML syntax glitch; vendor MEASURED |
| `external/aider` | OFFICIAL | **PASS** | Source-read OBSERVED explícito; U-16 baseline gap |
| `external/anthropic-agent-skills` | OFFICIAL | **PASS*** | DOCUMENTED-heavy; client-guide ≠ production |
| `external/claude-code` | OFFICIAL | **PASS*** | Prefer DOCUMENTED; closed/SDK pin gaps |
| `external/cline` | OFFICIAL | **PASS*** | Tool-name CONFLICT documentado; hub-spoke DEFER saudável |
| `external/codex` | OFFICIAL | **PASS*** | Closed boundary ok; multi-agent OBSERVED thin; App≠CLI |
| `external/crewai` | OFFICIAL | **PASS*** | Crew forte; Flow depth UNKNOWN; hierarchical misread mitigated |
| `external/cursor` | OFFICIAL | **PASS*** | Identity separation boa; closed internals; session≠contract |
| `external/langgraph` | OFFICIAL | **PASS*** | Docs/API; durability MegaBrain claim INFERRED |
| `external/llamaindex` | OFFICIAL | **PASS*** | OBSERVED selectivo; tip `main` risk |
| `external/mcp` | OFFICIAL | **PASS*** | Melhor split semantic/wire; U-03 executor depth |
| `external/microsoft-agent-framework` | OFFICIAL | **PASS*** | CONDITIONAL PASS próprio; docs-as-runtime risk HIGH |
| `external/openai-agents-sdk` | OFFICIAL | **PASS** | Handoff vs as_tool claro; anti-duplicação sólida |
| `external/openhands` | OFFICIAL | **PASS*** | Dual V0/V1 HIGH risk; no run; sandbox ADAPT forte |
| `external/pydanticai` | OFFICIAL | **PASS*** | REJECT runtime claro; OBSERVED almost none |
| `external/roo-code` | OFFICIAL | **PASS*** | Docs vs source; precisa recurrence antes de Principle |
| `external/swe-agent` | OFFICIAL | **PASS*** | Loop/env OBSERVED; paper→bundle transfer frágil |

**Nenhum FAIL absoluto** na metodolologia de fecho (todos têm ADVERSARIAL + UNKNOWNS + decisões no vocab).  
**Nenhum PASS limpo OFFICIAL closed/docs-only** — esperável.

---

## 10. Implicações para a próxima onda (só higiene — sem implementação)

1. **Normalizar subtipos** antes de Pattern mining: Handoff×3, Checkpoint×3, Skill package vs harness, Sandbox×OS vs UX.  
2. **Re-auditar baseline** (`orchestrator` sandbox, MCP executor, code-map, hooks bootstrap) — desbloqueia dezenas de ALREADY_PRESENT frágeis.  
3. **Filtrar aggregate** por `evidence` / DOCUMENTED_ONLY antes de contar ADOPT/ADAPT.  
4. **Não promover** a AGENT_ARCHITECTURE_PRINCIPLES.md temas só presentes como DOCUMENTED_ONLY num único alvo closed.  
5. **Corrigir** `superpowers/MECHANISMS.yaml` dangling `)` se o pipeline de aggregate voltar a correr.

---

## 11. Handoff ao Lead

| Campo | Conteúdo |
|-------|----------|
| Artefacto | Este ficheiro |
| Corpus targets | Intactos |
| Decisões de implementação | Nenhuma |
| Maior risco sistémico | Colapsar handoff/plan/sandbox/memory numa única recomendação ADAPT |
| Maior sinal positivo | Consenso REJECT de second orchestrator/RAG-framework/persona-roster-as-runtime |
| Epistemic | Claims deste review = **OBSERVED** nos dossiês citados; interpretações de conflito = **INFERRED** e marcadas |

Wiki: n/a (meta-review de investigação; sem edição de código de projecto mapeado Gaab).
