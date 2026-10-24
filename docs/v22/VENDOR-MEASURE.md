# V22-GAP-VENDOR-1a

A medição real corre fora do CI. Este repositório não tem chave. O script nunca imprime `CURSOR_API_KEY` nem `OPENROUTER_API_KEY`.

O provider primário é o CLI do Cursor. O schema oficial em `https://cursor.com/docs/cli/reference/output-format` (lido em 2026-10-23) publica `result`, `duration_ms` e `duration_api_ms`. Não publica tokens nem custo. Esses campos ficam `NOT_MEASURED`. O binário documentado hoje é `agent`. O script chama `cursor-agent`. Se a instalação só expõe `agent`, define `CURSOR_AGENT_BIN=agent`.

O OpenRouter é secundário, compatível com OpenAI em `https://openrouter.ai/api/v1`. O modelo default é `google/gemini-2.5-flash-lite` (preço listado em 2026-10-23: US$0,10 / 1M de entrada e US$0,40 / 1M de saída). Modelos `anthropic/*` recebem `cache_control`. O teto do script é US$2,50, abaixo do orçamento de US$3. A estimativa usa o teto de 300 tokens de saída. Se passar de US$2,50, o script aborta sem chamar. Durante a corrida, aborta quando a soma de `usage.cost` passa de US$2,50.

## Um comando a partir de um clone limpo

Dry-run do Cursor, sem chave e sem gasto:

```bash
git clone --branch cursor/v22-gap-vendor-1b-8ae3 https://github.com/GaabDevWeb/EvolveLoop.git && cd EvolveLoop/orchestrator && npm ci && npm run v22:vendor-measure -- --provider cursor-agent --dry-run
```

Depois do merge, troca o `--branch` para `release/v2.1-freeze-preparation`.

## Cursor, corrida real

```bash
cd orchestrator && npm ci && CURSOR_API_KEY="$CURSOR_API_KEY" npm run v22:vendor-measure -- --provider cursor-agent
```

A chave fica só na env. O argv é `cursor-agent -p --output-format stream-json --mode ask --trust`. O prompt vai no stdin. `--mode ask` evita escrita no repo.

## OpenRouter, dry-run e corrida real

```bash
cd orchestrator && npm run v22:vendor-measure -- --provider openrouter --dry-run
```

```bash
cd orchestrator && OPENROUTER_API_KEY="$OPENROUTER_API_KEY" npm run v22:vendor-measure -- --provider openrouter
```

Outro modelo barato exige os dois preços, senão a corrida real aborta:

```bash
npm run v22:vendor-measure -- --provider openrouter --model <id> --input-usd-per-mtok <n> --output-usd-per-mtok <n> --dry-run
```

O relatório fica em `docs/v22/baseline/raw/p0-vendor-report.json`. `N=5`. São 6 tarefas, dois braços, mais duas chamadas de probe com prefixo estável acima de 1024 tokens.

HTTP 429 no OpenRouter espera o cabeçalho `Retry-After` (segundos ou data HTTP) e volta a chamar. Sem cabeçalho legível, a espera é 1s, 2s, 4s. São no máximo 4 tentativas. O corpo do erro não é impresso. Outros status não repetem.

## V22-GAP-VENDOR-1b

O JSON real do `cursor-agent` está em `docs/v22/baseline/raw/p0-vendor-cursor-agent-report.json`. Os prompts foram remontados neste tree e o sha256 dos doze braços coincidiu com essa corrida.

### Latência

O schema de `stream-json` em `https://cursor.com/docs/cli/reference/output-format` (relido em 2026-10-24) emite `tool_call` com `subtype` `started` e `completed`. O modo ask pesquisa o código e não edita. A corrida versionada não guardou o NDJSON. O parser da altura só ficou com `result` e as durações. A contagem de `tool_call` por braço nessa corrida é `NOT_MEASURED`. `duration_ms` iguala `duration_api_ms` nas 62 chamadas, e a doc diz que os dois campos estão iguais, por isso não isolam tempo de ferramenta.

O prompt V2.2, o mesmo da corrida, inclui na linha 15 a ordem de ler `.cursor/skills/orquestrar/SKILL.md` e na linha 33 a ordem de ler o repositório, mais o caminho estável `jobs/v22-p0-baseline/<tarefa>/V2.2`. O B0 das quatro tarefas mais lentas não tem essas duas ordens. A doc headless diz que um caminho no prompt é lido por tool call. Isso é um mecanismo compatível com V2.2 2–4× mais lento apesar do prompt menor. Não substitui a contagem que o stream não guardou.

Uma corrida futura grava, por chamada, `tool_calls_started`, `tool_calls_read_started`, `tool_calls_write_started` e `tool_calls_other_started`. O conteúdo devolvido pela ferramenta não entra no relatório.

### Regressão da restrição

Em `restricoes_compactacao_handoff` o contexto V2.2 tem 22062 tokens e contém `reinject_allowed: false` quatro vezes:

| Onde | Token antes da frase |
|------|----------------------|
| slice `spawn://security_restrictions` | 671 |
| `docs/architecture/v2.2/IMPLEMENTATION-ROADMAP.md` | 9159 |
| `docs/adr/0013-context-ownership-working-context.md` | 13022 |
| `docs/v22/GOALS-OFFICIAL.md` | 19493 |

A frase não foi cortada pelo budget. O B0 dessa tarefa também a contém e não contém `No secret leakage in evidence payload`. O cartão lista `reinject_allowed: false` duas vezes, como âncora e como restrição. A quinta resposta V2.2 não trouxe essa substring; as outras quatro trouxeram. O scorer desta corrida olha a resposta, não o contexto. As âncoras do cartão ficam como estão.

### Critério semântico, definido antes de olhar respostas

Este protocolo não foi executado. Não altera `docs/v22/baseline/tasks.json`.

O juiz recebe só o cartão congelado (pergunta, âncoras com path e substring, restrições) e uma resposta. Não recebe a resposta do outro braço nem o JSON desta corrida.

Para cada âncora, 1 se a resposta afirma o mesmo facto que a substring e cita o path da âncora. Paráfrase conta. A substring exacta não é exigida. Para cada restrição, 1 se a resposta conserva a obrigação, incluindo a negação. Paráfrase conta. A qualidade é a média dessas decisões. Lista vazia vale 1, como o scorer actual. O juiz não edita o cartão. Este protocolo é outro instrumento. O número versionado continua a ser o da substring.
