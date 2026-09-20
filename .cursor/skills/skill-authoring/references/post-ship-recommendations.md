# Recomendações pós-ship e melhorias opcionais

Leia no **checklist final** ou quando o utilizador perguntar o que mais fazer depois de criar a skill.

## Já coberto pelo fluxo principal

- Evals em sessão isolada (subagente = outro chat)
- Baseline sem skill
- Matriz de casos de uso (5–8 evals, múltiplas categorias)
- Comparação estruturada (`comparison-report.md`)
- Trigger evals (description)
- Pack para teste manual em chat novo

## Recomendações adicionais (por prioridade)

### Alta prioridade

| Recomendação | Porquê |
|--------------|--------|
| **`metadata.version` no frontmatter** | Regressão: saber qual versão passou nos evals |
| **`evals/` versionado no repo** | Suite reexecutável quando alguém edita a skill |
| **Registar skill na tabela do `orquestrar`** | Se for skill de pipeline AGENTS — senão ninguém a invoca no ciclo |
| **Comando `/` dedicado** | `.cursor/commands/<nome>.md` apontando para SKILL.md |
| **Exclusões na description** | Reduz overtriggering com skills irmãs |

### Média prioridade

| Recomendação | Porquê |
|--------------|--------|
| **Skill vs Rule** | Rule = como pensar sempre; Skill = fluxo sob demanda. Não duplicar |
| **Scripts em `scripts/`** | Se runners repetem o mesmo helper, bundlar na skill |
| **`CHANGELOG.md` na pasta da skill** | Delta entre versões após cada iteração de eval |
| **Publicar em skills.sh** | `npx skills add` — partilha e install count como sinal de qualidade |
| **Golden files** | `evals/golden/<eval-name>.md` — output de referência aprovado pelo utilizador |

### Baixa prioridade (nice-to-have)

| Recomendação | Porquê |
|--------------|--------|
| **Re-run evals após cada edit** | CI local manual antes de merge |
| **Blind comparison** | Grader que vê A vs B sem saber qual tem skill |
| **Teste em 2º modelo** | Se disponível — robustez da skill a mudança de modelo |
| **Canvas / Agents/** | Entrada `Agents/<Nome>.md` para documentação visual do ecossistema |

## Skill vs Rule — decisão rápida

| Escolher **Skill** | Escolher **Rule** |
|--------------------|-------------------|
| Fluxo multi-passo com output definido | Convenção de código sempre activa |
| Invocação explícita (`/` ou trigger) | Aplica a ficheiros por glob |
| Conhecimento de domínio pesado | Estilo, idioma, commits, padrões do repo |
| Evals de comportamento fazem sentido | "Não inventar", "ler README primeiro" |

## Frontmatter versionado (exemplo)

```yaml
---
name: minha-skill
description: ...
metadata:
  version: 1.0.0
  eval_iteration: 2
  last_benchmark: minha-skill-workspace/iteration-2/benchmark.md
disable-model-invocation: true
---
```

## Quando re-executar evals

- Qualquer alteração ao corpo do SKILL.md
- Alteração de `references/` referenciados no fluxo principal
- Mudança de description que afecte comportamento (não só triggering)
- Antes de merge para main
