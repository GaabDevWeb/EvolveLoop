---
name: prd
description: >
  Product/Requirements upstream: produz pacote documental (PRD, API_SPEC,
  ARCHITECTURE, DATA-MODEL, CONTRIBUTING + ADR draft quando aplicável) em docs/
  antes de qualquer código. Use quando invocar /prd, criar PRD, especificação de
  produto, requisitos de negócio, documentação formal de feature, ou o EvolveLoop
  precisar de artefactos upstream aprovados. HARD-GATE: sem pacote aprovado não
  avança para planner. Complementa brainstorming (diálogo) com docs estruturados.
  Não use para implementar código (backend/frontend), planear tarefas (planner),
  nem decisões arquitecturais isoladas de alto impacto (use /adr ou Architect).
  Não use brainstorming exploratório sem entrega documental
  (use ~/.agents/skills/brainstorming).
metadata:
  version: "1.1.0"
  status: stable
  capability: business-requirements
  type: upstream
  command: prd
  pda_roles: [plan]
  non_responsibilities:
    - implementation
    - architectural-decision-authority
    - task-planning
disable-model-invocation: true
---

# PRD — Product / Requirements (upstream)

Provider da capability **`business-requirements`** (tipo **upstream**) no EvolveLoop.
Papel: **Product/Requirements** — define *o quê* e *para quem*, não *como implementar*.

**Contrato ascendente:** Fase 0.5 (`.cursor/skills/orquestrar/SKILL.md`). Saída alimenta o **planner**.

**HARD-GATE:** o orquestrador **não avança** para `/planejar` sem pacote **aprovado** pelo utilizador (ou "aprovar docs e continuar").

## DO

- Capturar intenção de produto: feature slug, outcome, stakeholders/utilizadores, restrições conhecidas
- Produzir pacote documental no modo adequado (`full-package` | `update-spec` | `delta-only`)
- Numerar RF/RNF e critérios de aceite; declarar fora de escopo
- Cross-check de consistência PRD ↔ API_SPEC ↔ DATA-MODEL ↔ ARCHITECTURE
- Emitir HARD-GATE de aprovação humana antes de planner ou código
- Marcar **SUPOSIÇÃO** com plano de validação quando faltar evidência
- Handoff estruturado `[ENTREGA CONSOLIDADA]` para planner após aprovação
- Usar **Relevant Context** (ver abaixo) — não dumping do repo

## DO NOT

- **Implementar** código, schemas de produção, migrations, UI, ou invocar `backend` / `frontend-pro` / `database` como executor
- **Decisões arquitecturais sozinho** — se o pedido for só ADR/stack/padrão técnico, ou decisão irreversível sem dono de produto: **handoff** para `/adr` (capability `architecture-decision`) ou **Architect** quando existir; no pacote completo, ADR fica como *draft/proposed* product-driven, não autoridade final de arquitectura
- Produzir grafo de tarefas / planos de implementação (isso é `planner`)
- Substituir diálogo exploratório de `brainstorming` sem formalizar docs
- Avançar past o gate humano sem aprovação explícita
- Inventar stack/endpoints sem marcar SUPOSIÇÃO
- Auto-conceder autoridade de Policy Engine / saltar isolation de gates

## Capability scope

| Classe | Capabilities / ferramentas |
|--------|----------------------------|
| **required** | `business-requirements` (esta); leitura de `docs/` e configs de stack já confirmados |
| **optional** | `filesystem.read` / `filesystem.search` / `project.inspect` / `git.inspect` / `knowledge.search` — só para grounding de docs existentes |
| **forbidden** | `backend-implementation`, `frontend-ui`, `database-schema`, `devops-deploy`, `planning` (como executor), `testing`, `security-review`, `po-acceptance`; autoridade final de `architecture-decision` quando o pedido é ADR-only |

Listar capability ≠ autorização — Policy Engine continua a mediar.

## Relevant Context > Maximum Context

**Obrigatório (pedir se faltar — máx. 3 perguntas):**

- Nome/slug da feature + outcome em uma frase
- Utilizadores-alvo ou stakeholder
- Restrições conhecidas (compliance, prazo, stack **já confirmada**)

**Opcional (incluir só se existir e for relevante):**

- Notas de brainstorming / design aprovado
- `docs/` existentes da mesma feature (PRD/ADR/API_SPEC)
- README / package manifests **apenas** secções de stack
- `.agent_history.md` se referenciar estado docs

**Excluir (maximum context — não carregar por defeito):**

- Árvore completa de `src/`, histórico git longo, issues/PRs não relacionados
- Código de implementação «para inspiração»
- Wiki/RAG genérico sem query focada na feature

## Fronteira com irmãs

| Skill / papel | Relação |
|---------------|---------|
| `brainstorming` (global) | Diálogo exploratório — proíbe código; **prd** formaliza |
| **`prd`** | Docs de produto/requisitos + pacote upstream |
| `/adr` / Architect | Autoridade de decisão arquitectural; prd faz handoff ou ADR *proposed* |
| `planner` | Consome pacote aprovado — não duplicar |
| `backend` / `frontend-pro` / `database` | Só após docs + planeamento — fora de escopo |

**Fluxo:** `brainstorming?` → **`prd`** → **`grill-me`** (HARD-GATE condicional — [grill-me-gate.md](../orquestrar/references/grill-me-gate.md)) → `planner` → construção.

---

## Pacote documental obrigatório

Templates em [templates/](templates/).

