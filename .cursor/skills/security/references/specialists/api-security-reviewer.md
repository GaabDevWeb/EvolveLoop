# Especialista: api-security-reviewer

## Activar quando

REST, OpenAPI, gRPC HTTP, Webhooks.

## Foco

- IDOR em paths `/resource/:id`
- Mass assignment em POST/PUT
- Rate limiting endpoints sensíveis
- Enumeração, paginação sem limite
- CSRF em cookie-auth
- SSRF em webhooks outbound
- Versionamento e métodos HTTP

[never-trust-client.md](../never-trust-client.md) + taint em handlers.

## Evidence

L2 PoC: trocar ID no path; L3: curl com token de outro user

## Taxonomias

OWASP A01, A03, A10; CWE-639, 918; MITRE T1190

## Coverage

`API Security`, `Input Validation`
