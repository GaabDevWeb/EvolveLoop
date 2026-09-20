# Attack Chains e Attack Graph

Achados isolados **subestimam** risco. Após listar `SEC-XXX`, **obrigatório** sintetizar cadeias.

## Porquê

| Isolado | Cadeia |
|---------|--------|
| Stored XSS — **média** | XSS → cookie sem HttpOnly → sessão admin → painel → RCE = **crítica** |
| Open redirect — **baixa** | redirect → roubo OAuth code → token → account takeover = **alta** |
| Info leak versão — **informativa** | versão → CVE conhecida → exploit público = **alta** |

## Secção obrigatória no relatório: Attack Chains

Listar **todas** as cadeias plausíveis (mínimo 1 se ≥2 achados, ou 0 com justificação).

### Formato

```markdown
### CHAIN-01: Admin Takeover via XSS
**Severidade da cadeia:** crítica
**Exploitabilidade:** alta (internet, user autenticado basta para plantar XSS)

SEC-004 (Stored XSS em comentários)
    ↓
SEC-012 (Cookie sessão sem HttpOnly)
    ↓
SEC-003 (Admin lê painel com mesmo browser)
    ↓
**Objetivo:** takeover conta admin → acesso dados todos users

**Valor para atacante:** dados PII em massa, fraude, persistência
**Complexidade:** baixa (2–3 passos, sem 0-day)
```

```markdown
### CHAIN-02: ...
```

## Attack Graph — por vulnerabilidade

Além dos campos do achado, cada `SEC-XXX` inclui mini-grafo:

| Campo | Conteúdo |
|-------|----------|
| **Pré-condições** | login, rede, vítima, conhecimento |
| **Dependências** | outros SEC ou controles ausentes |
| **Cadeia possível** | `SEC-A → SEC-B → objetivo` ou "isolado" |
| **Objetivo final** | o que o atacante ganha |
| **Valor para atacante** | dinheiro, dados, acesso, persistência |
| **Complexidade** | baixa \| média \| alta |
| **Exploitabilidade** | ver [risk-scoring.md](risk-scoring.md) |

### Exemplo

```text
SEC-008 Open Redirect (/login?next=)
    Pré-condições: vítima clica link
    Dependências: SEC-015 OAuth sem PKCE/state rigoroso
    Cadeia: SEC-008 → roubo authorization code → SEC-015 → account takeover
    Objetivo: conta da vítima
    Valor: acesso a pedidos/PII
    Complexidade: média
    Exploitabilidade: alta (phishing trivial)
```

## Regras de severidade em cadeia

1. Calcular severidade **por achado** (impacto isolado).
2. Calcular severidade **da cadeia** (impacto combinado) — pode ser **maior** que qualquer elo.
3. **Bloqueio de release:** cadeia crítica/alta com exploitabilidade não-baixa e confiança Confirmado/Muito provável → bloquear mesmo se elos isolados forem médios.

## Raciocínio livre (anti-checklist)

**Antes do veredito final**, pausar o roteiro:

> "Assumo o papel de atacante experiente. Existe vetor **não coberto** pelas categorias do checklist que atinge um ativo do threat model?"

Se sim → documentar como `SEC-XXX` ou `CHAIN-XX` mesmo fora do template habitual. Esta etapa **não** dispensa o checklist — **complementa** para evitar cegueira por roteiro.
