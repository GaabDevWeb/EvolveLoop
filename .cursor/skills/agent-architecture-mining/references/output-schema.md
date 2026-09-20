# Output schema — Levels 1–4 e paths

## Paths

| Artefacto | Path sugerido |
|-----------|---------------|
| Target report | `docs/architecture-mining/targets/<slug>/REPORT.md` |
| Finding | `docs/architecture-mining/findings/<id>.md` |
| Anti-pattern | `docs/architecture-mining/anti-patterns/<id>.md` |
| Cross-system pattern | `docs/architecture-mining/patterns/<id>.md` |
| Gap analysis | `docs/architecture-mining/gaps/<id>.md` |
| Hypothesis | `docs/architecture-mining/hypotheses/<id>.md` |
| Experiment | `docs/architecture-mining/experiments/<id>.md` |
| Principles (SSOT) | `docs/AGENT_ARCHITECTURE_PRINCIPLES.md` |

Usar templates em `templates/`. Não criar registry paralelo — pastas docs apenas.

## Level 1 — Target Report

Sistema completo: mapa, mecanismos, fluxos, popularidade (separada), gaps vs nós, decisões por mecanismo.

## Level 2 — Finding

Um mecanismo isolado (campos do template `finding.md`).

## Level 3 — Cross-System Pattern

```text
PATTERN
Observed in: A, B, C
Differences:
Common mechanism:
Why it appears repeatedly:
Evidence:
Applicability:
```

## Level 4 — Architecture Gap

Bloco EXTERNAL_MECHANISM … DECISION (ver analysis-framework.md).

## Validação de artefacto

- [ ] Labels epistémicos presentes  
- [ ] Fontes citadas em claims chave  
- [ ] `UNKNOWN` onde falta prova  
- [ ] Decisão ∈ conjunto permitido  
- [ ] Sem proposta de segunda abstração se `ALREADY_PRESENT`  
- [ ] Sem implementação / sem ranking  
