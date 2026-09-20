# Especialista: auth-reviewer

## Activar quando

Login, registo, JWT, OAuth, OIDC, sessão, MFA, password reset, API keys.

## Foco

- Authn: hash, JWT exp/alg, secrets, rate limit login
- Authz: **IDOR/BOLA** — tabela por recurso
- Sessão: HttpOnly, Secure, SameSite, rotação pós-login
- OAuth: state, PKCE, redirect_uri
- JWT avançado: alg none, kid, iss/aud

Ver checklist auth em [exploitation-checklist.md](../exploitation-checklist.md) §3–4.

## Evidence

L3 possível: curl login brute (local), jwt.io decode + verify no código

## Taxonomias

OWASP A01, A07; CWE-287, 639, 862; MITRE T1078, T1098

## Coverage

`Authentication`, `Authorization`, `Session Management`
