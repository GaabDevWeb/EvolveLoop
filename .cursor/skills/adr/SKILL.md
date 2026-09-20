---
name: adr
description: >
  Architecture Decision Record: documenta decisões irreversíveis ou de alto impacto
  em docs/adr/NNNN-titulo.md. Use quando invocar /adr, registar decisão arquitectural,
  escolher stack, padrão ou trade-off técnico mid-cycle, ou complementar pacote prd
  com ADR isolado. Modification formal local — não substitui pacote completo (use /prd)
  nem análise estrutural ampla (use /architect). Não use para requisitos de negócio (prd),
  desenho de sistema (architect), plano de tarefas (planner), implementação (backend),
  nem brainstorming.
metadata:
  version: 1.0.1
  status: stable
  capability: architecture-decision
  type: upstream
  command: adr
  pda_roles: [plan]
disable-model-invocation: true
---

# ADR — Architecture Decision Record

Provider da capability **`architecture-decision`** (tipo **upstream**) no EvolveLoop. Produz **um ADR numerado** por decisão em `docs/adr/NNNN-<titulo-slug>.md`.

**Fronteira com prd:** o pacote `/prd` inclui ADR(s) inicial(is). Use **`/adr`** para decisões **durante** ou **após** implementação, ou quando só falta documentar a decisão.

**Fronteira com architect:** `/architect` analisa opções e estrutura; **`/adr`** formaliza **uma** decisão já (ou quase) fechada. Não expandir este agente para review arquitectural completo.

Template: [templates/ADR.md](templates/ADR.md) (idêntico ao de prd).

---

## DO

- Redigir um ADR numerado com contexto, decisão, ≥2 alternativas, consequências
- Numerar correctamente em `docs/adr/`
- Referenciar em `docs/ARCHITECTURE.md` se existir (sem reescrever o doc)
- Gate humano em mudanças de alto impacto

## DO NOT

- Análise estrutural ampla / redesign de camadas (→ `/architect`)
- Pacote PRD/API/DATA-MODEL completo (→ `/prd`)
- Grafo de execução / Briefings PDA (→ `/planejar`)
- Implementar código

---

## Fluxo

```
Identificar decisão → Ler ADRs existentes → Determinar NNNN → Redigir ADR
→ Cross-check ARCHITECTURE → Gate aprovação (se impacto alto) → Handoff
```

### 1. Numerar

- Listar `docs/adr/*.md`
- Próximo número = max(NNNN) + 1, zero-padded 4 dígitos (0001, 0002…)

### 2. Conteúdo obrigatório

| Secção | Conteúdo |
|--------|----------|
| Contexto | Problema, constraints, forças |
| Decisão | Declaração clara — voz activa |
| Alternativas | ≥2 opções rejeitadas com prós/contras |
| Consequências | Positivas e negativas |

### 3. Status

| Status | Quando |
|--------|--------|
| `proposed` | Aguarda revisão |
| `accepted` | Decisão fechada |
| `deprecated` | Substituída — referenciar ADR sucessora |
| `superseded by ADR-NNNN` | Link explícito |

### 4. Actualizar ARCHITECTURE (se existir)

Se `docs/ARCHITECTURE.md` existir, adicionar referência na tabela de decisões — **não** reescrever doc inteiro.

### 5. Gate (decisões de alto impacto)

Mudança de stack, SGBD, auth, deploy → apresentar sumário e **aguardar OK** antes de implementar dependente.

---

## Output

```text
[ENTREGA CONSOLIDADA]
ADR: docs/adr/NNNN-<titulo>.md
Status: proposed | accepted
ARCHITECTURE actualizado: sim | não aplicável
[ENCERRAMENTO] concluído
```

---

## Referências

| Ficheiro | Quando |
|----------|--------|
| [references/adr-criteria.md](references/adr-criteria.md) | Decidir se merece ADR |
| [templates/ADR.md](templates/ADR.md) | Estrutura |
