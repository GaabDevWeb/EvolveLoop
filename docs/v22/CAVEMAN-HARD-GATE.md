# V22-CAVEMAN-HG-1 — Caveman como hard gate de saída

A voz oficial do Caveman passa a ser o default de todo agente e worker do `/evolve`. A skill vendorizada não foi reescrita.

| Campo | Valor |
|-------|--------|
| Upstream | https://github.com/juliusbrussee/caveman |
| Tag | `v4.0.1` |
| Commit | `d262ab3882952a59312ff3537cd86d894523c5ab` |
| Licença | Apache-2.0 (`vendor/juliusbrussee-caveman/LICENSE`) |
| Skill | `vendor/juliusbrussee-caveman/skills/caveman/SKILL.md` |
| Pin | `vendor/juliusbrussee-caveman/PIN.json` |

`NOTICE` e `LICENSE-MIT` acompanham a cópia. O `NOTICE` upstream regista que contribuições anteriores a 3.0.0, fora do runtime Engine, entraram sob MIT. Esse `NOTICE` contém a palavra `truncated`. O `rg` da tarefa congelada `curta` (padrão `truncate`) passa a ver o ficheiro. Os relatórios P0 de baseline, handoff e compactação foram regenerados por isso e pelo bloco de gate no prompt de pickup.

O modo ligado é `caveman` (a voz). Não se instala `ultracave`, `megacave` nem `caveman-compress`. Compressão de ficheiro continua fora de contrato.

## Opt-out

```bash
EVOLVELOOP_BREVITY_CAVEMAN=off
```

`0`, `false` e `no` também desligam. Variável ausente, vazia, ou `on` / `true` / `1` / `yes` ligam o gate de saída.

Com o gate ligado, o prompt de pickup inclui a skill upstream antes do briefing. Código, comandos, paths, evidência, SHAs, mensagens de commit, docs de usuário, campos estruturados de relatório de task e conteúdo de segurança não são reescritos por esse gate.

`EVOLVELOOP_BREVITY_CAVEMAN=on` explícito também pede ao `run-engine` o bench histórico GOAL-009/010. A variável ausente não pede esse bench. O compressor de briefing desse bench não é o hard gate.

## Medição (corre fora desta VM)

Seis tarefas congeladas (`curta`, `projeto_grande`, `retomada`, `delegada`, `fontes_conflitantes`, `restricoes_compactacao_handoff`), dois braços (caveman OFF e ON), `N=5`. São 60 chamadas. O provider é `cursor-agent`. O tamanho da saída é tiktoken `cl100k_base` sobre o texto `result`. A latência é `duration_ms`. A qualidade é a fração de âncoras e restrições do cartão presentes na resposta. Tokens e custo do provider ficam `NOT_MEASURED`: o schema oficial do CLI não os publica. A chave não entra no argv nem no relatório.

Dry-run, sem chave e sem gasto:

```bash
cd orchestrator && npm ci && npm run v22:caveman-measure -- --provider cursor-agent --dry-run --n 5
```

Corrida real:

```bash
cd orchestrator && npm ci && CURSOR_API_KEY="$CURSOR_API_KEY" npm run v22:caveman-measure -- --provider cursor-agent --n 5
```

Se o binário local se chama `agent`:

```bash
cd orchestrator && npm ci && CURSOR_API_KEY="$CURSOR_API_KEY" CURSOR_AGENT_BIN=agent npm run v22:caveman-measure -- --provider cursor-agent --n 5
```

O relatório fica em `docs/v22/baseline/raw/caveman-hg-report.json`.
