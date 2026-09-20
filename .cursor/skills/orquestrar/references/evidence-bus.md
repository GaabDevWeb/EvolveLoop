# Evidence Bus — artefactos verificáveis

**Âmbito:** `/MegaBrain` (skill `orquestrar`). Pasta canónica de prova por feature.

**Não duplica** o schema de nó: [specs/evidence.md](specs/evidence.md) · [contracts/evidence.md](contracts/evidence.md). Este ficheiro define **onde** os artefactos vivem, **quais** ficheiros o raiz e os gates lêem, e **quando** a Matriz pode `continuar`.

---

## 1. Princípio

Gates **consomem JSON no disco**, não prosa («o agente disse que passou»). Sem **ficheiro** do gate activo em `evidence_dir` com `verdict` + artefactos existentes → **proibido** `continuar`.

```
Provider / gate executa → grava JSON em evidence_dir → raiz lê o ficheiro → Matriz
```

Validação de campos (`status`, `verdict`, `checks`, `artifacts` existem) permanece nas specs. O bus é o **sítio canónico** e o contrato operacional do MegaBrain.

---

## 2. SSOT: `evidence_dir`

| Campo SSOT | Valor |
|------------|--------|
| `evidence_dir` | `memory/<feature_id>/evidence/` |

- **Repo de trabalho** (o mesmo onde corre o engine / PDA), **não** o vault wiki.
- Irmão do IR: `memory/<feature_id>/plan.ir.yaml` (se o planner o produziu — path do Execution Engine).
- Contextual por feature, alinhado a [specs/knowledge-memory.md](specs/knowledge-memory.md) (`memory/<feature_id>/`).

```
memory/<feature_id>/
├── plan.ir.yaml                 # se houver — IR; o motor lê daqui
└── evidence/                    # ← evidence_dir (este bus)
    ├── grounding.json
    ├── gate.testing.json
    ├── gate.security.json
    ├── gate.po.json
    ├── gate.grill-me.json
    ├── spawn-tree.json
    └── policy.json
```

Nomes de gate no disco ↔ capabilities nas specs:

| Ficheiro | Capability (`metadata.capability` / `last_gate`) |
|----------|--------------------------------------------------|
| `gate.testing.json` | `testing` |
| `gate.security.json` | `security-review` |
| `gate.po.json` | `po-acceptance` |
| `gate.grill-me.json` | `design-stress-test` (upstream HARD-GATE antes de planner) |

Node-level payloads das specs (`telemetry/evidence/<node_id>.json`, test-report, screenshots) **não** substituem estes ficheiros: o gate JSON **aponta** para eles em `artifacts[].path`.

---

## 3. Ficheiros mínimos

| Ficheiro | Quem escreve | Quem lê | Obrigatório |
|----------|--------------|---------|-------------|
| `plan.ir.yaml` | `plan` (planner) | engine / raiz | se Fase 1 produziu IR |
| `grounding.json` | raiz (Fase 0) | toda a cadeia | sim (ou `skipped_trivial` documentado) |
| `gate.testing.json` | gate `testing` | raiz (Matriz, Fase 3) | quando o gate testing está **activo** |
| `gate.security.json` | gate `security` | raiz (Fase 4) | quando o gate security está **activo** |
| `gate.po.json` | gate `po-review` | raiz (Fase 5) | quando o gate PO está **activo** |
| `gate.grill-me.json` | `/grill-me` / raiz Fase 0.5 | raiz + planner (pré-Fase 1) | quando `grill-me` ∈ `require[]` |
| `spawn-tree.json` | raiz (a cada spawn/fecho PDA) | raiz / auditoria | sim após o primeiro spawn |
| `policy.json` | raiz (snapshot; **não** é o Policy Engine) | raiz / gates | sim — `policy_id` + `min_confidence` |

«Activo» = a fase corrente exige esse gate (Fase 3 → testing; Fase 4 → security; Fase 5 → PO). Gate ainda não corrido → ficheiro ausente é esperado; **depois** de corrido, ausência = falha de evidence.

Templates curtos: [templates/evidence/](templates/evidence/) (`gate.testing.json.example`, `gate.security.json.example`, `policy.json.example`, `spawn-tree.json.example`, `grounding.json.example`).

---

## 3b. Evidence proporcional ao risco

O Evidence Bus **permanece**. A burocracia **não**.

| Contexto | Evidence obrigatória |
|----------|----------------------|
| `sensitive` / `audit` / security / database / architecture / deployment | JSON forte no `evidence_dir` (gates + grounding + spawn-tree) |
| `standard` feature | `grounding.json` + gate activo da fase + artefacts reais dos testes |
| `hotfix` / `fast` (typo, CSS, docs, refactor local) | Derivada de **test result** + **lint** + **git diff** — **proibido** criar JSONs vazios só para “satisfazer” o gate |

Princípio: *Evidence deve provar algo que realmente importa.* Claims do agente sem artefactos ≠ evidence.

---

## 4. Campos mínimos — gate JSON

Alinhar nomes com [specs/evidence.md](specs/evidence.md) e [contracts/evidence.md](contracts/evidence.md). **Não** inventar sinónimos (`ok`, `passou`, `verde`).

Cada `gate.*.json` **deve** ter:

| Campo bus | Onde no schema v2 | Valores |
|-----------|-------------------|---------|
| `verdict` | `spec.verdict` / `payload.verdict` | `passed` \| `rejected` \| `conditional` |
| `confidence` | `spec.confidence` | número `0.0`–`1.0` (obrigatório no contrato v2.1) |
| `command` e/ou `artifacts[].path` | `checks[].command`, `test_summary.command`, `artifacts` | path(s) no repo; o comando que gerou a prova |
| `submitted_at` | `metadata.submitted_at` | ISO-8601 |
| `cycle_id` | `metadata.cycle_id` (extensão MegaBrain) | mesmo `cycle_id` do SSOT (ex.: `C1`) |

