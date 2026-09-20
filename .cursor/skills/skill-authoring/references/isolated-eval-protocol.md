# Protocolo de eval em sessão isolada (“outro chat”)

Leia na **Fase 3** sempre que executar evals de comportamento. O objectivo é evitar que quem **escreveu** a skill também **avalie** a skill no mesmo contexto — isso enviesa resultados.

## Princípio

| Quem | Pode fazer | Não pode fazer |
|------|------------|----------------|
| **Sessão skill-authoring** (esta) | Planear evals, spawnar runners, grade, comparar, iterar SKILL.md | Executar o prompt do eval **com** a skill como agente principal |
| **Runner isolado** (subagente Task) | Ler só skill + prompt do eval; produzir output | Ver histórico da conversa de authoring, rascunhos anteriores, ou “o que o utilizador queria” |

Um runner isolado **simula outro chat**: contexto fresco, mesma skill, zero memória do processo de criação.

## Regra anti-viés (obrigatória)

O agente na sessão `/skill-authoring` **nunca** completa um eval `with_skill` na própria instância, mesmo que seja mais rápido. **Sempre** delegar via Task tool.

Excepção estreita: eval de **trigger** (Fase 5) — simular se a description dispararia pode ser inline.

## Spawn de runner isolado

Usar `subagent_type: generalPurpose`. **Não** passar resumo da conversa de authoring no prompt.

### Template — with_skill (sessão isolada)

```
CONTEXTO ISOLADO — trate isto como um chat novo. Sem histórico anterior.

1. Ler integralmente: <path-absoluto-SKILL.md>
2. Ler ficheiros em references/ APENAS se o SKILL.md mandar para o caso concreto.
3. Executar a tarefa do utilizador abaixo seguindo a skill.

NÃO consultar skill-authoring nem assumir intenção além do prompt.

--- PROMPT DO UTILIZADOR (eval) ---
<eval prompt>

--- INPUTS ---
<ficheiros ou "nenhum">

--- ENTREGA ---
- Guardar output principal em: <workspace>/.../with_skill/outputs/
- Guardar transcript resumido (passos, ficheiros lidos) em: .../with_skill/run-notes.md
- Se falhar critério da skill, documentar em run-notes.md — não corrigir para "ficar bonito".
```

### Template — baseline isolado (sem skill)

```
CONTEXTO ISOLADO — chat novo. SEM skill, SEM SKILL.md.

Executar apenas com capacidades gerais do agente:

--- PROMPT ---
<mesmo eval prompt>

--- ENTREGA ---
- Output em: .../without_skill/outputs/
- run-notes.md com passos tomados
```

### Template — old_skill (melhoria de skill)

Igual ao with_skill, mas apontar para snapshot: `/tmp/<skill>-snapshot/SKILL.md`.

## Execução em lote (múltiplos casos de uso)

Para **todos** os evals de uma iteração:

1. Listar evals em `evals/evals.json` (mín. **5** casos em **≥3 categorias** — ver matriz abaixo).
2. Num **único turno**, spawnar **2 × N** runners (with_skill + baseline por eval).
3. Enquanto correm, o parent redige assertions e `eval_metadata.json`.
4. Ao completar, **grader isolado** (outro subagente) lê outputs + assertions — não o autor da skill na mesma leitura que escreveu a skill naquela iteração, se possível usar subagente para grade.

## Matriz mínima de casos de uso

Cada skill em desenvolvimento deve ter evals que cubram:

| Categoria | O que testa | Mín. |
|-----------|-------------|------|
| `happy_path` | Pedido típico, contexto completo | 1 |
| `edge_case` | Input limite, campo em falta, ambiguidade leve | 1 |
| `adversarial` | Pedido que tenta violar contrato da skill | 1 |
| `minimal_context` | Utilizador vago — skill deve pedir clarificação ou assumir com suposição explícita | 1 |
| `near_miss_domain` | Vocabulário adjacente mas dentro do escopo | 1 |
| `integration` | Handoff com outra skill do pipeline (se aplicável) | 0–1 |

Total recomendado: **5–8 evals** antes de dar skill por fechada.

Taggear cada eval em `evals.json`:

```json
"category": "happy_path",
"tags": ["auth", "veredito-binario"]
```

## Comparação estruturada

Após todos os runners, gerar por iteração:

1. `comparison-report.md` — usar [templates/comparison-report.md](../templates/comparison-report.md)
2. `benchmark.md` — agregação numérica
3. Tabela na conversa para o utilizador

### Critério de discriminador (ship gate)

A skill **não está pronta** se:

- `with_skill` não passa **todas** assertions críticas em ≥80% dos evals
- `without_skill` passa **igual ou melhor** em ≥50% dos evals (skill redundante)
- Mesma falha aparece em **≥2 categorias** (problema estrutural, não overfit a um exemplo)

## Validação humana em chat real (opcional, recomendada)

Para gate final, gerar `evals/manual-chat-pack.md`:

```markdown
# Pack — testar em chat novo (manual)

Abra **novo chat** no Cursor (sem este histórico). Cole um bloco de cada vez.

## Eval 1 — happy_path
<cole o prompt>

## Eval 2 — edge_case
...
```

O utilizador cola resultados de volta; skill-authoring regista em `iteration-N/manual-feedback.md`.

## Runner de grader (isolado)

```
Avalie outputs de eval sem reescrever a skill.

Inputs:
- Assertions: <lista>
- with_skill output: <path ou conteúdo>
- without_skill output: <path ou conteúdo>

Produza grading.json com fields text, passed, evidence.
Veredito discriminador: with_skill melhor | equivalente | pior.
```
