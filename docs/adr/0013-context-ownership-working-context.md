# ADR-0013: Working context ownership (compaction boundary)

| Campo | Valor |
|-------|-------|
| Data | 2026-10-22 |
| Status | **accepted** |
| Deciders | EvolveLoop V2.2 (V22-GOAL-001) |
| Resolve | ADR-DR-0005 (ownership checklist) |
| Relacionado | ADR-DR-0002 (skill catalog budget ≠ context retrieval budget), ADR-0004 (Knowledge contract) |

## Contexto

ADR-DR-0005 **adiou** compaction/reinject até existir ownership explícito entre working context, Memory, Knowledge e Checkpoint. ADR-DR-0002 **adiou** `max_skills` no runtime — orçamento de **catálogo de skills** não é o mesmo que orçamento de **retrieval de contexto** (V22-GOAL-006).

Princípio V2 inalterado: **Knowledge ≠ Memory ≠ Checkpoint**. Nenhum store permanente novo para working context.

## Decisão

1. **Working context** = payload efémero montado para uma chamada ao modelo (prompt + anexos de retrieval na fronteira do spawn). **Descartável** após a chamada; não é persistido como SSOT.
2. **Dono por spawn:** cada spawn PDA recebe `context_owner_id` explícito derivado de `parent_cycle_id`, `role` e `spawn_depth` (normalizado pelo runtime em `orchestrator/src/context/ownership.ts`). O dono governe compaction futura **dentro** do working context desse spawn — não funde stores.
3. **Compaction/reinject:** permanece `NOT_IMPLEMENTED` no engine; o **contrato** (`CompactionReinjectContract`) exige teste de fidelidade antes de qualquer reinject e proíbe sumarização destrutiva de paths, negações, comandos, DoD ou evidência.
4. **Orçamento de contexto (V22-GOAL-006):** limites configuráveis por `GATE_BUNDLE` / spawn (`max_paths`, `max_pages`, `max_tokens`); medição com tokenizer nomeado; classes protegidas nunca truncadas no meio — ver `orchestrator/src/context/budget.ts`.
5. **ADR-DR-0002:** inalterado para skills; context budget **não** introduz `max_skills`.

## Nove perguntas (escopo P0-1)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | O contexto compactado de trabalho tem store permanente próprio? | **Não.** Só working context efémero por chamada; persistência continua em Memory / Knowledge / Checkpoint / `.ai/` conforme ADR-0004. |
| 2 | É Memory (`MemoryStore`)? | **Não.** Memory guarda contexto de feature/run com scope definido em policy; working context não substitui `memory-store.ts`. |
| 3 | É Knowledge até verificação? | **Não automaticamente.** Excerpts de retrieval são candidatos; só entram como decisão após proveniência (wiki/código/ADR). Knowledge permanece backend `wiki` \| `fake`. |
| 4 | É Checkpoint? | **Não.** Checkpoint é job-path / resume HMAC; working context não é serializado no checkpoint. |
| 5 | Onde é a fronteira? | **Chamada ao modelo** — tudo montado até o adapter HTTP/host é working context; após a resposta, descartável salvo o que Memory/Evidence gravam explicitamente. |
| 6 | Como reconstruir sem compaction? | Ler **checkpoint** (estado job) + **memory** da feature + páginas `.ai/` `atual` + arquivos citados em evidência; reran retrieval com orçamento — sem condenser destrutivo. |
| 7 | Quando reinject? | Só se **teste de fidelidade** passar (paths, negações, comandos, DoD, evidência obrigatória presentes). Até lá: `reinject_allowed: false`. |
| 8 | Perda aceitável? | Apenas prosa redundante já coberta por evidência ou páginas `atual`; **nunca** paths, negações, comandos, critérios de aceite, restrições de segurança ou blobs de evidência. |
| 9 | O que sobrevive para resume? | Grafo/evidência de gates, decisões da feature, páginas `status: atual`, checkpoint válido — não o working context bruto. |

## Implementação mínima (runtime)

| Artefato | Função |
|----------|--------|
| `orchestrator/src/context/ownership.ts` | `context_owner_id` por spawn |
| `orchestrator/src/context/gate-bundle.ts` | Validação `GATE_BUNDLE` + campos de budget aditivos |
| `orchestrator/src/context/compaction-contract.ts` | Contrato compaction/reinject (fail-closed) |
| `orchestrator/src/context/budget.ts` | Orçamento + classes protegidas + telemetria |
| `orchestrator/src/context/tokenizer.ts` | `tiktoken:cl100k_base` ou `PROXY:whitespace_split` |

Compaction engine: **NOT_IMPLEMENTED** (ADR-DR-0005 mantém defer de **implementação**; ownership **fechado** por este ADR).

## Consequências

- Desbloqueia desenho futuro de compaction sem fundir Memory/Knowledge/Checkpoint.
- V22-GOAL-006 aplica orçamento no runtime sem alterar `knowledge.search` v1.
- World Model V3: revalidar quando branch `evolve-v3` existir (**hipótese pendente**).

## Reversibilidade

Novo ADR ou rejeição explícita de 0013 reabre ADR-DR-0005. Campos de budget em evidência são aditivos.
