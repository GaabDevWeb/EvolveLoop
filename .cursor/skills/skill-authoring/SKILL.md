---
name: skill-authoring
description: >
  Fábrica de skills + papel Evaluator (eval-authoring): ciclo de evals, runners
  isolados, assertions, trigger optimization. Use quando /skill-authoring, criar
  ou melhorar SKILL.md, pedir evals/benchmark/triggering. Não use para gates de
  feature (testing, validator, po-review, code-reviewer), packages de agente
  (agent-authoring), nem Observer/telemetria de runtime. Built-in create-skill
  para fundamentos de estrutura.
metadata:
  version: 1.3.0
  status: stable
  capability: eval-authoring
  type: meta
  command: skill-authoring
  pda_roles: []
  specialization: Evaluator
disable-model-invocation: true
---

# Skill Authoring — Criação com ciclo de evals (+ Evaluator)

Complementa a built-in `create-skill` com **validação rigorosa**: comportamento (evals) e triggering (description). O objectivo é skills que **discriminam** face ao baseline e **disparam** nos pedidos certos.

**Wave C3 — Evaluator:** `EXTEND_EXISTING_AGENT` nesta meta (e em `agent-authoring` para packages). **Não** criar agente `evaluator` separado — factories já autoram/correm o ciclo de evals.

**EvolveLoop:** skills de UI ou que toquem implementação visual devem referenciar [orquestrar/references/image-attachment-gate.md](../orquestrar/references/image-attachment-gate.md) e `~/.agents/skills/image-to-code/SKILL.md` quando o utilizador puder anexar imagens.

## Quando usar

- Invocação **`/skill-authoring`** ou pedido explícito de skill-authoring
- Criar skill nova a partir de workflow, conversa ou requisitos
- Melhorar `SKILL.md` existente que sub-performa ou não dispara
- Pedido explícito de evals, benchmark, testes de skill ou optimização de description
- Capturar padrões do ecossistema AGENTS (`planner`, `orquestrar`, `po-review`, etc.)

## Quando não usar

- Perguntas puramente conceptuais sobre skills sem criar/melhorar ficheiros
- Skills puramente subjetivas (estilo, tom) **sem** critério verificável — a menos que o utilizador peça evals qualitativos ou trigger evals apenas
- Tarefa que uma **rule** (`.cursor/rules/`) resolve melhor — regra persistente vs skill procedural
- Gate de produto: suite (`testing`), DoD formal em disco (`validator`), aceite PO (`po-review`), code review (`code-reviewer`) — Evaluator ≠ esses gates
- Observabilidade de runtime / replay de traces → telemetria (`execution-trace`); **não** Observer agent

## Papel Evaluator (meta)

| Responsabilidade | Onde |
|------------------|------|
| Desenhar evals/assertions/trigger sets de **skills** | esta skill |
| Desenhar evals/boundaries de **Agent Packages** | `agent-authoring` (op `evaluate`) |
| Correr runners isolados + grading | protocolo [isolated-eval-protocol.md](references/isolated-eval-protocol.md) |
| **Não** substituir Validator/PO/CR/Tester em pipeline de feature | gates Wave C3 / Control |

## Recursos desta skill

| Ficheiro | Quando ler |
|----------|------------|
| [references/fundamentals.md](references/fundamentals.md) | Fase 2 — estrutura, frontmatter, anti-patterns |
| [references/eval-workflow.md](references/eval-workflow.md) | Fase 3–4 — workspace, Task spawning, grading |
| [references/isolated-eval-protocol.md](references/isolated-eval-protocol.md) | Fase 3 — eval em outro chat (runners isolados), matriz de casos |
| [references/trigger-optimization.md](references/trigger-optimization.md) | Fase 5 — 20 queries, near-misses |
| [references/post-ship-recommendations.md](references/post-ship-recommendations.md) | Checklist final — versionamento, orquestrar, golden files |
| [templates/evals.json](templates/evals.json) | Copiar para `evals/evals.json` da skill em desenvolvimento |
| [templates/trigger-eval-set.json](templates/trigger-eval-set.json) | Copiar para trigger evals |
| [templates/grading-rubric.md](templates/grading-rubric.md) | Revisão humana pós-grading |
| [templates/comparison-report.md](templates/comparison-report.md) | Relatório comparativo por iteração |
| [examples/po-review-eval-example.md](examples/po-review-eval-example.md) | Walkthrough no ecossistema AGENTS |

