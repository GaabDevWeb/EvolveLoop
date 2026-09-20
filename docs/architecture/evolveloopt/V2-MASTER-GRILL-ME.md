# V2 Master Grill-Me — Design Stress-Test

**Feature ID:** `evolveloop-v2-master-finalization`  
**Branch:** `evolve-v2`  
**Started:** 2026-09-20T19:35:16Z  
**Skill:** `grill-me` v2.0.0 (`global-skills/grill-me/SKILL.md`)  
**Gate status:** `satisfied` (Round 1 ACK 2026-09-20T19:38Z)  
**Evidence:** `memory/evolveloop-v2-master-finalization/evidence/gate.grill-me.json`  
**Implementation status:** **UNBLOCKED** for audit → plan → implement per ACK (no new material decisions without re-gate)

---

## Process note (procedural honesty)

1. **SE-08 was implemented without the prior adapter-ecosystem approval gate** that had requested `READY_FOR_APPROVAL`. That history is preserved (ADR-CURSOR, `CursorReasoningProvider`, tests). This grill-me must reconcile SE-08 as transitional `ReasoningProvider` facade, not as final AgentBackend architecture.
2. Adapter Ecosystem Audit (2026-09-20) concluded **`ReasoningProvider` is insufficient** for full coding agents and proposed `AgentBackend` + Model C — **proposal only; not implemented**.
3. This master task asks for full implementation + benchmarks + live runs. Grill-me must challenge scope realism vs honesty constraints (no fake live success).

---

## Facts gathered (agent — not decisions)

| Fact | Evidence |
|------|----------|
| Branch | `evolve-v2` |
| ReasoningProviders present | Test, Ollama, Cursor (`orchestrator/src/agent/providers/`) |
| `AgentBackend` types/registry | **Absent** in src — only docs proposal |
| Adapter audits | `docs/architecture/evolveloopt/adapters/*` exist |
| AGENT.md | Install-oriented; **not** yet backend-agnostic statement |
| Sandbox EvolveLoop | NOT_IMPLEMENTED (re-audits) |
| Live Cursor | BLOCKED/NOT_MEASURED without reliable auth proof |
| Deterministic SE-07 | Claimed proven in re-audit docs |
| V2 tests last known | 699/699 (session); re-audit cited 685/685 earlier |

---

## Round 0 — Product intent (agent framing)

**Product pretended:** EvolveLoop = local-first orchestration architecture that turns intent into bounded engineering execution with Policy/Runtime authority, pluggable **agent backends**, and honest measurement of what is proven vs not.

**Not the product:** Cursor wrapper; fully autonomous AGI engineer; production deployer; self-modifying core (A06).

---

## Challenges raised (pre-Round-1)

| # | Challenge | Tension |
|---|-----------|---------|
| C1 | Master task demands Codex/Claude/Antigravity adapters + live + 10 benchmarks in one pass | Risk of cosmetic adapters / fake PASS |
| C2 | SE-08 Cursor as ReasoningProvider vs AgentBackend proposal | Dual facade vs rewrite |
| C3 | Model A/B/C tools | A03 claims vs vendor native tools |
| C4 | “Implement all adapters” vs “no cosmetic adapters” | Antigravity may be CLI-only for Node |
| C5 | Long-horizon Tier 4 (25+ tasks) | May be NOT_MEASURED without days of compute |
| C6 | Delivery artifact vs “not production ready” | Boundary clarity |
| C7 | Grill-me HITL vs “execute everything” | Must wait for shared understanding |

---

## Round 1 — Frontier decisions (WAIT FOR HUMAN)

Format per skill: question + recommended answer. **Do not implement until answers received.**

---

❓ **Q1** - **Definition of “V2 engineering final” for THIS milestone**

O master task pede consolidação total + adapters + benchmarks live + validator handoff. Qual é o critério mínimo aceitável se live credentials falharem e Antigravity/Codex CLI estiverem ausentes?

➡️ **Recommended:** Declarar V2 **Engineering Complete (deterministic + contracts)** como DONE; live backends = PASS/BLOCKED/NOT_MEASURED honestos; adapters sem runtime instalado = contract + mock contract tests + BLOCKED live — **não** fake PASS. Long-horizon Tier 3–4 = LIMITED/NOT_MEASURED se tempo/recursos insuficientes.

---

❓ **Q2** - **AgentBackend vs ReasoningProvider**

Adotar a proposta do audit (`ReasoningProvider` cognitivo + `AgentBackend` agent runtime), ou forçar um único seam?

➡️ **Recommended:** **Dois seams.** Cursor: facade dual (reasoning_only via ReasoningProvider; AgentBackend para capabilities/lifecycle). Ollama: só ReasoningProvider. Sem `extends`.

---

❓ **Q3** - **Tool authority model (default)**

Model A (vendor owns tools), B (EvolveLoop owns), ou C (hybrid)?

➡️ **Recommended:** **Model C.** Default profile = `reasoning_only` (B cognitivo). `agent_runtime` só com capability declaration + deny-by-default + A03 claims = LIMITED no path vendor. Nunca A03 PASS se side-effects vendor não passam Runtime.

---

❓ **Q4** - **SE-08 reconciliation**

Reescrever Cursor agora como AgentBackend, ou manter SE-08 ReasoningProvider e adicionar AgentBackend layer incremental?

➡️ **Recommended:** **Incremental.** Manter SE-08 behavior default; introduzir `AgentBackend` contract + registry; Cursor implementa AgentBackend com mode `reasoning_only` delegando ao provider existente; sem big-bang rewrite.

---

