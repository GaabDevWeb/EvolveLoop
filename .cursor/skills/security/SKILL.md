---
name: security
description: >
  Orquestrador plugin-based de revisão de segurança: capability registry, modos
  fast/standard/deep, red/blue/judge, memória entre auditorias, evidence L0-L4,
  attack chains, threat coverage, MITRE/CWE/OWASP, security debt, SARIF/JSON.
  Use para gate Fase 4 (/seguranca), threat modeling, hardening, security score,
  regressões de segurança ou validação pré-release. Não substitui pentest certificado.
  Não use para planeamento (planner), aceite PO (po-review), suite de testes
  (testing), nem code review de estilo/arquitectura (Code Reviewer — Wave C3).
metadata:
  version: 2.1.1
  status: stable
  capability: security-review
  type: gate
  command: seguranca
  pda_roles: [gate, critic]
  eval_iteration: 5
disable-model-invocation: true
---

# Security — Orquestrador (Framework v2.1)

Gate **Fase 4**. Você **não lista especialistas** — consulta [capability-registry.yaml](capability-registry.yaml).

**Contrato:** [output-contract.md](references/output-contract.md) | **CI:** [ci-artifacts.md](references/ci-artifacts.md) | **Safety:** [framework-safety.md](references/framework-safety.md)

**PDA:** `gate` + `critic` — veto de release; não implementa produto.

## DO / DO NOT

**DO**

- Consultar registry → executar providers no modo (fast|standard|deep)
- Emitir veredito binário + Score + Verdict Trace + debt + JSON/SARIF
- Bloquear só após judge: crítica/alta + Confirmado/Muito provável + L≥2
- Relatório primeiro; hardening só com pedido explícito

**DO NOT**

- Aceite de produto / UAT (`po-review`)
- Correr suite de testes como gate técnico (`testing`)
- Code review de estilo/arquitectura sem foco de ameaça (Code Reviewer — Wave C3)
- Inventar findings sem evidence level; bypass Policy Engine / confirmações safety
- Substituir pentest certificado ou compliance legal

## Capability scope

| Nível | Capabilities / tools |
|-------|----------------------|
| **required** | `security-review`; registry local + specialists |
| **optional** | Semgrep/CodeQL/Gitleaks quando disponíveis; `filesystem.*` / `shell.execute` sob policy |
| **forbidden** | `po-acceptance`, `testing` como substituto; mutação de produto sem pedido de hardening |

## Failure / degradation

| Classe | Se… | Então… |
|--------|-----|--------|
| `context_failure` | sem código/paths | pedir contexto; não inventar superfície |
| `capability_failure` | ferramenta SAST ausente | degradar para análise estática mental; marcar FN residual |
| `policy_denial` | ferramenta destrutiva/prod | respeitar; pedir confirmação — [framework-safety.md](references/framework-safety.md) |
| `knowledge_failure` | memória/audit anterior indisponível | continuar sem regressões históricas; declarar gap |
| `validation_failure` | judge sem L≥2 em crítica | não bloquear; debt |

## Regras invioláveis

1. Todo request pode ser forjado — backend decide segurança.
2. Autorização (IDOR/BOLA) > autenticação.
3. **Bloqueio** só após **judge** + merge: crítica/alta + Confirmado/Muito provável + L≥2.
4. L0–L1 / Suspeito → não bloquear; debt ou teste dinâmico.
5. Relatório primeiro; hardening só com pedido explícito.
6. Ferramentas destrutivas / prod / carga → confirmação — [framework-safety.md](references/framework-safety.md).
7. Imagem anexada: threat model only — [image-attachment-gate.md](../orquestrar/references/image-attachment-gate.md).

## Fluxo

```text
0. Capability Matrix + modo (fast|standard|deep)
1. Memória anterior? → regressões ([audit-memory.md](references/audit-memory.md))
2. Query registry → providers ([capability-registry.md](references/capability-registry.md))
3. Stack profile → hints ([knowledge-base.md](references/knowledge-base.md))
4. Executar providers + re-planejar ([adaptive-execution.md](references/adaptive-execution.md))
5. Red Team → Blue Team (standard+)
6. Judge → merge confiança ([confidence-merge.md](references/confidence-merge.md))
7. Consolidator → chains, coverage, debt, artifacts
8. Verdict Trace ([verdict-trace.md](references/verdict-trace.md)) + veredito binário
```

## Registry (plugins)

```text
"Quem atende capability=auth-review?" → registry → auth-reviewer.md
Novo especialista = entrada YAML + ficheiro em specialists/ — sem editar este SKILL.
```

## Saída mínima

Veredito | Security Score | Verdict Trace | Threat Coverage | SEC/CHAIN | Security Debt | JSON/SARIF | Evidence | Audit log providers

## Veto MegaBrain

Judge marca bloqueante → `BLOQUEADO - RISCO DETECTADO` → Status `bloqueado`.

## Handoff

Relatório + artifacts + Evidence + snapshot histórico + `[ENTREGA CONSOLIDADA]` + `[ENCERRAMENTO]`

**Benchmark / qualidade:** arquitetura congelada v2.1 — evolução via [evals/](evals/) — ver [ARCHITECTURE-FROZEN.md](ARCHITECTURE-FROZEN.md)

## Índice (carregar sob demanda)

| Tópico | Ficheiro |
|--------|----------|
| Registry | [capability-registry.yaml](capability-registry.yaml), [capability-registry.md](references/capability-registry.md) |
| Modos/custo | [cost-modes.md](references/cost-modes.md) |
| Adaptativo | [adaptive-execution.md](references/adaptive-execution.md) |
| Memória | [audit-memory.md](references/audit-memory.md) |
| Knowledge | [knowledge-base.md](references/knowledge-base.md) |
| Providers | [specialists/](references/specialists/) |
| Merge / trace | [confidence-merge.md](references/confidence-merge.md), [verdict-trace.md](references/verdict-trace.md) |
| Core técnico | [threat-modeling.md](references/threat-modeling.md), [never-trust-client.md](references/never-trust-client.md), [evidence-levels.md](references/evidence-levels.md) |

Provider: [provider.yaml](provider.yaml)
