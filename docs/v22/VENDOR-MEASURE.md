# V22-GAP-VENDOR-1a

A medição real corre fora do CI. Este repositório não tem chave. O script nunca imprime `CURSOR_API_KEY` nem `OPENROUTER_API_KEY`.

O provider primário é o CLI do Cursor. O schema oficial em `https://cursor.com/docs/cli/reference/output-format` (lido em 2026-10-23) publica `result`, `duration_ms` e `duration_api_ms`. Não publica tokens nem custo. Esses campos ficam `NOT_MEASURED`. O binário documentado hoje é `agent`. O script chama `cursor-agent`. Se a instalação só expõe `agent`, define `CURSOR_AGENT_BIN=agent`.

O OpenRouter é secundário, compatível com OpenAI em `https://openrouter.ai/api/v1`. O modelo default é `google/gemini-2.5-flash-lite` (preço listado em 2026-10-23: US$0,10 / 1M de entrada e US$0,40 / 1M de saída). Modelos `anthropic/*` recebem `cache_control`. O teto do script é US$2,50, abaixo do orçamento de US$3. A estimativa usa o teto de 300 tokens de saída. Se passar de US$2,50, o script aborta sem chamar. Durante a corrida, aborta quando a soma de `usage.cost` passa de US$2,50.

## Um comando a partir de um clone limpo

Dry-run do Cursor, sem chave e sem gasto:

```bash
git clone --branch cursor/v22-gap-vendor-1a-8ae3 https://github.com/GaabDevWeb/EvolveLoop.git && cd EvolveLoop/orchestrator && npm ci && npm run v22:vendor-measure -- --provider cursor-agent --dry-run
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