---

## Fluxo em 5 fases

```
Fase 1 Discovery → Fase 2 Draft → Fase 3 Evals → Fase 4 Iterar → Fase 5 Description → Checklist
```

Identificar em que fase o utilizador está e avançar. Se já existe draft, saltar para Fase 3.

---

## Fase 1 — Discovery

### Perguntas obrigatórias

1. **Propósito:** que tarefa ou workflow a skill habilita?
2. **Localização:** pessoal (`~/.cursor/skills/`, `~/.agents/skills/`) ou projeto (`.cursor/skills/`)?
3. **Triggers:** em que frases/contextos deve disparar?
4. **Conhecimento de domínio:** o que o agente não sabe sem a skill?
5. **Formato de output:** templates, secções obrigatórias, estilo?
6. **Padrões existentes:** skills, rules ou convenções do repo a seguir?

### Pergunta crítica (evals)

> Esta skill tem **output verificável** (formato, secções, ficheiros, comandos)?

| Resposta | Acção |
|----------|-------|
| Sim | Fase 3 com assertions objectivas |
| Parcialmente | Evals mistos: assertions + rubrica humana |
| Não (subjetivo) | Evals qualitativos; investir em trigger evals (Fase 5) |

### Texto verbatim

Se o utilizador fornecer copy exacta para a skill, usar **verbatim** em `SKILL.md` — mesmas palavras, mesma ordem.

### Inferir do contexto

Com histórico de conversa, extrair workflow, ferramentas, correcções do utilizador e formatos observados antes de perguntar.

---

## Fase 2 — Draft

1. Criar `skill-name/SKILL.md` com frontmatter válido
2. Seguir [references/fundamentals.md](references/fundamentals.md) para estrutura
3. Manter corpo **< 500 linhas**; detalhe em `references/`
4. Criar `evals/evals.json` a partir de [templates/evals.json](templates/evals.json)
5. Se skill irmã no pipeline: documentar fronteiras na description ("Não use para…")

### Checklist do draft

- [ ] `name` lowercase com hífens, `description` em terceira pessoa com WHAT + WHEN
- [ ] Triggers na description, não só no corpo
- [ ] Exemplos concretos se output depende de formato
- [ ] `disable-model-invocation: true` salvo auto-invocação desejada

---

## Fase 3 — Ciclo de evals (sessões isoladas)

Detalhe: [references/eval-workflow.md](references/eval-workflow.md) + [references/isolated-eval-protocol.md](references/isolated-eval-protocol.md).

**Regra:** quem está em `/skill-authoring` **não executa** evals `with_skill` nesta instância — só **spawna runners** (simulam **outro chat** sem histórico de authoring).

### Passo 1 — Matriz de casos de uso

Criar **5–8 evals** em `evals/evals.json`, cobrindo **≥3 categorias**:

`happy_path` | `edge_case` | `adversarial` | `minimal_context` | `near_miss_domain` | `integration`

Partilhar com o utilizador: *"Esta matriz cobre o uso real? Falta alguma categoria?"*

### Passo 2 — Workspace

Criar `<skill-name>-workspace/iteration-1/` como sibling da skill.

### Passo 3 — Runners isolados (paralelo)

Para **cada** eval, no **mesmo turno**, lançar **2 Task subagentes** (contexto fresco, sem histórico desta conversa):

- **with_skill** — lê só `SKILL.md` + prompt do eval
- **baseline** — `without_skill/` ou `old_skill/` (snapshot)

Templates exactos: [references/isolated-eval-protocol.md](references/isolated-eval-protocol.md).

Cada runner grava `outputs/` + `run-notes.md`.

### Passo 4 — Grader isolado

Subagente separado lê outputs + assertions → `grading.json`. Preferir não reutilizar o mesmo contexto que escreveu a skill na iteração.

### Passo 5 — Comparar

