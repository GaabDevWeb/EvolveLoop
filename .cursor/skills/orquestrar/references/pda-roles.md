# PDA Roles — plan / exec / gate / explore / critic / librarian

**Âmbito:** papéis tipados no spawn MegaBrain. O **raiz** não é um destes papéis — é o orquestrador (SSOT, Matriz, outer loop, spawns).

Todo filho declara `role` no `GATE_BUNDLE`. Mudar de papel = **novo spawn** (ou voltar ao raiz).

---

## Matriz de papéis

| Role | Capabilities típicas | Pode | Não pode |
|------|---------------------|------|----------|
| **plan** | `planning`, prd/adr assist | Produzir/actualizar plano, IR, DoD, riscos; ler wiki/RAG | Editar código de produto; fechar gates de aceite; declarar `continuar` global |
| **exec** | `backend-implementation`, `frontend-ui`, `database-schema`, `devops-deploy` | Implementar no âmbito do Briefing; spawnar **explore** (se depth permitir); registar wiki pós-edit **ou** handoff ao **librarian** | Auto-aprovar testing/PO/security; replanejar missão global; inventar contratos fora do GATE_BUNDLE |
| **gate** | `testing`, `security-review`, `po-acceptance`, `frontend-visual-review`, `documentation`* | Correr verificação; emitir veredito + evidence; recomendar `corrigir`/`replanejar` ao raiz | “Corrigir a olho” código de produto sem DECISÃO do raiz; esconder falhas |
| **explore** | discovery / mapa (sem capability formal — worker leve) | Mapear estrutura, ler wiki/RAG, citar paths, GAPs; Briefing para o pai | Patch largo; merge; fechar feature; saltar hard-gates |
| **critic** | adversarial review (sem capability formal; **não** é `testing`) | Procurar falhas de contrato wiki, edge cases, regressões; emitir findings | Merge/patch largo de produto; declarar `continuar` global; substituir o gate `testing` |
| **librarian** | conhecimento canónico (vault + RAG; `wiki-mem` só como fonte episódica) | Promover promote-queue → `{Projeto}/log.md` ± `wiki/`; recusar poluir `raw/`; alinhar GAPs com SSOT | Implementar features; tratar `LATEST.md` como contrato |

\* `documentation` na Fase 6 age como **gate** de entrega documental; se precisar de código, o raiz spawna **exec**. O **librarian** não substitui este gate — trata o vault canónico.

---

## Contrato — critic

**Postura:** adversarial. Procura motivos para falhar o incremento; não “passa a olho”. Independente do **exec** — spawn típico pelo **raiz**, não como filho do exec.

**Pode:**

- Procurar falhas de contrato wiki vs código, edge cases e regressões óbvias
- Emitir findings (severidade + path + evidência)
- Recomendar `corrigir` / `replanejar` ao raiz (não decide a Matriz)

**Não pode:**

- Merge ou patch largo de produto
- Declarar `continuar` global
- Substituir o gate `testing` (Fase 3) nem emitir veredito de aceite PO / security

**Quando:** após `[ENTREGA CONSOLIDADA]` do **exec**, **antes** do gate `testing` oficial.  
Obrigatório quando `risk_tier=sensitive`. Opcional nos restantes casos.

**Evidence:** `findings.json` e/ou secção **Findings** em `[ENTREGA CONSOLIDADA]`. Sem achados = lista vazia explícita (`no_findings`), não silêncio nem «parece correto».

### Contrato adversarial (obrigatório)

Dado implementação X, o critic **tenta refutar** correctness:

1. Disprove correctness face aos contratos wiki/IR
2. Edge cases
3. Regressões
4. Comparar implementação com contratos
5. Problemas de segurança óbvios
6. Testes em falta
7. Assumptions não documentadas
8. Inconsistências com conhecimento canónico (wiki > episódico)

**Output estruturado** (`memory/<feature_id>/evidence/findings.json` ou equivalente):

```yaml
verdict: fail | pass | no_findings
findings: []   # cada item: severity, path, claim, evidence
severity: []
evidence: []   # paths
recommended_action: continuar | corrigir | replanejar
```

- `verdict: pass` com findings não-vazios = **inválido**
- Sem problemas reais → `verdict: no_findings` (não inventar findings para parecer útil)

---

## Contrato — librarian

**Postura:** dono do conhecimento **canónico**. SSOT de domínio = vault `{Projeto}/log.md` ± `wiki/`. Memória episódica (`wiki-mem`, `.ai/sessions/LATEST.md`, `promote-queue.md`) é **fonte**, não contrato.

**Pode:**

- Promover itens de `promote-queue` → `{Projeto}/log.md` ± páginas `wiki/`
- Recusar poluir `raw/` (imutável)
- Alinhar GAPs do briefing/SSOT com o que a wiki realmente contém
- Usar skill `wiki-mem` só como fonte episódica; grounding canónico via `wiki` / RAG

