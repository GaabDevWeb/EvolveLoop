# Policy Engine — risco, budget, topologia

**Âmbito:** `/evolve` (skill `orquestrar`).  
**Dono:** orquestrador raiz. Filhos **não** reclassificam a missão; podem **sinalizar** risco maior no handoff — o raiz reavalia e **reescreve** a policy no SSOT **antes** do próximo spawn.

**Quando corre:** **antes** de qualquer spawn PDA e **antes** da Fase 1 material (`/planejar` ou IR). Corre na entrada da missão e **de novo** se o âmbito mudar (ex.: hotfix a tocar ACL → reclassificar `sensitive`).

Isto **não** substitui GATE_BUNDLE, Wiki, image-to-code, **grill-me** nem o outer loop: **escolhe** o que essa missão **exige** e com que **orçamento/topologia**. Bundle e hard-gates continuam a herdar-se na árvore ([gate-bundle.md](gate-bundle.md), [knowledge-grounding-gate.md](knowledge-grounding-gate.md), [grill-me-gate.md](grill-me-gate.md), [outer-loop.md](outer-loop.md)).

---

## Algoritmo (raiz, obrigatório)

```text
1. Classificar risk_tier          (hotfix | standard | sensitive | audit)
2. Escolher topology              (pipeline | fan-out | debate | swarm-explore | supervisor-loop)
3. Preencher policy no SSOT       (risk_tier, topology, budget, require[])
4. Só então spawn PDA / Fase 1
```

Spawn **sem** policy no SSOT = **inválido** — equivalente a spawn sem GATE_BUNDLE: o filho recusa (`bloqueado: missing_policy`) ou o raiz **não** spawna.

---

## Risk tiers

Classificar pelo **maior** risco material do âmbito (não pelo tamanho do diff). Auth, pagamentos ou ACL **nunca** ficam `hotfix` nem `standard`.

| Tier | Quando | Grounding | Isolation | Gates / `require[]` |
|------|--------|-----------|-----------|---------------------|
| **hotfix** | Bug localizado, 1–poucos ficheiros, **sem** RF novo, **sem** auth/pagamentos/ACL | Domínio Gaab: **obrigatório** (`applied`). `skipped_trivial` **não** é hotfix — só pedido não-técnico. **Proibido** saltar wiki em domínio Gaab. Fase 0.5/PRD pode omitir-se (excepção já no SKILL), **wiki não**. | PDA estreita permitida (mesmo contexto se passo trivial). Policy **mesmo assim** no SSOT. | Mínimo: `tests` (ou substituto build/lint no `[RESULTADO]`). `security` / `po-review` só se o hotfix alterar comportamento de aceite ou superfície de ataque — senão **reclassificar**. |
| **standard** | Feature/refactor normal, sem superfície privilegiada | `knowledge_grounding` salvo `skipped_trivial` documentado | PDA normal; PO isolado na Fase 5 quando o gate corre | `tests` obrigatório. `security` se o DoD/superfície o pedir. `po-review` no fecho de feature (Fase 5). `image-to-code` se anexo. **`grill-me`** se Fase 0.5/PRD ou RF novo antes de `/planejar`. |
| **sensitive** | Auth, sessões, pagamentos, ACL, PII, secrets, autorização | **Sempre** `applied` — **proibido** `skipped_trivial` | Alta: `security` e `po-review` em spawns `role: gate` **dedicados**; PO isolado (não na sessão que implementou); exec **não** auto-aprova | **Obrigatório:** `knowledge_grounding`, `tests`, `security`, `po-review`. Sem estes quatro no `require[]` → **não spawn**. |
| **audit** | Revisão / threat-model / aceite adversarial **sem** implementar produto | Corpus Gaab se a auditoria for de domínio Gaab | Máxima: só `explore` / `gate`. **Proibido** `exec` de produto até reclassificar noutro tier | `security` obrigatório se o objecto for código/ameaça. `po-review` se o output for veredito de aceite. `tests` só se o audit **correr** testes (evidence). |

`image-to-code` **não** depende do tier: se houver imagem anexada, entra em `require[]` em **qualquer** tier ([image-attachment-gate.md](image-attachment-gate.md)).

`grill-me` é **condicional ao âmbito de design/planning** (não ao anexo de imagem): tipicamente Fase 0.5 com docs aprovados, RF novo em `standard`/`sensitive`, ou mudança significativa de escopo — ver [grill-me-gate.md](grill-me-gate.md). Hotfix sem RF / trivial / execução totalmente especificada → omitir ou `exempt` com evidência.

```text
policy hard gate (image-to-code, grill-me)  ≠  TS Execution Engine enforcement
```

Helpers testáveis (evals): `orchestrator/src/policy/evolveloop-skill-gates.ts`.

---

## Workflows adaptativos (estágios efectivos)

O `risk_tier` **não** é só um rótulo — implica um fluxo **diferente**. Alias: `fast` ≡ `hotfix` (typo, CSS, docs pequenas, refactor local).