Também exigidos pelas specs quando o nó fecha: `kind: Evidence`, `spec.status` (`complete` \| `partial` \| `failed`). Gate sem `verdict` → `gate_verdict_missing`. Artefacto referenciado que não existe no disco → `artifact_missing`.

`conditional` só com `status: partial` + `missing` / `known_gaps` documentados ([specs/evidence.md](specs/evidence.md) §6). O raiz decide se `continuar` com limitação.

---

## 5. Gate testing — gravar e ler

1. **Gravar:** o filho `role: gate` / capability `testing` escreve `evidence_dir/gate.testing.json` (não chega `[ENTREGA CONSOLIDADA]` em prosa).
2. **Prova:** `command` (ex. `pytest …`) + `artifacts` para o relatório (`telemetry/evidence/test-report.json` ou equivalente da skill testing). Os paths **existem** no repo.
3. **Ler:** o raiz **abre o JSON** antes da Matriz. `continuar` só se `verdict: passed` (ou `conditional` aceite) **e** `status: complete` (ou partial explícito) **e** artefactos presentes.
4. **Ciclo:** `cycle_id` = SSOT; re-run (`corrigir` / `attempt++`) **reescreve** o mesmo ficheiro ou acrescenta tentativa no JSON — **nunca** apaga a pasta para «limpar».
5. **Fora do bus:** falha que cite contrato wiki aponta `grounding.json` (Fontes/Contratos); **não** usar `.ai/sessions` como evidence do gate.

---

## 6. Wiki vs bus vs episódico

Três sítios, três funções. **Não misturar.**

| Sítio | Path | Função |
|-------|------|--------|
| **Evidence Bus** | `memory/<feature_id>/evidence/` no repo de trabalho | Prova auditável da feature (gates, grounding snapshot, spawn tree) |
| **Wiki canónica** | vault `{Projeto}/log.md` (± páginas `wiki/`) | Log de sessão/projecto; append após código — [knowledge-grounding-gate.md](knowledge-grounding-gate.md) |
| **Mem episódica** | `.ai/sessions/` (`LATEST.md`, skill `wiki-mem`) | Continuidade de chat; **não** é evidence canónica |

`grounding.json` **aponta** Fontes / Contratos / GAPs (paths do vault ou retrieve RAG) e o path do `log.md`. **Não** substitui o append no vault. **Não** copia transcripts de `.ai/sessions` para o bus.

---

## 7. `spawn-tree.json` e `policy.json`

`spawn-tree.json` — árvore PDA da feature. Campos obrigatórios para **contar** spawns:

| Campo | Significado |
|-------|-------------|
| `spawn_count` | Número de spawns PDA nesta missão (não inclui o raiz). **Igual** a `pda_spawns` no SSOT. |
| `max_spawns` | Teto copiado da Policy Engine |
| `root.children` | Nós spawnados (`role`, `spawn_depth`, `parent_cycle_id` / `cycle_id`, skill, path de evidence do filho) |

Actualizar a cada spawn e a cada `[ENCERRAMENTO]`. Depth máx. 3 ([pda-roles.md](pda-roles.md), [gate-bundle.md](gate-bundle.md)). Se `spawn_count >= max_spawns` → o raiz **não** spawna.

`policy.json` — **snapshot** em disco da policy activa (`policy_id` / `risk_tier`, `min_confidence`, `require[]`). Aponta [policy-engine.md](policy-engine.md) e [specs/execution-policies.md](specs/execution-policies.md). Este bus **grava** o snapshot; **não** redefine o Policy Engine.

---

## 8. Proibições

- Emitir **`continuar`** sem o **ficheiro** do **gate activo** em `evidence_dir` (e sem os paths em `artifacts` existirem).
- Tratar `[RESULTADO]` / chat como substituto do ficheiro.
- **Apagar** `evidence_dir` (ou ficheiros de gate) para «limpar» erros — append / overwrite com novo `submitted_at` + `attempt` / `cycle_id`.
- Gravar evidence no vault wiki ou em `.ai/sessions/` como se fosse o bus.
- Inventar `verdict` sem `command` / artefactos (teatro).
- Usar valores fora do vocabulário das specs (`ok`, `PASS`, `true`).

---

## 9. Relação com o runtime

`NodeCompleted.evidence_ref` nas specs pode apontar `telemetry/evidence/<node_id>.json`. O MegaBrain **adicionalmente** exige o ficheiro de gate em `evidence_dir` para a Matriz e o outer loop (`last_gate` ↔ nome do ficheiro).

Se o Execution Engine estiver activo (`ORCHESTRATOR_ROOT`), ingerir `RunResult.evidence[]` **para** `evidence_dir` (não só para o SSOT volátil). Gate evidence no engine **exige** `artifacts[].path` (`artifact_path_missing` se vazio) — `src/evidence/builders.ts`. `run-jobs complete --success` exige `--evidence` com path existente.

## 10. GAP — engine vs PDA

O validator/gate **existe** (`validateEvidence` / `validateEvidenceV21`). Neste checkout `src/jobs/` está ausente e `dist/` não está compilado — `run-engine` / `run-jobs` **não** são executáveis aqui.

Se o engine estiver down: **fallback PDA**. SSOT: `engine: fallback PDA`. **Proibido** fingir `RunResult.success`.
