# ADVERSARIAL-REVIEW — Claude Code / Claude Agent SDK

**Reviewer role:** self-critique before handoff  
**Date:** 2026-09-18  
**Verdict:** PASS WITH GAPS (documentados) — adequado a TARGET_RESEARCH OFFICIAL_EXTERNAL

## Attacks attempted against this report

### 1. “Inventar o loop interno / routing”

- **Temptation:** Descrever filas, scoring, ou pesos de modelo.
- **Defense:** Marcado UNKNOWN (U-01, U-02, U-03). Loop descrito só ao nível DOCUMENTED (messages/turns/tools).
- **Status:** Resistido.

### 2. “Popular = melhor coding agent”

- **Temptation:** Usar adopção Anthropic como mérito arquitectural.
- **Defense:** Secção Adoption separada; decisões só por mecanismo vs baseline.
- **Status:** Resistido. Sem rankings/notas.

### 3. “Copiar Claude Code para o MegaBrain”

- **Temptation:** ADOPT o harness inteiro / segundo orchestrator.
- **Defense:** ALREADY_PRESENT no loop/tools/skills/policy onde equivalente; REJECT implícito a registry paralelo; handoff sem implementação.
- **Status:** Resistido.

### 4. “CLAUDE.md = Policy Engine”

- **Temptation:** Tratar instruções markdown como enforcement.
- **Defense:** Docs oficiais separam context vs permissions/hooks; decisão ADAPT reforça separação, não substitui Policy.
- **Status:** Resistido.

### 5. “Auto memory = Evidence Bus”

- **Temptation:** Mapear 1:1 memórias LLM-written a Evidence.
- **Defense:** DEFER; contratos diferentes (soft notes vs gates JSON).
- **Status:** Resistido.

### 6. “Sandbox MegaBrain já existe / não existe”

- **Temptation:** Preencher baseline UNKNOWN.
- **Defense:** Equivalence UNKNOWN; decision PROTOTYPE/DEFER; U-14 aberto.
- **Status:** Resistido.

### 7. “Misturar Agent Skills standard com Claude Code extensions”

- **Temptation:** Atribuir todo o standard a este target.
- **Defense:** Notado que Claude extends the open standard; handoff ao target `anthropic-agent-skills`.
- **Status:** Parcial — OK para este report; não substitui investigação do standard.

### 8. “Evidence OBSERVED sem código”

- **Temptation:** Rotular claims de docs como OBSERVED.
- **Defense:** Prefer DOCUMENTED; OBSERVED só se tivéssemos binário/código. Packages não inspeccionados.
- **Status:** Resistido.

## Weaknesses remaining

| Weakness | Severity | Mitigation |
|----------|----------|------------|
| Sem pin de versão CLI/SDK | MEDIUM | Re-run com `claude --version` + package versions se necessário |
| Agent teams / background agents shallow | LOW–MEDIUM | Follow-up TARGET_RESEARCH se Lead priorizar |
| Compaction/numeric thresholds unknown | MEDIUM | Aceitável; experiment PROTOTYPE mediria |
| Our-side Policy/sandbox depth not re-audited | MEDIUM | Gap analysis wave precisa audit CursorSKILLS |
| Alguns ficheiros docs muito longos — amostragem | LOW | Claims chave cruzados em ≥2 páginas oficiais |

## Checklist skill (fecho)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives ou UNKNOWN
- [x] Epistemic labels em claims relevantes
- [x] Comparação OUR_CURRENT_MECHANISM
- [x] Sem implementação Agent System
- [x] Sem ranking
- [x] Fechados → UNKNOWN
- [x] Artefactos: REPORT.md, MECHANISMS.yaml, UNKNOWNS.md, ADVERSARIAL-REVIEW.md

## Summary for Lead

Claude Code/SDK é um **harness documentado** (loop + tools + skills + CLAUDE.md + subagents + hooks + permissions + sandbox + MCP + sessions). Para MegaBrain: **não substituir** o runtime; **ADAPT** hooks→policy, isolation de subagents, caps, compaction; **PROTOTYPE** lazy tools e sandbox; **DEFER** auto-memory como SSOT. Confiança alta em superfície DOCUMENTED; baixa em internals fechados.