| Workflow | Fluxo efectivo | Gates caros |
|----------|----------------|-------------|
| **FAST / HOTFIX** | `context → exec → test → done` | Sem critic/security/PO salvo reclassificação |
| **STANDARD** | `ground → plan → exec → test → document` | PO no fecho de feature |
| **SENSITIVE** | `ground → plan → exec → critic → test → security → document` | Critic + security + PO obrigatórios |
| **AUDIT** | `ground → explore → critic → security → evidence → report` | **Proibido** `exec` de produto |

**Regra:** classificar pelo risco **real**. Não usar workflow pesado só porque o EvolveLoop existe. Tipografia/CSS/docs isoladas → FAST. Auth/ACL/DB/APIs públicas → SENSITIVE.

Campo SSOT opcional (espelho do tier): `workflow_mode: fast | hotfix | standard | sensitive | audit`.

---

## Budget

Limites **qualitativos com tetos numéricos**. O raiz **documenta** os valores no SSOT; o utilizador pode subir um teto com ordem explícita. **Não** ultrapassar `max_spawn_depth` / `max_outer_cycles` já normativos.

| Campo | Significado | Default por tier (hotfix / standard / sensitive / audit) |
|-------|-------------|---------------------------------------------------------|
| `max_tokens` | Orçamento de contexto/exploração — qualitativo | `apertado` / `normal` / `gates-first` / `leitura` |
| `max_spawns` | Teto de spawns PDA nesta missão (raiz conta) | ver tabela abaixo |
| `max_wallclock` | Tempo de parede da missão | `45m` / `4h` / `6h` / `3h` |
| `max_spawn_depth` | Profundidade PDA | **3** (já em [pda-roles.md](pda-roles.md) / GATE_BUNDLE) |
| `max_outer_cycles` | Teto do outer loop | **5** (já em [outer-loop.md](outer-loop.md)) |

### max_spawns (teto numérico)

| `risk_tier` | `max_spawns` |
|-------------|--------------|
| `hotfix` | **4** |
| `standard` | **8** |
| `sensitive` | **12** |
| `audit` | **6** |

O raiz **copia** estes defaults para `budget.max_spawns` no SSOT e para `spawn-tree.json` (`max_spawns` + `spawn_count`). O utilizador pode subir um teto com ordem explícita.

**Leitura de `max_tokens`:**

| Valor | Operacional |
|-------|-------------|
| `apertado` | Sem swarm, sem debate; 1 exec + gates mínimos |
| `normal` | DAG completo; fan-out só com ramos independentes |
| `gates-first` | Privilegiar spawns `gate` (security/PO/tests); **não** gastar budget em fan-out cego |
| `leitura` | Explore/gates; zero patch de produto |

Esgotar `max_spawns` ou `max_wallclock` → Status `bloqueado` ou compactar a árvore (consolidar filhos); **proibido** novo spawn. Esgotar outer cycles → [outer-loop.md](outer-loop.md).

Se `pda_spawns >= budget.max_spawns` no SSOT: Status `bloqueado` **ou** compactar; **proibido** novo spawn.

---

## Engine default por risk_tier

Se `ORCHESTRATOR_ROOT` está definido **e** existe `memory/<feature_id>/plan.ir.yaml`:

| `risk_tier` | `run-engine` |
|-------------|--------------|
| `standard`, `sensitive` | **Obrigatório** tentar o comando em [SKILL.md](../SKILL.md) (Ponte Execution Engine). Não avançar como se o DAG tivesse corrido se o engine falhou. |
| `hotfix` | PDA-only permitido (engine opcional) |
| `audit` | Sem exec de produto; engine não é veículo de patch |

**Fallback** se engine down / `dist/` em falta / `src/jobs` ausente: PDA manual. Gravar `engine: fallback PDA` no SSOT. **Proibido** fingir `RunResult.success`.

---

## Routing de modelo

Qualidade relativa por papel — [model-routing.md](model-routing.md). Default `inherit`. Sem hardcode de slugs inventados.

---

## Require flags

Lista no SSOT: `require: [ … ]`. Cada flag **activa** o hard-gate / skill correspondente. Ausência na lista = o raiz **declara** que aquele gate **não** corre nesta missão — e isso tem de ser **legal no tier**.

| Flag | Activa | Condicional? |
|------|--------|--------------|
| `knowledge_grounding` | [knowledge-grounding-gate.md](knowledge-grounding-gate.md) | Não em domínio Gaab / técnico. Só omitir com `skipped_trivial` **e** tier que o permita (`hotfix`/`standard` não-Gaab ou pedido não-técnico). |
| `image-to-code` | [image-attachment-gate.md](image-attachment-gate.md) | **Se e só se** anexo de imagem. |
| `grill-me` | [grill-me-gate.md](grill-me-gate.md) | **Se** design/planning scope (Fase 0.5 / RF novo / scope change). Fail-closed antes de `/planejar`. |
| `tests` | gate `testing` (Fase 3) | Obrigatório em `hotfix`/`standard`/`sensitive`. Em `audit`, só se o audit executar testes. |
| `security` | gate `security-review` (Fase 4) | Obrigatório em `sensitive` e em `audit` de ameaça/código. |
| `po-review` | gate `po-acceptance` (Fase 5) | Obrigatório em `sensitive`. Em `standard`, no fecho de feature. Em `hotfix`, só se mudar aceite visível. |

