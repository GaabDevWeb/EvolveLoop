# Failure model e degradation

## Classes de falha (classificar — não «retry» cego)

| Classe | Exemplos | Resposta típica |
|--------|----------|-----------------|
| `agent_failure` | viola role, inventa autoridade | `corrigir` / rejeitar entrega |
| `capability_failure` | capability inexistente no registry | `GAP` / criar contract+provider ou reduzir scope |
| `provider_failure` | entrypoint em falta, skill partida | `REFACTOR` / `NOT_READY` |
| `policy_denial` | require[] / isolation / budget | respeitar denial; não bypass no authoring |
| `context_failure` | inputs obrigatórios em falta | pedir contexto / `bloqueado` |
| `knowledge_failure` | wiki/RAG indisponível | degradar com SUPOSIÇÃO explícita |
| `validation_failure` | gates / evals | `NOT_READY` |
| `evaluation_failure` | runners/grader falham | não activar; iterar |
| `integration_failure` | fora do install/orquestrar | completar wiring ou `DEFERRED` |

## Degradação

Todo Agent Package pipeline deve declarar na skill (secção curta):

```text
Se X indisponível → Y (sem fingir sucesso)
```

Exemplos:

- browser/MCP research indisponível → não inventar factos externos; marcar bloqueio
- Ollama/RAG down → fallback documentado (BM25) se skill já o definir; senão `knowledge_failure`
- Contract em falta → não registar provider a apontar para contract fantasma

## Authoring sob falha

Se DISCOVER detectar mecanismo MISSING necessário ao pedido:

1. Documentar gap
2. Propor menor alteração compatível
3. **Não** implementar registry/runtime paralelo nesta skill
