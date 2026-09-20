# Scoring — Impacto × Exploitabilidade × Confiança × Esforço

Dimensões **independentes**. Evidence Level (L0–L4) em [evidence-levels.md](evidence-levels.md). Esforço e debt em [prioritization.md](prioritization.md).

## 1. Impacto (Severidade)

O **dano se explorado com sucesso** — independente de quão fácil é.

| Nível | Critério |
|-------|----------|
| **crítica** | RCE, exfiltração massiva, bypass pagamento, admin takeover |
| **alta** | dados de outros users, escalada privilégio, XSS stored autenticado |
| **média** | XSS reflected, CSRF sensível, DoS limitado |
| **baixa** | hardening fraco, headers opcionais |
| **informativa** | sem exploit direto no contexto |

## 2. Exploitabilidade

Quão **fácil** explorar **no contexto real** (defesas em caminho).

| Nível | Critério |
|-------|----------|
| **alta** | internet pública; sem auth; PoC trivial; ferramentas públicas |
| **média** | requer conta user; ou rede semi-restrita; alguns passos |
| **baixa** | VPN + MFA + whitelist; insider; timing preciso |
| **muito baixa** | APT, múltiplas falhas encadeadas improváveis, interação física |

**Exemplo:** RCE com impacto crítico mas exploitabilidade **baixa** (só via VPN interna) → prioridade alta no hardening, **pode não bloquear** release se política aceitar risco interno — documentar explicitamente.

## 3. Confiança (evidência)

| Nível | Critério | Bloqueia release? |
|-------|----------|-------------------|
| **Confirmado** | código prova caminho exploitável | sim, se impacto crítico/alto **e** evidence level ≥ L2 |
| **Muito provável** | padrão fortemente indicativo | idem |
| **Suspeito** | indícios; falta confirmação | **não** — hardening prioritário |
| **Informativo** | boa prática | **não** |

**Regra v2:** L0–L1 nunca bloqueiam sozinhos → Security Debt + elevar para L3. Ver [evidence-levels.md](evidence-levels.md).

## Matriz de priorização (para ordenar achados)

```text
Prioridade = Impacto (peso 3) + Exploitabilidade (peso 2) + Confiança (peso 1)
```

Ou tabela mental:

| Impacto \ Exploitabilidade | Alta | Média | Baixa |
|----------------------------|------|-------|-------|
| **Crítica** | P0 bloquear | P0 bloquear | P1 urgente |
| **Alta** | P0 bloquear | P1 bloquear | P2 |
| **Média** | P1 | P2 | P3 backlog |

Ajustar **para baixo** se Confiança = Suspeito/Informativo.

---

## Falso Positivo (evitar paranoia)

Declarar explicitamente quando **não** bloquear:

| Situação | Ação |
|----------|------|
| Padrão parece vulnerável mas **controle compensatório comprovado** no código | Confiança → Informativo; não bloquear |
| **Evidência insuficiente** para afirmar exploit | Confiança → Suspeito; **não bloquear**; "necessita teste dinâmico" |
| Achado teórico sem caminho no threat model | Informativo ou omitir com justificação |
| Framework sanitiza por defeito **e** uso está dentro do contrato documentado | Confirmar no código; se sim, não bloquear |

**Frase obrigatória quando aplicável:**

```text
Não encontrei evidência suficiente para bloquear release. Necessita teste dinâmico / confirmação manual.
```

## Falso Negativo (evitar falsa segurança)

Declarar explicitamente o que **não** foi possível verificar:

| Situação | Ação |
|----------|------|
| Código não disponível (dep fechada, serviço externo) | Risco residual; Confiança máxima Suspeito |
| Endpoint não acessível / só em prod | "não foi possível confirmar" |
| Infra (WAF, CDN, IAM) fora do repo | listar em Riscos Residuais |
| Worker/queue definido só em Terraform não no contexto | arquitetura "desconhecido" |

**Frase obrigatória quando aplicável:**

```text
Não foi possível confirmar — código/endpoint/dependência não disponível no âmbito da revisão.
```

Nunca emitir `SEGURO PARA RELEASE` **sem** secção de Riscos Residuais quando há âmbito não verificado.

---

## Security Score (0–100)

Pontuação **agregada** para CI/dashboards — **não substitui** veredito binário.

### Cálculo sugerido

```text
Score base = 100
− 25 × (críticas Confirmado/Muito provável, exploitabilidade não-baixa)
− 15 × (altas idem)
− 5  × (médias idem)
− 2  × (baixas)
− 5  × (cadeias CHAIN críticas/altas)
− 3  × (riscos residuais materiais não verificados)
mínimo 0
```

### Grade

| Score | Grade |
|-------|-------|
| 90–100 | A |
| 80–89 | B |
| 70–79 | C |
| 60–69 | D |
| 40–59 | E |
| 0–39 | F |

### No relatório

```markdown
**Security Score:** 72/100 (C)
**Nota:** score informativo; veredito de release permanece binário.
```

**Bloqueio:** score baixo **correlaciona** com bloqueio mas **veredito** segue regra: crítica/alta Confirmado/Muito provável não mitigada → `BLOQUEADO`.

---

## Evidência enriquecida (por achado)

Além de `path:linha`:

| Campo | Conteúdo |
|-------|----------|
| **Evidence** | trecho, padrão grep, config |
| **Reasoning** | por que isto é explorável (2–4 frases) |
| **Attack Path** | passos do atacante ou ligação `SEC-A → SEC-B` |
| **Impact** | dano de negócio |
| **Confidence** | Confirmado \| Muito provável \| Suspeito \| Informativo |
| **Exploitability** | alta \| média \| baixa \| muito baixa |
| **Quem explora** | perfil mínimo — [attacker-profiles.md](attacker-profiles.md) |
