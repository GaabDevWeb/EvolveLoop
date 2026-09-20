# Modos — fluxos detalhados

## Build

```
Boot → search.py --design-system [--persist] → anti-slop plan → domain/stack searches → implementar
```

**Entregáveis:** código; opcional `design-plan.md` com tokens, wire ASCII, signature element.

**Checklist pré-entrega:**

- [ ] P1–P3 do Quick Reference
- [ ] Stack guidelines aplicadas
- [ ] Sem defaults AI-slop (ver anti-slop.md)
- [ ] Responsive 375px verificado (código ou screenshot)

## Review

```
Boot → URL → matriz mínima screenshots → análise P1→P10 → visual-review-report.md
```

**Gate:** sem screenshot da página real → relatório incompleto; pedir captura ou executar Puppeteer.

**Não fazer:** aprovar/reprovar só por leitura de código sem evidência visual (excepto se utilizador proíbe browser explicitamente — documentar limitação).

## Vision

```
Boot → LER image-to-code SKILL.md → workflow image-first completo → opcional Review pós-build
```

`frontend-pro` **não** codifica primeiro em Vision. Delega criação visual à `image-to-code`.

## Fix

```
Ler relatório → ordenar Blocker→Nit → patch mínimo → re-screenshot IDs afectados → fix-list.md
```

Não refactorar fora do scope do relatório.

## Audit

```
Review + matriz completa + reduced-motion + dark (se existe) + estados erro/vazio/loading
```

Usar `audit-report.md` com secção de cobertura da matriz.