**Mínimos inegociáveis:**

- `sensitive` → `knowledge_grounding` + `tests` + `security` + `po-review`
- anexo de imagem → `image-to-code` (qualquer tier)
- domínio Gaab técnico → `knowledge_grounding` (qualquer tier, **incluindo hotfix**)
- Fase 0.5 docs aprovados + transição a planner → `grill-me` (salvo exempt documentado / hotfix sem RF)

---

## Topologia

O raiz **escolhe uma**. Mudar de topologia = actualizar SSOT **antes** dos spawns seguintes.

| Topologia | Quando o raiz escolhe |
|-----------|------------------------|
| **pipeline** | Default. Dependências lineares (plan → exec → tests → …). `hotfix` quase sempre. `sensitive` prefere pipeline (gates em série, sem saltar). |
| **fan-out** | Ramos **independentes** após contrato (ex.: backend ∥ frontend). `standard` com API estável. **Não** em `hotfix` apertado; **não** como desculpa para paralelizar security/PO com exec incompleto. |
| **debate** | Duas hipóteses de arquitectura/RF em conflito — dois `plan`/`explore` com o **mesmo** GATE_BUNDLE; o raiz **escolhe** uma e grava no SSOT. Não é votação infinita; **um** round. |
| **swarm-explore** | Superfície desconhecida **antes** da Fase 1 (mapa de repo + wiki). Vários `explore` em paralelo, depth limitada. Depois **reentrar** pipeline/fan-out. `audit` pode ficar em swarm+gates. `sensitive`: swarm só para mapa de ameaça, depois pipeline. |
| **supervisor-loop** | Já em outer loop / reentrada (`partial` \| `plan_reset` \| `full_ground`): o raiz permanece supervisor, spawna só nós afectados, respeita `max_outer_cycles`. Típico após gate vermelho ou em `sensitive` com vários ciclos de gate. |

---

## SSOT fields

Obrigatórios em `[ESTADO ATUAL]` **antes** do primeiro spawn / Fase 1:

```text
risk_tier: hotfix | standard | sensitive | audit
topology: pipeline | fan-out | debate | swarm-explore | supervisor-loop
budget:
  max_tokens: apertado | normal | gates-first | leitura
  max_spawns: <int>
  max_wallclock: <duração>
  max_spawn_depth: 3
  max_outer_cycles: 5
require: [knowledge_grounding?, image-to-code?, tests?, security?, po-review?]
```

Persistir em `.agent_history.md` na entrada da missão e em cada reclassificação.

---

## Proibições

- Spawn PDA ou Fase 1 material **sem** policy no SSOT
- `hotfix` a **saltar wiki/RAG** em domínio Gaab (PRD pode saltar; grounding **não**)
- `sensitive` **sem** `security` **e** `po-review` em `require[]` (faltando um dos dois → inválido)
- `sensitive` ou `audit` com `skipped_trivial` no grounding
- `audit` a **implementar** produto sem reclassificar (`standard` / `sensitive`)
- Subir `max_spawn_depth` acima de **3** ou `max_outer_cycles` acima de **5** sem ordem explícita do utilizador
- Spawnar com `pda_spawns >= budget.max_spawns`
- Filho a reescrever `risk_tier` / `topology` / `budget` / `require[]` por sua conta
- Fingir sucesso do engine quando o fallback PDA está activo

---

## Relação com o resto do contrato

| Documento | Fronteira |
|-----------|-----------|
| [gate-bundle.md](gate-bundle.md) | **Como** o spawn herda hard-gates. Policy **decide se** o spawn existe e com que `require[]`. |
| [pda-roles.md](pda-roles.md) | Papéis `plan\|exec\|gate\|explore\|critic\|librarian`. Policy **não** inventa papéis. |
| [outer-loop.md](outer-loop.md) | Reentrada e teto 5. Policy escolhe `supervisor-loop` quando o outer loop já está activo. |
| [model-routing.md](model-routing.md) | Qualidade relativa do filho (`inherit` default). Policy decide **se** spawnar. |
| [knowledge-grounding-gate.md](knowledge-grounding-gate.md) | Mecânica do retrieve. Policy **obriga** o flag; não descreve o retrieve. |
| [specs/execution-policies.md](specs/execution-policies.md) | Policies do **engine** (`high-reliability`, retries YAML). Policy Engine do **raiz** é anterior e mais grosso (tier/topologia/budget de missão). |