**Não pode:**

- Implementar features / patch de produto
- Tratar `LATEST.md` como contrato ou Fontes do hard-gate
- Substituir o gate `documentation` (Fase 6) nem o HARD-GATE de grounding (Fase 0)
- Reescrever `raw/`

**Quando:** após edits de código (`wiki_register`), fim de ciclo, ou pedido `promote`.

**Fecho (hook vs papel):** o hook `stop`/`sessionEnd` (`wiki-mem`) **só enfileira** `.ai/sessions/promote-queue.md` quando há `promote_candidates` ou edits de código. **Não** escreve `{Projeto}/wiki/` nem `raw/`. O spawn `librarian` (ou o Agent) **promove** a fila para `{Projeto}/log.md` ± `wiki/`.

**Vault:** `/home/gaab/Documentos/karpathyWiki`. **NUNCA** `raw/`.

---

## Raiz (orquestrador)

| Pode | Não pode (quando PDA obriga) |
|------|------------------------------|
| Manter SSOT, Matriz, outer loop | Simular todos os especialistas na mesma instância se critérios PDA se verificam |
| Emitir Briefing + GATE_BUNDLE | Omitir bundle |
| Integrar `[ENTREGA CONSOLIDADA]` | Aceitar entrega de filho que violou role/gates |
| Decidir `continuar\|corrigir\|replanejar\|bloqueado` | — |

**Preferência:** raiz **orquestra**; plan/exec/gate/explore/critic/librarian **produzem**. Excepção estreita PDA (passo trivial) permanece — registar uma linha.

---

## Mapeamento fase → role sugerido

| Fase MegaBrain | Role a spawnar |
|----------------|----------------|
| Fase 1 Planeamento | `plan` |
| Fase 2 Execução | `exec` (+ `explore` aninhado se precisar mapa); depois **`critic`** **antes** do gate testing (obrigatório se `risk_tier=sensitive`) |
| Fase 3 Auto-correção (diagnóstico profundo) | `explore` e/ou `exec` + depois `gate` testing |
| Fase 4 Segurança | `gate` |
| Fase 4b DevOps | `exec` (devops) |
| Fase 5 PO | `gate` |
| Fase 6 Docs | `gate` (documentation) + **`librarian`** no fecho wiki |
| Pós-exec / promote | `librarian` (`wiki_register`) |
| Fase 0 Grounding (se delegado) | `explore` com foco wiki/RAG |

---

## Sub-subagente (exemplo endpoint)

```text
raiz (depth 0)
  ├─ exec (depth 1) — “alterar POST /v1/…”
  │    └─ explore (depth 2) — “mapear rotas + contratos wiki”
  ├─ critic (depth 1) — adversarial; findings; ANTES de testing
  ├─ gate (depth 1) — testing (oficial)
  └─ librarian (depth 1) — promote-queue → log.md ± wiki/; NUNCA raw/
```

Explore devolve paths/contratos → exec patcha → **critic** emite findings → raiz corre `gate` testing → **librarian** no fecho wiki.

---

## Violações → acção do pai/raiz

| Violação | Acção |
|----------|--------|
| Filho sem GATE_BUNDLE | Rejeitar entrega; re-spawn |
| Explore fez patch largo | Reverter ou isolar; `corrigir`; reforçar Âmbito |
| Gate alterou código sem ordem | Invalidar veredito; `corrigir` via exec |
| `spawn_depth` excedido | `bloqueado: max_spawn_depth` no nó; raiz decide |
| Filho inventou API contra Contratos | GAP + `corrigir`/`replanejar`; full_ground se contratos falharam |
| Critic fez patch largo / merge | Reverter; `corrigir` via exec |
| Critic declarou `continuar` ou substituiu testing | Rejeitar; spawn `gate` testing |
| Librarian escreveu em `raw/` | Reverter; `corrigir` via librarian/raiz |
| Librarian implementou feature | Rejeitar; `corrigir` via exec |
| Librarian usou `LATEST.md` como contrato | GAP; não promover; grounding via wiki/RAG (`full_ground` se contratos falharam) |

---

## Telemetria SSOT (raiz)

Além do outer loop, manter:

| Campo | Significado |
|-------|-------------|
| `spawn_depth_max_seen` | Maior depth usado nesta missão |
| `active_role` | Role do filho em voo (`raiz` \| `plan` \| `exec` \| `gate` \| `explore` \| `critic` \| `librarian`) |
| `parent_cycle_id` | = `cycle_id` propagado aos filhos |
| `pda_spawns` | Contagem de spawns na missão (= `spawn_count` em `spawn-tree.json`). Se `pda_spawns >= max_spawns` → sem novo spawn. |
