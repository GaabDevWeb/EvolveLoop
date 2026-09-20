# Princípios Arquitecturais — EvolveLoop Runtime

**Versão:** 1.0.0 · **Pacote:** `contracts-v2.1.0`  
**Leitura:** ~3 minutos  
**Audiência:** qualquer contribuidor — técnico ou não

Este documento define **regras que nunca devem ser quebradas**. Não descreve implementação; descreve governança. Detalhe técnico vive em [contracts/](contracts/README.md).

---

## O que somos

O EvolveLoop é uma **plataforma de execução** — não um framework de prompts. Plataformas definem contratos, ciclo de vida, extensibilidade e governança. Frameworks organizam componentes.

---

## Dez regras invioláveis

### 1. Planner nunca escolhe Provider nem Executor

O Planner produz **o quê** (Task Graph / Capability IR). Quem executa e **como** executa é responsabilidade do Scheduler e do Registry — nunca do Planner.

### 2. Scheduler nunca modifica o IR

O Scheduler opera sobre o grafo carregado. Alterar dependências, nós ou contratos do IR é papel do Planner (via `replan`) — não do Scheduler.

### 3. Providers nunca comunicam directamente entre si

Toda coordenação passa pelo Runtime (Engine + Scheduler + Event Bus). Providers são ilhas; o grafo define ordem e dependências.

### 4. Gates nunca produzem código

Gates **validam** com evidência. Workers **produzem** artefactos. Misturar os dois papéis degrada a qualidade e remove auditabilidade.

### 5. Evidence é obrigatória para concluir qualquer nó

Inclui Planner, Scheduler, Registry, Workers, Gates e Executor. Sem evidence, não há transição para estado terminal de sucesso. O sistema inteiro deve ser observável.

### 6. Executor é substituível

O Runtime não conhece Cursor, Claude, Docker ou MCP como implementações concretas — apenas o contrato `ExecutorRuntime`. Trocar executor não exige alterar o núcleo.

### 7. Todo componente depende de contratos, nunca de implementações

Interfaces estáveis em [contracts/](contracts/README.md). Código, skills e CLIs são implementações descartáveis por detrás dessas interfaces.

### 8. Fases humanas são overlay — não motor de scheduling

As fases 0.5–6 (PRD, planejar, testes, PO, etc.) são marcos de SSOT para humanos e orquestrador. O motor de execução é sempre um **DAG de dependências**.

### 9. Quem implementa não aprova

Workers produzem; Gates julgam. O mesmo agente ou sessão não pode implementar e aceitar (PO, security profunda, QA visual) sem isolamento explícito.

### 10. Novo Provider = implementação + registo

Integrar um provider ou executor novo deve exigir **manifest + implementação** — sem alterar o núcleo do Runtime. Se for preciso mudar seis contratos para adicionar um executor, a arquitectura ficou pesada.

---

## Teste rápido antes de cada contribuição

| Pergunta | Resposta correcta |
|----------|-------------------|
| Estou a fazer o Planner escolher quem executa? | **Não** |
| Estou a fazer um Gate escrever código? | **Não** |
| Posso concluir sem evidence? | **Não** |
| Preciso alterar o Scheduler para um provider novo? | **Não** |

---

## Hierarquia documental

```
ARCHITECTURAL-PRINCIPLES.md   ← este ficheiro (governança)
        ↓
ecosystem-v2.md               ← PORQUÊ e componentes
        ↓
contracts/                    ← interfaces estáveis v2.1
        ↓
specs/                        ← detalhe implementável v2.0
```

---

## Referências

| Documento | Path |
|-----------|------|
| Pacote de contratos | [contracts/README.md](contracts/README.md) |
| Arquitectura v2 | [ecosystem-v2.md](ecosystem-v2.md) |
| Specs implementação | [specs/README.md](specs/README.md) |