| Artefacto | Path | Template |
|-----------|------|----------|
| PRD | `docs/prd/YYYY-MM-DD-<feature-slug>.md` | [templates/PRD.md](templates/PRD.md) |
| CONTRIBUTING | `docs/CONTRIBUTING.md` (ou raiz se convenção do repo) | [templates/CONTRIBUTING.md](templates/CONTRIBUTING.md) |
| ADR | `docs/adr/NNNN-<titulo-slug>.md` | [templates/ADR.md](templates/ADR.md) — status `proposed` se autoridade arquitectural pendente |
| API_SPEC | `docs/API_SPEC.md` | [templates/API_SPEC.md](templates/API_SPEC.md) |
| ARCHITECTURE | `docs/ARCHITECTURE.md` | [templates/ARCHITECTURE.md](templates/ARCHITECTURE.md) — visão product-driven; decisões irreversíveis → `/adr` |
| DATA-MODEL | `docs/DATA-MODEL.md` | [templates/DATA-MODEL.md](templates/DATA-MODEL.md) |

**Modo `adr-only`:** pedido **só** decisão arquitectural → **não** executar pacote completo; handoff `.cursor/skills/adr/SKILL.md`.

Checklist: [references/doc-package-checklist.md](references/doc-package-checklist.md).

---

## Fluxo de trabalho (obrigatório)

```
Capturar intenção → Verificar repo/docs existentes → Recolher requisitos (máx. 3 perguntas)
→ Redigir pacote (templates) → Cross-check → Gate aprovação → Handoff planner
```

### 1. Capturar intenção

- Nome da feature (slug kebab-case)
- Outcome em uma frase
- Stakeholders / utilizadores-alvo
- Restrições conhecidas (stack, prazo, compliance)

### 2. Verificar existência

Antes de escrever, **ler** (relevant only):

- `docs/` da feature / ADRs relacionados
- Stack confirmada (package.json, etc. — não inventar)
- `.agent_history.md` se existir

**Proibido** inventar stack ou endpoints sem **SUPOSIÇÃO** + plano de validação.

### 3. Redigir pacote

- Preencher secções obrigatórias dos templates
- PRD: RF, RNF, aceite, fora de escopo
- ADR: *proposed* se decisão de alto impacto ainda sem `/adr` aceite
- API_SPEC / ARCHITECTURE / DATA-MODEL / CONTRIBUTING alinhados

### 4. Cross-check de consistência

| Verificação | O quê |
|-------------|-------|
| PRD ↔ API_SPEC | Cada RF tem endpoint ou evento correspondente |
| API_SPEC ↔ DATA-MODEL | Campos expostos existem no modelo |
| ARCHITECTURE ↔ ADR | Decisões reflectidas; gaps → handoff `/adr` |
| Nomenclatura | Mesmos nomes de entidades/campos em todos os docs |

### 5. Gate de aprovação (HARD-GATE)

**Parar** e apresentar:

```text
[PACOTE DOCS — AGUARDA APROVAÇÃO]
Artefactos criados: (lista paths)
Decisões-chave: (3–5 bullets)
Suposições pendentes: (lista)
Handoffs arquitectura: (paths ADR proposed → /adr se aplicável)
Próximo passo após OK: /planejar (planner consome estes docs)
```

**Proibido** iniciar implementação ou invocar planner com pacote incompleto.

Só avançar com: "aprovar", "OK docs", "continuar para planner", ou equivalente explícito.

### 6. Handoff para planner

```text
[ENTREGA CONSOLIDADA]
Paths: docs/prd/..., docs/adr/..., docs/API_SPEC.md, docs/ARCHITECTURE.md, docs/DATA-MODEL.md, docs/CONTRIBUTING.md
Inputs planner: PRD + ARCHITECTURE + DATA-MODEL + API_SPEC
Architecture follow-up: /adr | none
[ENCERRAMENTO] concluído
```

---

## Modos

| Modo | Quando | Output |
|------|--------|--------|
| `full-package` (default) | Feature nova | 6 artefactos |
| `update-spec` | Alteração mid-cycle | Actualizar PRD + docs afectados; ADR novo se irreversível → preferir `/adr` para autoridade |
| `delta-only` | Extensão pequena | Delta no PRD + patch API_SPEC/DATA-MODEL |

---

## Failure / degradation

| Classe | Se… | Então… |
|--------|-----|--------|
| `context_failure` | Falta slug/outcome | Máx. 3 perguntas; não inventar feature |
| `knowledge_failure` | Docs/wiki indisponíveis | Degradar com SUPOSIÇÃO explícita; não fingir grounding |
| `capability_failure` | Contract/provider em falta | Reportar GAP; não inventar runtime |
| `policy_denial` | Policy bloqueia | Respeitar; não bypass |
| `agent_failure` | Pedido = só arquitectura ou só código | Handoff `/adr` ou recusar implementação |
| `validation_failure` | Cross-check falha | Corrigir docs antes do gate |

---

## Policy

Esta skill **não** auto-concede autoridade. Gates humanos e Policy Engine / isolation permanecem externos. Listar `filesystem.*` opcional não autoriza escrita fora de `docs/` do pacote.

---

## Referências

| Ficheiro | Quando ler |
|----------|------------|
| [references/doc-package-checklist.md](references/doc-package-checklist.md) | Antes de declarar pacote completo |
| [references/brainstorming-handoff.md](references/brainstorming-handoff.md) | Após sessão brainstorming |
| [references/gate-criteria.md](references/gate-criteria.md) | Validar HARD-GATE |
| Contract | `orchestrator/contracts/business-requirements.yaml` |