Gerar:

1. [templates/comparison-report.md](templates/comparison-report.md) → `comparison-report.md`
2. `benchmark.md` — agregação numérica
3. Tabela na conversa (with_skill vs baseline por eval e por categoria)

**Ship gate:** skill não pronta se baseline ≥ with_skill em ≥50% dos evals ou falha estrutural em ≥2 categorias.

### Passo 6 — Chat real (opcional, recomendado)

Gerar `evals/manual-chat-pack.md` para o utilizador testar em **Composer/chat novo** e devolver feedback → `manual-feedback.md`.

---

## Fase 4 — Iteração

Aplicar melhorias com base no feedback. Princípios:

1. **Generalizar** — evitar overfit aos 2–3 exemplos; a skill deve funcionar em milhares de prompts
2. **Manter lean** — remover instruções que não puxam peso; ler transcripts, não só outputs finais
3. **Explicar o porquê** — preferir raciocínio a MUST em caps; yellow flag se muitos ALWAYS/NEVER
4. **Bundlar scripts** — se subagentes repetem o mesmo helper, mover para `scripts/`

Loop:

1. Editar skill
2. Nova `iteration-(N+1)/`
3. Re-executar todos os evals (with_skill + baseline)
4. Comparar `benchmark.md`

Parar quando: utilizador satisfeito, feedback vazio, ou sem progresso após 2 iterações.

---

## Fase 5 — Otimização de description

Detalhe: [references/trigger-optimization.md](references/trigger-optimization.md).

1. Gerar **20 queries** (8–10 should_trigger, 8–10 should_not near-miss)
2. Guardar em `evals/trigger-eval-set.json`
3. Revisar com utilizador (AskQuestion ou tabela editável)
4. Loop manual: avaliar description → identificar falhas → reescrever → re-testar
5. Meta: ≥90% should_trigger, 0 falsos positivos críticos em should_not
6. Mostrar before/after da description

Técnica **description assertiva:** cobrir sinónimos e contextos implícitos para combater undertriggering.

---

## Checklist final

### Qualidade core

- [ ] Description específica com termos de trigger e exclusões
- [ ] SKILL.md < 500 linhas; referências a um nível
- [ ] Terminologia consistente
- [ ] Exemplos concretos

### Evals de comportamento

- [ ] **5–8 evals** em ≥3 categorias (matriz de casos de uso)
- [ ] Runners **isolados** (não executados na sessão authoring)
- [ ] `comparison-report.md` + `benchmark.md` na última iteração
- [ ] Assertions críticas passam em with_skill; baseline inferior (skill **discrimina**)
- [ ] Opcional: `manual-chat-pack.md` testado em chat novo

### Pós-ship

Ver [references/post-ship-recommendations.md](references/post-ship-recommendations.md): versionamento, comando `/`, integração orquestrar, golden files.

### Triggering

- [ ] 20 queries revistas pelo utilizador
- [ ] Description cobre should_trigger e rejeita near-misses

### Scripts (se aplicável)

- [ ] Packages documentados
- [ ] Paths Unix (`scripts/helper.py`)

---

## Comunicação com o utilizador

Adaptar linguagem ao contexto: utilizadores não-técnicos podem não conhecer JSON ou assertion. Explicar termos quando em dúvida.

Se o utilizador preferir iterar sem evals formais ("só vibe comigo"), reduzir rigor mas manter checklist mínimo de description e estrutura.

---

## Integração ecossistema AGENTS

Skills deste repo frequentemente referenciam-se (`orquestrar` → `planner` → `po-review`). Ao criar skill nova:

- Documentar **handoff** (quem consome o output)
- Exclusões na description com nomes de skills irmãs
- Ver [examples/po-review-eval-example.md](examples/po-review-eval-example.md) para padrão de evals em pipeline

---

## Instrução final

Uma skill sem evals em **sessão isolada** é uma hipótese enviesada. Runners separados simulam outro chat; a comparação with_skill vs baseline prova valor; trigger evals provam que dispara quando deve. Entregar skill + `evals/` + workspace da última iteração + `comparison-report.md` quando o utilizador pedir rigor completo.
