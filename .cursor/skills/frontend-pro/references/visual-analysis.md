# Análise visual pós-screenshot

Subset para **Review/Audit** — não substitui workflow **Vision** (`image-to-code`).

## Ordem de análise

1. **P1 Accessibility** — contraste, focus visível, hierarquia headings, labels
2. **P2 Touch** — alvos pequenos, hover-only, feedback de loading
3. **P5 Layout** — scroll horizontal, overflow, hierarquia em 375px
4. **P6 Typography** — escala, line-height, gray-on-gray
5. **P7 Motion** — animação excessiva (estático no screenshot; nota se suspeita)
6. **P8 Forms** — placeholders como label, erros distantes
7. **Anti-slop** — parece template IA? signature genérica?

## Por screenshot, extrair

| Campo | Conteúdo |
|-------|----------|
| Hierarquia | O que o olho vê primeiro, segundo, terceiro |
| Densidade | Ar vs cluttered |
| Alinhamento | Grid consistente ou "quase" |
| Contraste | Áreas de risco (texto fino, overlays) |
| Responsivo | O que quebra vs desktop (comparar viewports) |

## Ligar a search.py

Para cada tema recurrente:

```bash
python3 .cursor/skills/frontend-pro/scripts/search.py "contrast focus mobile" --domain ux -n 3
```

## Saída

Cada achado no relatório:

- `ID` (R-01, R-02…)
- `Prioridade` P1–P10
- `Regra` (nome da guideline)
- `Evidência` (path screenshot + região se óbvio)
- `Severidade` Blocker | Major | Minor | Nit
- `Fix` acionável em 1–2 frases
