# Especialista: dependency-reviewer

## Activar quando

Lockfiles, package.json, requirements.txt, go.sum.

## Foco

- Versões com CVE conhecidas (npm audit, osv-scanner se terminal ✓)
- Pacotes abandonados, postinstall scripts
- Typosquatting, integridade lockfile
- Supply chain — [exploitation-checklist.md](../exploitation-checklist.md) §33

## Evidence

- L4: output scanner com CVE ID
- L1: versão fixada manualmente no código sem lock

## Taxonomias

OWASP A06; CWE-1104; MITRE T1195

## Coverage

`Dependencies`
