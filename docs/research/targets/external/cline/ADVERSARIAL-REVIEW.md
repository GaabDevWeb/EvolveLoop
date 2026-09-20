# ADVERSARIAL-REVIEW — Cline TARGET_RESEARCH

Date: 2026-09-18  
Role: self-critique before handoff to Lead  
Skill constraints: no ranking, no inventing internals, no implementation, evidence > marketing

## Attacks against this investigation

### A1 — “Cline is popular (68k stars) so we should copy its architecture”

**Rebuttal:** Stars are MEASURED distribution signal only. Decisions are per-mechanism vs MegaBrain baseline. Hub-spoke (M02), Enterprise remote config (M16), and built-in browser (M10) are DEFER/REJECT despite popularity.

### A2 — “Every action requires approval — adopt that as our safety model”

**Rebuttal:** CONFLICT with Auto Approve, YOLO, and SDK default auto-approve when policy omitted. Absolute claim is marketing-grade, not an invariant. Real mechanism is *configurable* toolPolicies + host approval capability.

### A3 — “Just add an Agent Registry / second orchestrator like ClineCore”

**Rebuttal:** MegaBrain already has Capability/Provider registries + orchestrator. M01 → ALREADY_PRESENT. Proposing parallel registry would violate anti-duplication rule.

### A4 — “Plan/Act is unique — we lack planning”

**Rebuttal:** PDA roles already cover plan/exec/gate/explore. Gap is *hard tool whitelist by mode*, not absence of planning. Decision is ADAPT, not ADOPT product clone.

### A5 — Invented hub auth / spoke scheduling details

**Check:** Hub token in discovery record, constant-time compare, Sec-WebSocket-Protocol — cited from ARCHITECTURE.md (OBSERVED doc in repo). Spoke assignment described at DOCUMENTED level; fine-grained scheduler internals not claimed beyond docs → remaining detail in UNKNOWNS if needed.

### A6 — “Browser tool is in the SDK default tools”

**Rebuttal:** DefaultToolNames OBSERVED without browser; BrowserSession lives under `apps/vscode`. Report separates IDE browser vs `fetch_web_content`.

### A7 — Tool names cited inconsistently

**Mitigation:** MECHANISMS.yaml lists OBSERVED DefaultToolNames; REPORT §8 and UNKNOWNS document CONFLICT with docs aliases. Prefer code for SDK claims.

### A8 — Over-claiming compaction as proven superior

**Mitigation:** Decision is PROTOTYPE, not ADOPT. CHANGELOG shows past false-negative trigger (character estimate) — evidence of cost/failure, not magic.

### A9 — Treating Memory Bank as core runtime

**Mitigation:** Listed under best-practices in docs index; marked UNKNOWN (U08), not a mechanism decision.

### A10 — Scope creep into implementing retries/compaction in orchestrator

**Mitigation:** Explicit handoff only; skill forbids Agent System mutation. ADAPT/PROTOTYPE require agent-authoring + experiments later.

## Evidence quality scorecard (qualitative)

| Area | Strength | Weakness |
|------|----------|----------|
| Package layering / loop | HIGH (ARCHITECTURE + agent-runtime.ts) | Não executámos testes |
| Approval/permissions | HIGH docs + policy code path | requires_approval classifier UNKNOWN |
| Plan/Act | HIGH product docs | Wiring code U07 |
| MCP | HIGH docs + extensions/mcp tree | OAuth edge cases unread |
| Browser | MEDIUM OBSERVED class | Full tool schema U02 |
| Compaction | MEDIUM architecture + changelog | Strategy internals U04 |
| MegaBrain comparison | MEDIUM via baseline file | Policy depth GAP audit |

## Checklist skill (fecho)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives respondidos ou UNKNOWN
- [x] Epistemic labels em claims relevantes
- [x] Comparação OUR_CURRENT_MECHANISM feita
- [x] Sem implementação automática
- [x] Sem ranking / sem segunda abstração se ALREADY_PRESENT
- [x] Artefactos: REPORT.md, MECHANISMS.yaml, UNKNOWNS.md, ADVERSARIAL-REVIEW.md

## Residual risk for Lead

1. Monorepo em migração (README: VS Code extension WIP migrating) — findings podem envelhecer depressa; pin SHA `8f09781…`.
2. Docs tool-name drift pode induzir investigadores irmãos em erro se lerem só docs.
3. PROTOTYPE M06/M07 precisam de experiments medíveis antes de qualquer ADAPT no MegaBrain.

## Verdict

Investigação **completa ao nível TARGET_RESEARCH** com limitações explícitas. Não há base para ADOPT wholesale. Padrões mais transferíveis: **Plan-role mutating-tool lock (ADAPT)**, **provider retry/overflow recovery (ADAPT)**, **progressive skills + compaction (PROTOTYPE)**.
