# Ciclo de Evals — Referência completa

Leia ao **executar evals** (Fase 3), **iterar** (Fase 4) ou quando precisar de detalhe sobre workspace, grading e benchmark.

**Sessões isoladas (outro chat):** ver [isolated-eval-protocol.md](isolated-eval-protocol.md) — protocolo obrigatório para runners e anti-viés.

## Workspace layout

Para uma skill em `.cursor/skills/minha-skill/`, criar workspace sibling:

```
minha-skill-workspace/
├── iteration-1/
│   ├── eval-<nome-descritivo>/
│   │   ├── with_skill/
│   │   │   ├── outputs/
│   │   │   └── run-notes.md      # Transcript resumido do runner isolado
│   │   ├── without_skill/
│   │   │   ├── outputs/
│   │   │   └── run-notes.md
│   │   ├── old_skill/            # Baseline (melhoria de skill existente)
│   │   │   └── outputs/
│   │   ├── eval_metadata.json
│   │   ├── grading.json
│   │   └── timing.json           # Opcional
│   └── benchmark.md
│   ├── comparison-report.md      # Comparativo qualitativo por eval
│   └── manual-feedback.md        # Resultados de chat real (opcional)
└── iteration-2/
    └── ...
```

Criar diretórios **à medida** — não pré-criar toda a árvore.

## evals/evals.json (na skill)

```json
{
  "skill_name": "minha-skill",
  "evals": [
    {
      "id": 1,
      "name": "nome-descritivo",
      "prompt": "Prompt realista que um utilizador escreveria",
      "expected_output": "Descrição do resultado esperado",
      "files": [],
      "assertions": [
        {
          "id": "output-has-sections",
          "description": "Output contém secções X, Y, Z",
          "type": "structural"
        }
      ]
    }
  ]
}
```

**Prompts realistas:** incluir contexto (paths, nomes de ficheiros, papel do utilizador). Evitar `"Format this data"`.

## Tipos de baseline

| Cenário | Baseline | Pasta |
|---------|----------|-------|
| Skill nova | Sem skill | `without_skill/` |
| Melhorar skill existente | Versão anterior | `old_skill/` (snapshot antes de editar) |

Para melhoria: `cp -r .cursor/skills/minha-skill/ /tmp/minha-skill-snapshot/` antes de editar.

## Execução paralela (Task tool)

**Regra:** lançar with_skill e baseline **no mesmo turno** para cada eval.

### Prompt do subagente with_skill

```
Execute esta tarefa:
- Skill path: <path-absoluto-para-SKILL.md>
- Tarefa: <eval prompt>
- Ficheiros de input: <lista ou "nenhum">
- Guardar outputs em: <workspace>/iteration-N/eval-<name>/with_skill/outputs/
- O que guardar: <ex. "o markdown de revisão", "o ficheiro .docx gerado">
```

Instruir o subagente a **ler SKILL.md** e seguir as instruções antes de executar.

### Prompt do subagente baseline

```
Execute esta tarefa SEM consultar nenhuma skill:
- Tarefa: <mesmo eval prompt>
- Guardar outputs em: <workspace>/iteration-N/eval-<name>/without_skill/outputs/
```

Para `old_skill/`, apontar para o snapshot da versão anterior.

## eval_metadata.json

Criar por eval antes ou durante as runs:

```json
{
  "eval_id": 1,
  "eval_name": "nome-descritivo",
  "prompt": "O prompt do utilizador",
  "assertions": []
}
```

Preencher assertions enquanto as runs executam — não esperar que terminem.

## Assertions

**Boas:** verificáveis objectivamente, nomes descritivos.

| Tipo | Exemplo |
|------|---------|
| structural | Output contém secção `## Veredito` |
| format | Veredito é `OK` ou `Ajustes necessários` |
| file | Ficheiro `output.md` existe e tem > 100 chars |
| script | `python scripts/check.py output/` retorna 0 |

**Evitar assertions** em qualidade subjetiva (tom, estética) — usar revisão humana.

Preferir script a inspecção visual quando possível.

## grading.json

```json
{
  "run": "with_skill",
  "eval_name": "nome-descritivo",
  "expectations": [
    {
      "text": "Output contém secção Veredito",
      "passed": true,
      "evidence": "Linha 12: ## Veredito"
    },
    {
      "text": "Veredito é binário OK ou Ajustes necessários",
      "passed": false,
      "evidence": "Encontrado 'Quase pronto' — viola contrato"
    }
  ],
  "pass_rate": 0.5
}
```

Campos obrigatórios: `text`, `passed`, `evidence`.

## timing.json (opcional)

```json
{
  "duration_ms": 23332,
  "notes": "Capturado manualmente se disponível"
}
```

Não bloquear o workflow se timing não estiver disponível.

## benchmark.md (agregação manual)

Gerar em `iteration-N/benchmark.md`:

```markdown
# Benchmark — iteration-N — minha-skill

| Eval | Config | Pass rate | Assertions passed | Notas |
|------|--------|-----------|-------------------|-------|
| login-flow | with_skill | 100% | 3/3 | |
| login-flow | without_skill | 33% | 1/3 | Sem formato de veredito |
| api-contract | with_skill | 100% | 2/2 | |
| api-contract | without_skill | 50% | 1/2 | |

## Análise

- Skill discrimina: with_skill passa consistentemente mais assertions
- Eval flaky: nenhum / eval-X mostra alta variância — investigar
- Trade-off tokens/tempo: nota qualitativa se relevante
```

## Apresentação ao utilizador

Sem `generate_review.py`, apresentar na conversa:

1. Tabela por eval: prompt → resumo output with_skill vs baseline
2. `grading.json` resumido (pass/fail por assertion)
3. Link/path aos ficheiros em `outputs/` para inspecção
4. Perguntas de feedback por eval com falha ou subjetivo

Template de pergunta: *"No eval `login-flow`, o output sem skill não tinha veredito binário. O output com skill está aceitável? O que mudaria?"*

## Iteração

Após feedback:

1. Aplicar melhorias à skill (ver Fase 4 em SKILL.md)
2. Nova pasta `iteration-(N+1)/`
3. Re-executar **todos** os evals (with_skill + baseline)
4. Comparar `benchmark.md` com iteração anterior

Parar quando:
- Utilizador satisfeito
- Feedback vazio em todos os evals
- Sem progresso mensurável após 2 iterações

## Skills subjetivas

Para skills de estilo/escrita sem critério objectivo:

- Evals qualitativos apenas (sem assertions rígidas)
- Baseline ainda útil para comparar estrutura/completude
- Foco em trigger evals (description) em vez de output assertions
