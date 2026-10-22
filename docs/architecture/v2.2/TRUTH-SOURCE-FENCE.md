# V2.2 — Cerca de fonte de verdade (V22-GOAL-002)

| Campo | Valor |
|-------|-------|
| **Meta** | V22-GOAL-002 |
| **Runtime** | `orchestrator/src/knowledge/truth-source/` |
| **Integração** | `knowledge.search` no `DeterministicProvider` (engine) chama `knowledgeSearch` com `projectRoot=workspaceRoot` e fence **ON** por defeito |
| **Opt-out** | `KNOWLEDGE_TRUTH_FENCE=off` ou `disableTruthFence: true` em `knowledgeSearch` |

## Hierarquia (P1)

Ordem de autoridade em conflito de `topic_key`:

1. **code** — comportamento no repositório
2. **ai** — `.ai/` com `status: atual` e proveniência
3. **vault** — hits de `knowledge.search` / `WIKI_ROOT`
4. **inferred** — grafo derivado; arestas `INFERRED` não promovem página `atual`

## Proveniência

Todo item recuperado exige `provenance.source_ref` não vazio. Itens sem origem são **rejeitados** (`missing_provenance`). Página `.ai/` com `status: atual` sem fonte é inválida (`atual_without_source`).

## Isolamento por raiz

- `projectScopeId(projectRoot)` define namespace de cache de grafo: `graph-cache/<scope>/` sob o `data-dir`.
- Cenário 12 (bench): canário do projeto A deve ter **0** ocorrências no bundle de injeção do projeto B (`detectCrossProjectLeakage`).

## Testes

| Critério | Teste |
|----------|-------|
| Hierarquia código > vault | `truth-source-fence.test.ts` — tier priority |
| Proveniência obrigatória | `truth-source-fence.test.ts` — rejects items without provenance |
| Obsoleto não injeta | `truth-source-fence.test.ts` — obsolete .ai/ |
| Código não “corrigido” na wiki | `truth-source-fence.test.ts` — code divergent |
| Isolamento cenário 12 | `truth-source-fence.test.ts` — zero cross-project canary leakage |