❓ **Q5** - **Secondary adapter priority this milestone**

Implementar Codex e Claude Code ambos com deps reais, ou um completo + outro stub contract?

➡️ **Recommended:** **Contrato + registry + contract tests para ambos**; implementação SDK real **se** pacote instalável e auth path fail-closed. Se CLI/SDK ausente no ambiente: adapter code + `health()=UNAVAILABLE` + live BLOCKED — **sem** instalar deps sem confirmação se conflito com package policy. Preferir **Codex TS SDK** e **Claude Agent SDK** como SECONDARY; Antigravity = CLI adapter EXPERIMENTAL ou BLOCKED_BY_INTERFACE se `agy` ausente.

---

❓ **Q6** - **Dependency installs**

O master task implica `@openai/codex-sdk`, `@anthropic-ai/claude-agent-sdk`, etc. Autoriza installs no `orchestrator/package.json` nesta branch?

➡️ **Recommended:** **Sim, sob `evolve-v2` only**, optional peer/optionalDependencies onde possível; fail-closed se missing. Sem push.

---

❓ **Q7** - **Benchmark suite scope**

Benchmarks A–J + long-horizon Tiers 1–4 todos nesta execução?

➡️ **Recommended:** **A–J deterministic fixtures obrigatórios** (real workspace files). Live A/B subset quando auth existir. Long-horizon: Tier 1–2 obrigatório deterministic; Tier 3–4 = NOT_MEASURED ou LIMITED com harness only.

---

❓ **Q8** - **Auto-fallback cross-backend**

Permitir Cursor→Codex automático se Cursor down?

➡️ **Recommended:** **Proibir** nesta finalização. Selection = config explícita. Fallback = UNSAFE (portability audit).

---

❓ **Q9** - **EvolveLoop Sandbox**

Implementar sandbox mínimo agora, ou deixar NOT_IMPLEMENTED documentado?

➡️ **Recommended:** **NOT_IMPLEMENTED** permanece; documentar requisitos futuros. Não rebrandear vendor sandbox. Path restriction ≠ sandbox (já invariante).

---

❓ **Q10** - **Self-evolution / A06**

Qualquer promoção automática de melhorias de core?

➡️ **Recommended:** **Proibido.** Ceiling = PROPOSE/signals only. Sem observe→modify-own-source→deploy.

---

❓ **Q11** - **Claims language in final report**

Pode-se dizer “V2 COMPLETE” no sense engineering, sabendo live gaps?

➡️ **Recommended:** Quatro dimensões separadas (Core / Deterministic Engineering / Live Backend / Self-Evolution). Nunca um score único. “Engineering Complete” ≠ “Production Ready” ≠ “Live Proven”.

---

❓ **Q12** - **Shared understanding confirmation**

Confirma que, após responder Q1–Q11, posso gravar `gate.grill-me.json` como `satisfied` e só então planear/implementar conforme respostas?

➡️ **Recommended:** **Sim** — responda Q1–Q11 (aceitar recommendations com “ACK” ou overrides). Sem confirmação = gate permanece `blocked`.

---

## Round 1 status

| Field | Value |
|-------|-------|
| Frontier emptied? | **No** — waiting on human |
| `user_confirmed_shared_understanding` | **false** |
| `readiness_for_planning` | **false** |
| Code/test changes this gate | **0** |

---

## Premises tentatively held (pending ACK)

- Backend-agnostic core; Cursor = primary/reference, not architectural ceiling.
- Agent ≠ Runtime ≠ Policy ≠ Evidence.
- Deterministic proof ≠ LLM quality.
- No fake live / mock-as-live.
- main untouched; only `evolve-v2`.

## Premises tentatively rejected (pending ACK)

- ReasoningProvider alone as universal agent seam.
- Model A as default for A03 claims.
- Automatic cross-backend fallback.
- Cosmetic Tier-3 adapters.
- Self-evolution in this milestone.
- Vendor sandbox = EvolveLoop sandbox.

---

## Round 1 answers (human ACK — no overrides)

Accepted exactly as recommended Q1–Q12. See evidence JSON `user_acks`.

---

## GRILL_ME_RESULT (satisfied)

```yaml
GRILL_ME_RESULT:
  problem_understood: true
  requirements_challenged: true
  ambiguities_found:
    - "DONE criteria when live backends unavailable — RESOLVED Q1"
    - "SE-08 vs AgentBackend — RESOLVED Q4 incremental"
    - "dependency install — RESOLVED Q6 allow on evolve-v2"
    - "benchmark depth — RESOLVED Q7"
  assumptions_exposed:
    - "Master completeness vs honesty — resolved by four dimensions"
  risks_identified:
    - "Cosmetic adapters — mitigated by UNAVAILABLE/BLOCKED policy"
    - "A03 inflation — mitigated by Model C + LIMITED agentic"
  open_questions: []
  accepted_scope:
    - "AgentBackend + ReasoningProvider dual seams"
    - "Model C tools; reasoning_only default"
    - "Incremental SE-08"
    - "A–J deterministic benchmarks"
    - "SDK deps on evolve-v2"
    - "Codex/Claude contract tests; live only if real"
  rejected_scope:
    - "Auto-fallback Cursor→Codex"
    - "EvolveLoop sandbox implementation this milestone"
    - "A06 operational self-evolution"
    - "Fake live / mock-as-live"
    - "Single V2 score"
  readiness_for_planning: true
  user_confirmed_shared_understanding: true
```

---

## Next step

Audit → ADR AgentBackend → implement types/registry/adapters → benchmarks A–J → docs/handoff → vitest.
