# Canonical Source

## What is the likely canonical tree?

**Ambas, com papéis distintos (`BOTH`).**

| Papel | Árvore |
|-------|--------|
| Runtime / testes orchestrator (incl. `jobs/`, full-cycle, claim 103) | **AGENTS/Cursor** |
| Workspace activo (docs, research, audit, Agents/contracts expandidos, edits Sep 2026) | **CursorSKILLS** |

Não há remote git publicado nem commits que permitam eleger um único “upstream” absoluto.

## Why?

1. **Identidade de pacote idêntica** (`@agents/orchestrator@2.0.0`) e **47/48** ficheiros `src` idênticos → um sistema, duas árvores.
2. **Só AGENTS** executa o grafo completo (jobs presentes; `npm test` 103/103).
3. **O próprio CursorSKILLS declara** em `orchestrator/IMPLEMENTATION-STATUS.md`:  
   `SSOT testes: AGENTS/Cursor/orchestrator` e atribui **103** a “AGENTS `npm test`”.
4. **CursorSKILLS está à frente** em documentação de plataforma, inventário de Agents/contracts, e pequenos deltas (`run-jobs` evidence guard, evidence tests).

## What evidence supports it?

- Package manifests iguais.
- Diff estrutural `src` mínimo e localizado.
- AGENTS full-cycle + job-resume verdes.
- CS broken imports para `../jobs/*`.
- Linha SSOT explícita no IMPLEMENTATION-STATUS de CS.
- Timestamps: jobs AG ~Jul; bulk CS src ~17 Sep sem jobs.

## What evidence contradicts a single canonical?

- Sem histórico git utilizável (CS sem `.git`; AGENTS git vazio).
- CS não é subset global: tem **mais** Agents/contracts/docs.
- CS `run-jobs.ts` e `evidence.test.ts` **mais novos** que AG → “AGENTS mais novo” é falso como regra geral.
- Dois roots de trabalho distintos (`Downloads/CursorSKILLS` vs `Documentos/gitHub/AGENTS`).

## What remains unknown?

- Evento exacto da cópia/omissão de `jobs/` em Sep 2026.
- Intenção humana: dual-SSOT deliberado vs acidente.
- Existência de terceira árvore/fonte.
- Como reconciliar no futuro sem perder deltas CS.

## Confidence

**MEDIUM** na conclusão `BOTH_WITH_ROLE_SPLIT`.  
**HIGH** em rejeitar “UNRELATED” e em rejeitar “CS alone is runtime-complete”.  
**HIGH** em tratar AGENTS como SSOT **para jobs/testes do orchestrator** até decisão contrária documentada.
