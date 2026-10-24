# Caveman output hard gate

**Task:** `V22-CAVEMAN-HG-1`  
**Default:** ON para todo agente e worker do `/evolve`.  
**Opt-out:** `EVOLVELOOP_BREVITY_CAVEMAN=off` (`0`, `false` e `no` também desligam). Variável ausente significa ON.

## O que está ligado

A voz é a skill oficial vendorizada, sem reescrita:

`vendor/juliusbrussee-caveman/skills/caveman/SKILL.md`

Upstream: `https://github.com/juliusbrussee/caveman` tag `v4.0.1`, commit `d262ab3882952a59312ff3537cd86d894523c5ab`. Licença Apache-2.0. `NOTICE` e `LICENSE-MIT` ficam no mesmo diretório porque o `NOTICE` regista contribuições anteriores a 3.0.0 sob MIT. O pin de SHA-256 está em `vendor/juliusbrussee-caveman/PIN.json`.

O modo é `caveman`. `ultracave`, `megacave` e `caveman-compress` não entram neste gate. `caveman-compress` continua fora de contratos, skills de produto e código do orquestrador.

## Onde o gate entra

| Mecanismo | Onde |
|-----------|------|
| Rule `alwaysApply` | `.cursor/rules/caveman-hard-gate.mdc` e, no profile `standard`, `~/.cursor/rules/caveman-hard-gate.mdc` |
| Hook `sessionStart` | `.cursor/hooks/caveman-hard-gate.sh` e o mesmo script no merge de `~/.cursor/hooks.json` |
| Skill link | `agent-setup` faz symlink de `vendor/juliusbrussee-caveman/skills/caveman` para `~/.cursor/skills/caveman` |
| Contrato de prompt | `buildPickupPrompt` insere o bloco antes de `## Briefing`. `GATE_BUNDLE` ganha `caveman_output` |

`EVOLVELOOP_BREVITY_CAVEMAN=on` (explícito) continua a anexar o bench histórico GOAL-009/010 no `run-engine`. A variável ausente liga só o gate de saída. Não liga esse bench, para o JSON do engine não mudar em toda a corrida.

O compressor de briefing (`brevity-caveman.ts`) só corre no braço explícito `{ caveman: true }` do bench GOAL-009, ou quando a variável está explicitamente `on` e o caller é a função de compressão. O pickup por omissão não reescreve o briefing.

## Exceções

Estas classes ficam verbatim. Não se comprimem e não se alteram:

code, commands, paths, evidence, SHAs, commit messages, user docs, task reports (structured fields), security content

Avisos de segurança e confirmações irreversíveis ficam em frases completas. Campos estruturados de relatório de task mantêm o rótulo e o valor.

## Medição

A corrida live é fora do CI. O comando está em `docs/v22/CAVEMAN-HARD-GATE.md`.
