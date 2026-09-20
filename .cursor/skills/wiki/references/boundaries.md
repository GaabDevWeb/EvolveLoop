# Fronteiras — Context Engineer vs Knowledge vs Researcher

## Matriz rápida

| Pedido do utilizador | Package |
|----------------------|---------|
| «Grounding wiki / pack / contratos Gaab / /wiki» | **wiki** (Context Engineer) |
| «O que fizemos ontem / LATEST / promote / librarian» | **wiki-mem** (Knowledge) |
| «Pesquisa na web / papers / docs externas» | **Researcher** (Wave C2 — ainda não criado) |
| «Só BM25 programático no orchestrator» | capability `knowledge.search` (deterministic) |

## DO NOT CREATE (Wave C1)

| Id pedido | Código | Motivo |
|-----------|--------|--------|
| `context-engineer` | `REJECT_DUPLICATE` / `EXTEND` | Mesmo DO que `wiki` (grounding / context pack) |
| `knowledge` (agent novo) | `REJECT_DUPLICATE` / `EXTEND` | Promote + episódico = `wiki-mem`; search = `knowledge.*` deterministic |

## Overlap permitido (handoff)

- **wiki → Agent coding:** após template Fontes/GAPs.
- **wiki-mem → wiki:** contratos canónicos nunca só de `LATEST.md`.
- **wiki-mem promote → librarian:** fila → `{Projeto}/log.md` ± `wiki/`; NUNCA `raw/`.

## Sinais de RESPONSIBILITY_OVERLOAD

Misturar «grounding + promote + research web + coding» → decompor:

`wiki` → (implementação) → `wiki-mem` promote → Researcher (C2) só se fontes externas.
