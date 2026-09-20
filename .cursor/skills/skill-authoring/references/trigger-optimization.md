# Otimização de Description — Triggering

Leia na **Fase 5** após evals de comportamento passarem, ou quando a skill não dispara quando deveria (*undertriggering*).

## Como funciona o triggering

O agente vê `name` + `description` de cada skill disponível e decide se consulta o `SKILL.md`. A description é o **único** sinal de "quando usar" — não repetir triggers só no corpo.

**Undertriggering:** o modelo ignora skills úteis em pedidos que deveriam activá-las. Combate com descriptions assertivas e cobertura de sinónimos/contextos implícitos.

**Overtriggering:** skill dispara em pedidos adjacentes mas errados. Combate com exclusões explícitas na description ("Não use para X").

## Conjunto de 20 queries

Criar ficheiro `evals/trigger-eval-set.json`:

```json
[
  {
    "query": "prompt realista do utilizador",
    "should_trigger": true,
    "notes": "não menciona o nome da skill"
  },
  {
    "query": "pedido near-miss com palavras-chave partilhadas",
    "should_trigger": false,
    "notes": "parece relacionado mas precisa de outra skill"
  }
]
```

### Distribuição

| Tipo | Quantidade | Objectivo |
|------|------------|-----------|
| should_trigger | 8–10 | Cobrir formulações, formal/casual, implícito |
| should_not_trigger | 8–10 | Near-misses genuínos, não óbvios |

### Queries should_trigger — cobertura

- Sinónimos do domínio (ex.: "aceite PO", "UAT", "está pronto para release?")
- Pedidos sem nomear a skill
- Casos limite onde a skill deve ganhar vs outra
- Contexto real: paths, nomes de ficheiros, papel do utilizador

**Ruim:** `"Format this data"`, `"Review my PR"`

**Bom:** `"o PM pediu para validar se o login com Google cumpre os critérios do ticket LIN-442 antes do deploy de sexta — já correu os testes mas quero aceite de produto"`

### Queries should_not_trigger — near-misses

Os casos mais valiosos **partilham vocabulário** mas precisam de outra ferramenta:

| Padrão near-miss | Exemplo (po-review) |
|------------------|---------------------|
| Mesmo domínio, acção diferente | "escreve os testes E2E do login" → `testing`, não po-review |
| Palavra-chave partilhada | "revisa este código por segurança" → `security` |
| Pedido trivial que o modelo resolve sem skill | "o que é Definition of Done?" → conceitual |
| Skill irmã no pipeline | "planeia a feature de auth" → `planner` |

**Evitar negativos óbvios:** "escreve fibonacci" para uma skill de PDF não testa nada.

## Revisão com o utilizador

1. Apresentar as 20 queries em tabela (query | should_trigger | notas)
2. Pedir confirmação ou edições via AskQuestion ou lista editável
3. Queries más → descriptions más; investir tempo aqui

## Loop manual de optimização (sem run_loop)

Cursor não tem `scripts.run_loop`. Seguir:

### Passo 1 — Avaliar description actual

Para cada query em `trigger-eval-set.json`, simular mentalmente:

- Um utilizador com esta mensagem — a description actual faria o agente escolher esta skill?
- Registar em `trigger-results.md`: query | esperado | provável | match?

### Passo 2 — Identificar falhas

| Falha | Sintoma | Correcção |
|-------|---------|-----------|
| Undertrigger | should_trigger falha | Adicionar termos/frases à description |
| Overtrigger | should_not dispara | Adicionar "Não use para…" com casos concretos |
| Ambiguidade | empate com outra skill | Clarificar fronteira na description |

### Passo 3 — Reescrever description

Técnicas:

1. **Lista de triggers** no final da description: "Use quando…" com 5–8 frases variadas
2. **Exclusões explícitas**: "Não use para implementar código, planejar roadmap, ou…"
3. **Description assertiva** (sem ser spam): cobrir sinónimos que utilizadores reais usam
4. Manter terceira pessoa e < 1024 caracteres

### Passo 4 — Re-testar

Re-avaliar as 20 queries contra a nova description. Repetir até:

- ≥ 90% match em should_trigger
- 0 falsos positivos em should_not (near-misses críticos)

### Passo 5 — Mostrar before/after

Apresentar ao utilizador:

```markdown
## Description — antes
<texto antigo>

## Description — depois
<texto novo>

## Trigger eval results
| Query | Esperado | Antes | Depois |
...
```

## Queries substantivas

Pedidos de um passo trivial ("lê este PDF") podem não triggerar skills mesmo com description perfeita — o modelo resolve directamente. Eval queries devem ser **substantivas** o suficiente para beneficiar de skill especializada.

## Integração com outras skills do projeto

Se a skill faz parte de um pipeline (ex.: `orquestrar` → `po-review`):

- should_not incluir pedidos que pertencem a fases anteriores
- should_trigger incluir invocações explícitas e implícitas da fase correcta
- Referenciar skills irmãs nas exclusões por **nome** e **caso de uso**
