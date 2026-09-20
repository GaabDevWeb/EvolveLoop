# Threat Coverage

Secção **obrigatória** no relatório final. O utilizador vê o que foi e **o que ficou de fora**.

## Domínios padrão

| Domínio | Descrição |
|---------|-----------|
| Authentication | login, MFA, sessão, JWT |
| Authorization | IDOR, BOLA, RBAC |
| Business Logic / Payments | preço, cupão, webhook, saldo |
| Input Validation | schemas, tamanho, tipos |
| Injection | SQL, CMD, XSS, template |
| Cryptography | hashing, TLS, tokens |
| Session Management | cookies, fixation, rotation |
| File Upload | MIME, path, storage |
| API Security | REST, rate limit, versioning |
| GraphQL | depth, introspection |
| OAuth / OIDC | state, PKCE, redirect |
| Cloud / IaC | S3, IAM, k8s |
| Dependencies | CVEs, supply chain |
| LLM / AI | prompt injection, RAG |
| Headers / Config | CSP, CORS, debug |
| Logging / Monitoring | PII em logs, audit |
| DoS | limits, ReDoS |
| Dynamic / Runtime | L3+ tests |

## Formato visual

```markdown
### Threat Coverage

| Domínio | Cobertura | Nível evid. | Notas |
|---------|-----------|-------------|-------|
| Authentication | ████████░░ 80% | L2 | JWT revisto |
| Authorization | ███████░░░ 70% | L2 | IDOR em /users |
| Payments | ███░░░░░░░ 30% | L1 | webhook não testado L3 |
| GraphQL | — | — | não encontrado no stack |
| Cloud | ░░░░░░░░░░ 0% | — | Terraform fora do âmbito |
| Dynamic | ░░░░░░░░░░ 0% | — | sem staging |
```

## Cálculo de cobertura (heurística)

Por domínio:

- **100%** — módulo activado + análise completa + sem gaps declarados
- **50–80%** — análise parcial ou L1 apenas
- **0%** — não aplicável **ou** não avaliado por falta de capability
- **—** — stack não contém superfície

## Ligação com Capability Matrix

Capability ✗ → domínio marcado "não avaliado (capability)" — distinto de "não aplicável".

## No Evidence JSON

```json
"threat_coverage": {
  "authentication": 0.8,
  "payments": 0.3,
  "graphql": null
}
```
