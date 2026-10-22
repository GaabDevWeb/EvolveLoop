# Otimização de tokens

## O que realmente pesa

Numa sessão de código, o prompt repete: instruções de sistema, catálogo de tools, arquivos, saída de ferramenta, histórico e só então a prosa do modelo. A JetBrains mediu isso no desenho do Caveman: comprimir a prosa mexe na fatia pequena. E-001 mostra outra fatia, o prefixo de skills, mas com tokenizer de whitespace e sem sucesso de tarefa.

Ordem de alavancas para a V2.2, da mais alinhada à evidência para a mais especulativa:

1. Não colocar no contexto o que a tarefa não vai usar (skills, MCP, wiki inteira, repo empacotado).
2. Recuperar trecho e decisão, não arquivo e vault.
3. Não reler o mesmo path na mesma run.
4. Manter prefixo estável se o provedor tiver cache de prompt.
5. Encurtar a prosa de saída, sabendo que o teto publicado em tarefas agênticas foi ~8,5% dos tokens de saída.
6. Comprimir tokens por modelo pequeno (LLMLingua, Caveman-compress, sumário de grafo). Última, e fora do caminho de contrato.

Não há meta percentual de aceite. Um alvo provisório só existe depois do baseline do harness (arquivo 08). Hipótese de trabalho, não compromisso: a alavanca 1–3 pode importar mais que a 5, porque deixa de enviar arquivos. Isso está `NOT_MEASURED`.

## Caveman — o que fazer com ele

Há três mecanismos no mesmo nome.

### Voz

Remove floreio. A skill pede conservar fato técnico e cair para prosa normal quando a frase for aviso de segurança, confirmação irreversível ou passo que a forma telegráfica ambigue. JetBrains: estilo realmente muda; código na saída permanece; qualidade de tarefa indistinguível naquele bench; economia de saída 8,5% com a skill forçada, portanto um teto.

Aplicação aceitável: respostas ao usuário e notas de handoff entre agentes **quando não forem o contrato**. Aplicação proibida: Policy, Evidence, DoD, comandos, diffs, JSON de checkpoint, critérios de segurança.

Não é melhor que “seja breve” a ponto de justificar uma dependência no core. Pode existir como skill de host, desligável. Não entra no perfil default.

### Compress de arquivo

Reescreve `CLAUDE.md` / todos com um modelo e troca o original. Backup fora da árvore para o auto-loader não reler. Isso é exatamente o arquivo que a wiki-carpaccio usa como contrato operacional (`.ai/CLAUDE.md`). Comprimi-lo destrói a fonte que o agente relê na sessão seguinte e ainda gasta tokens para comprimir.

**Não usar** em instrução crítica, contrato, requisito de segurança ou código. Também não usar na wiki: o lint precisa da frase original para detectar contradição.

### Proxy 4.x

Ideia correta no diagnóstico (o desperdício está na entrada repetida) e não comprovada para este sistema. Exige ficar no caminho do provedor. O Execution Engine hoje não é esse caminho: o host Cursor chama o modelo. Um proxy só valeria num adapter de provedor que o engine possua. Neste checkout, LLM live é `NOT_MEASURED` e não há adapter de cache.

Se um dia for testado: guardar o payload original, registrar o que foi removido, falhar fechado se o compressor não estiver seguro de um path, número ou negação, e comparar tarefa com verificador — não com “a resposta ficou curta”.

### Telegráfico e precisão

Fragmento perde escopo de “não”, de “só se”, de unidade e de ordem. A skill reconhece isso. Em orquestração, a mensagem entre agentes é um contrato pequeno. Encolhê-la para caveman-ultra é o lugar errado. O lugar certo de encolher é não mandar o histórico inteiro: mandar o id da evidência e o path.

## Alternativas que atacam a entrada

| Técnica | Preserva identificadores? | Efeito colateral | Cache de prefixo | Decisão V2.2 |
|---|---|---|---|---|
| Não injetar catálogo de skills inteiro | Sim | Pode esconder uma skill útil. E-001: precisão offline subiu com catálogo menor; sucesso live desconhecido. ADR-DR-0002 adia o governor | Prefixo menor e mais estável | Não implementar `max_skills`. Medir no host antes |
| Retrieval com orçamento | Sim, se o trecho é cópia | Se o orçamento cortar o trecho no meio de uma função, o modelo completa errado. Cortar em símbolo, não em token cego | O bloco recuperado muda por tarefa: não colocar isso no prefixo cacheável | P1 |
| Dedup de path na run | Sim | Nenhum grave | Neutro | P1, barato |
| Sumário incremental da sessão | Não garante | Perde detalhe; ADR-DR-0005 bloqueia reinject até ownership | Sumário novo invalida o sufixo, não o prefixo, se o prefixo for estável | Fora até o ADR |
| Prompt cache do provedor | N/A (não altera texto) | Exige prefixo idêntico. Anthropic: tools, system, messages até o breakpoint; TTL 5 min por default | É o mecanismo | P2 no adapter que existir |
| Cache semântico (mesma pergunta, outra frase) | N/A | Resposta errada reutilizada; staleness | Não substitui prompt cache | Fora |
| LLMLingua | Não garante | Papers mostram perda de grounding | Texto instável | Descartar no hot path |
| Modelo pequeno para classificar “quais páginas” | A lista de paths pode ser exata | O classificador pode omitir a página certa | Extra chamada | P2 só se o custo da chamada for menor que os arquivos poupados, no mesmo tokenizer |
| Repomix / “mande o repo” | Sim | Aumenta tokens | Ruim | Descartar |

Modelo menor para tarefa auxiliar é justificável quando a tarefa é fechada: extrair paths citados, comparar hash, marcar página stale. Não é justificável para decidir o patch. A Meta 21 da V3 (“model specialization”) e a Meta 22 (“cost intelligence”) são o governor futuro. A V2.2 não implementa roteamento econômico; no máximo registra contagem por chamada para esse governor não nascer cego.

## Compactação de sessão longa

Claude Code (já auditado em `docs/research/targets/external/claude-code/REPORT.md`) faz auto-compact e deixa um boundary. OpenHands tem Condenser plugável. Aider sumariza histórico antigo. Os três são do host/produto deles.

No EvolveLoop o equivalente seria: ao encher o orçamento, persistir contratos e decisões **fora** do chat (já é o papel de `.ai/` e de Evidence) e resumir só o working context. ADR-DR-0005 diz para não construir isso antes de responder quem é o dono. A V2.2 escreve essa resposta (arquivo 09, P0) e não liga o condenser.

O que pode sobreviver, na proposta de ownership (recomendação, não ADR aceito):

| Precisa sobreviver | Dono | Não vai para o resumo opaco |
|---|---|---|
| Grafo da run, `ir_id`, policy | Checkpoint | — |
| Preferência e decisão da feature | MemoryStore | — |
| Decisão de arquitetura verificada | `.ai/` ou vault | — |
| Paths já lidos, comandos, exit codes | Evidence | Segredos |
| Plano ainda não executado | Working context ou nó do grafo | — |

Working context compactado é descartável. Se o resumo for promovido, entra como memória `INFERRED` ou como página com `status: não confirmado`, nunca como Policy.

## Limites que não se sacrificam por token

- Identificador, path, número, negação, condição, comando e schema permanecem literais.
- Evidence de gate não é “passada” por um texto mais curto.
- Teste determinístico continua não sendo prova de qualidade de LLM (regra já do projeto).
- Isolamento entre projetos não é relaxado para reutilizar um grafo global “e economizar indexação”.
- Falha de retrieval continua fail-closed (`RAG_REPO_MISSING`), não vira contexto inventado.
