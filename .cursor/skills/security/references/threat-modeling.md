# Threat Modeling (obrigatório — antes da análise)

Executar **imediatamente após Contexto** e **antes** de trust boundaries ou grep de padrões. Inspirado em STRIDE, abuse cases e attack-path thinking — sem burocracia de framework completo.

## Perguntas que mudam a auditoria

| Pergunta | Porquê |
|----------|--------|
| **O que vale dinheiro aqui?** | Pagamentos, saldo, cupões, subscrições, comissões |
| **O que vale dados?** | PII, credenciais, segredos, IP, histórico médico/financeiro |
| **O que um atacante quer?** | Dinheiro, dados, acesso admin, ransomware, reputação |
| **Qual é o caminho mais curto?** | Menor número de passos até o objetivo — priorizar análise aí |

## Template de Threat Model (entregar no relatório)

### 1. Ativos (Assets)

| Ativo | Sensibilidade | Onde vive |
|-------|---------------|-----------|
| ex.: contas user | PII | DB `users` |
| ex.: saldo/carteira | financeiro | serviço pagamentos |
| ex.: tokens sessão | credencial | Redis/cookie |

### 2. Atores (Actors)

| Ator | Motivação | Acesso típico |
|------|-----------|---------------|
| Anónimo | enumeração, abuse gratuito | internet pública |
| User autenticado | IDOR, fraude, escalada | API com token |
| Cliente malicioso | manipular preço/estado | app legítimo forjado |
| Funcionário / admin | insider, erro, abuso | painel interno |
| APT / atacante avançado | persistência, exfiltração | phishing + cadeias |

Ver perfis detalhados: [attacker-profiles.md](attacker-profiles.md).

### 3. Trust Boundaries

Fronteiras onde dados ou confiança **mudam de nível**:

```text
Internet → [WAF/CDN?] → [Reverse Proxy?] → App → DB/Cache/Queue → Storage/3rd party
```

Marcar cada fronteira: o que **entra**, o que **sai**, quem **valida**.

### 4. Attack Surface

Lista concreta do que está exposto:

- Endpoints públicos (REST, GraphQL, gRPC, WS)
- Webhooks inbound/outbound
- Uploads, exports, admin panels
- Jobs/cron/workers, CLI, CI
- Storage (S3, blobs), filas, cache partilhado
- Frontend (XSS, tokens no browser)

Arquitetura: [architecture-surfaces.md](architecture-surfaces.md).

### 5. Attack Paths (caminhos prioritários)

Para cada ativo de alto valor, esboçar **1–3 caminhos** do ator até o ativo:

```text
[Ator] → [entrada] → [falha provável] → [ativo]
```

Exemplo:

```text
User autenticado → PUT /orders/:id {status:paid} → sem authz estado → bypass pagamento
```

Estes caminhos **guiam** a análise — não são achados finais.

### 6. Threats (STRIDE lite)

Por superfície relevante, classificar ameaças possíveis (marque as que vai caçar):

| STRIDE | Pergunta |
|--------|----------|
| **S**poofing | Posso fingir ser outro user/serviço? |
| **T**ampering | Posso alterar dados em trânsito ou em repouso? |
| **R**epudiation | Ações críticas ficam sem auditoria? |
| **I**nformation disclosure | Vazamento de PII/secrets/erros? |
| **D**enial of service | Posso derrubar ou degradar? |
| **E**levation of privilege | User → admin? tenant A → tenant B? |

Opcional se PII/privacidade for foco: LINDDUN (linkability, identifiability, etc.) — só quando aplicável.

### 7. Abuse Cases

Cenários de negócio maliciosos (não só bugs técnicos):

- Comprar a preço negativo; cupão infinito; dois saques simultâneos
- Cancelar pedido alheio; reembolso duplicado; replay webhook pagamento
- Auto-promover a admin; saltar workflow de aprovação

Detalhe: [business-logic.md](business-logic.md).

### 8. Mitigações esperadas (hipótese)

Antes de ler código, liste **o que o sistema deveria ter** para cada attack path prioritário. Depois verifique se existe no código.

---

## Ligação com o resto da auditoria

```text
Contexto → Threat Model → Arquitetura → Trust Boundaries → Análise técnica
                ↓                                              ↓
         Attack paths prioritários              Achados SEC-XXX
                ↓                                              ↓
                    Attack Chains + Raciocínio livre → Veredito
```

O threat model **não substitui** análise de código — **prioriza** onde procurar e o que um atacante realmente quer.
