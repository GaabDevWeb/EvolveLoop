---
name: testing
description: >
  Gate de validação técnica (capability testing): detecta runner de testes no repo,
  executa suite scoped ao brief, analisa falhas, aplica correcções mínimas in-scope,
  re-executa e emite veredito VERDE|VERMELHO|SUBSTITUTO com evidence JSON para o
  Execution Engine. Use quando o orquestrador invocar /testes, Fase 3, após
  implementação backend/frontend, reproduzir falha de CI, validar DoD técnico antes
  de security ou PO, ou pedir correr testes com relatório estruturado. Produz
  test-report + telemetry/evidence/*.json. Não use para aceite de produto (po-review),
  auditoria de segurança (security), implementar features (backend/frontend), nem
  planeamento (planner). Não emita OK de release — isso é Fase 5. Não é Code Reviewer
  nem Validator (`validator`). Code Reviewer ≠ este gate.
metadata:
  version: 1.2.0
  status: stable
  capability: testing
  type: gate
  command: testes
  pda_roles: [gate]
disable-model-invocation: true
---

# Testing — Gate de validação técnica (Tester)

Provider da capability **`testing`** (tipo **gate**) no Orquestrador v2. Valida artefactos — **não** implementa features novas fora do scope de correcção de teste.

**Contrato ascendente:** Fase 3 do `orquestrar`. Saída alimenta Scheduler → `GatePassed` | `GateRejected` via [evidence schema](references/evidence-schema.md).

**Execution Engine:** ver `orchestrator/` e [specs/runtime.md](../orquestrar/references/specs/runtime.md).

**PDA:** `gate` — isolamento recomendado face a workers de execução.

## DO / DO NOT

**DO**

- Detectar runner, executar suite **scoped** ao brief/DoD
- Emitir VERDE | VERMELHO | SUBSTITUTO com Boot sequence + evidence JSON
- Corrigir falhas **in-scope** (máx. 3 ciclos) e re-executar
- Redirecionar aceite de produto → `po-review`; security → `security`

**DO NOT**

- Emitir OK de release / aceite PO (Fase 5)
- Expandir scope para módulos fora do brief
- Substituir threat modeling (`security`), review de estilo (`code-reviewer`) ou checklist DoD formal (`validator`)
- Auto-conceder autoridade: Policy Engine / isolation mediam execução

## Capability scope

| Nível | Capabilities / tools |
|-------|----------------------|
| **required** | `testing` (esta); Shell para runners; leitura de manifests |
| **optional** | `filesystem.*` / `shell.execute` se discovery os agendar; lint/build como SUBSTITUTO |
| **forbidden** | `po-acceptance`, `security-review`, `documentation`; mutação de produto fora do fix de teste |

## Failure / degradation

| Classe | Se… | Então… |
|--------|-----|--------|
| `context_failure` | brief/paths ausentes | pedir scope; não inventar suite |
| `capability_failure` | sem runner nem build/lint | SUBSTITUTO impossível → VERMELHO + `replanejar` |
| `provider_failure` | comando de teste crasha no ambiente | documentar exit/stderr; VERMELHO |
| `policy_denial` | policy/isolation bloqueia shell | respeitar; não bypass |
| `validation_failure` | evidence JSON inválido | não emitir VERDE |

---

## HARD-GATE — Imagem anexada

Se o utilizador anexar imagem de referência UI: **não** corrigir CSS/HTML inline para “parecer” o mockup. Escalar ao orquestrador / `frontend-pro` com `~/.agents/skills/image-to-code/SKILL.md` — ver [../orquestrar/references/image-attachment-gate.md](../orquestrar/references/image-attachment-gate.md). Testing valida; **não** substitui image-to-code.

---

## Papel no pipeline (Workers vs Gates)

| Tipo | Exemplos | Testing |
|------|----------|---------|
| Worker | backend, frontend-pro | ✗ |
| Gate | testing, security, po-review | ✓ — **valida** com veredito |

---

## Boot sequence (obrigatória)

Executar **antes** de qualquer veredito. Documentar na secção **Boot sequence** do relatório:

| # | Passo | Referência |
|---|-------|------------|
| 1 | Detectar verificadores | [references/detection.md](references/detection.md) |
| 2 | Definir scope (paths do brief / DoD) | Briefing Relâmpago |
| 3 | Escolher comando scoped | Tabela detection |
| 4 | Executar e capturar exit code + output | Shell |
| 5 | Mapear veredito → evidence JSON | [references/evidence-schema.md](references/evidence-schema.md) |

**Proibido** emitir veredito sem secção Boot sequence preenchida.

---

## Vereditos

| Veredito | Significado | DECISÃO orquestrador |
|----------|-------------|----------------------|
| **VERDE** | Suite scoped verde ou DoD provado | `continuar` |
| **VERMELHO** | Falha no scope; correcção esgotada ou bloqueio | `corrigir` ou `replanejar` |
| **SUBSTITUTO** | Sem testes; build/lint/checklist substituto | `continuar` com risco documentado |

---

## Fluxo

```
Boot sequence → Executar scoped → VERDE?
    → sim: test-report + evidence JSON → handoff
    → não: Análise → Fix in-scope (max 3) → Re-executar → handoff
```

Detalhe correcção: [references/correction-loop.md](references/correction-loop.md)

---

## Fronteiras (skills irmãs)

| Pedido | Skill correcta |
|--------|----------------|
| «Está pronto para release?» / aceite PO | `po-review` — Fase 5 |
| Auditar OWASP, secrets | `security` — Fase 4 |
| Revisar PR/diff / smells | `code-reviewer` |
| Checklist DoD vs evidence no disco | `validator` |
| Implementar feature | `backend` / `frontend-pro` |
| Planear ordem de tarefas | `planner` |

Se o utilizador pedir aceite final → **recusar** como testing; redirecionar `po-review` com lista do que falta validar tecnicamente.

---

## Formato de saída (obrigatório)

1. Preencher [templates/test-report.md](templates/test-report.md) — **todas** as secções aplicáveis
2. Gerar evidence JSON em `telemetry/evidence/<node_id>.json`
3. Se sub-agente PDA: encerrar com `[ENTREGA CONSOLIDADA]` + `[ENCERRAMENTO]`

### [ENTREGA CONSOLIDADA] — campos mínimos

- Stack detectada + comando + exit code
- Veredito (VERDE|VERMELHO|SUBSTITUTO)
- Path do evidence JSON
- DECISÃO sugerida (`continuar` | `corrigir` | `replanejar`)
- Correcções aplicadas (se houver)

### [ENCERRAMENTO]

`concluído | bloqueado` + uma linha de motivo.

---

## Provider manifest

Sidecar: [provider.yaml](provider.yaml) — registo no Capability Registry.

---

## Recursos

| Ficheiro | Quando ler |
|----------|------------|
| [references/detection.md](references/detection.md) | Boot passo 1 |
| [references/correction-loop.md](references/correction-loop.md) | Falhas VERMELHO |
| [references/evidence-schema.md](references/evidence-schema.md) | Antes do handoff |
| [templates/test-report.md](templates/test-report.md) | Formato de saída |
