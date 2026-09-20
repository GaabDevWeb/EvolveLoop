# Taxonomias — MITRE ATT&CK, CWE, OWASP

Mapear **cada SEC-XXX** para integração com ferramentas enterprise e CI.

## Por achado (campos obrigatórios)

| Campo | Exemplo |
|-------|---------|
| **OWASP Top 10 (2021)** | A01:2021 Broken Access Control |
| **CWE** | CWE-639 (Authorization Bypass Through User-Controlled Key) |
| **MITRE ATT&CK** | T1190 Exploit Public-Facing Application |

Múltiplos valores permitidos se aplicável.

## Referência rápida OWASP → CWE comum

| OWASP | CWEs frequentes |
|-------|-----------------|
| A01 Broken Access Control | CWE-22, 639, 862, 863 |
| A02 Cryptographic Failures | CWE-327, 328, 330, 916 |
| A03 Injection | CWE-79, 89, 78, 94 |
| A04 Insecure Design | CWE-841 (workflow), CWE-1284 (price/discount quantity), CWE-840 (categoria — não usar para mapping) |
| A05 Misconfiguration | CWE-16, 611 |
| A06 Vulnerable Components | CWE-1104 |
| A07 Auth Failures | CWE-287, 384, 613 |
| A08 Integrity Failures | CWE-494, 502 |
| A09 Logging Failures | CWE-532, 778 |
| A10 SSRF | CWE-918 |

## MITRE ATT&CK (táticas comuns em appsec)

| ID | Nome | Quando usar |
|----|------|-------------|
| T1190 | Exploit Public-Facing Application | SQLi, RCE internet |
| T1059 | Command and Scripting Interpreter | CMDi |
| T1552 | Unsecured Credentials | secrets no repo |
| T1078 | Valid Accounts | cred stuffing, IDOR como user |
| T1098 | Account Manipulation | mass assignment isAdmin |
| T1565 | Data Manipulation | tampering preço/estado |
| T1539 | Steal Web Session Cookie | XSS + cookie |
| T1550 | Use Alternate Auth Material | JWT abuse |

Não forçar MITRE se não houver mapeamento razoável — usar "N/A" com justificação.

## Attack Chains

Cadeias podem listar **união** de técnicas MITRE dos elos.

## SARIF / JSON

Incluir em `properties` ou `taxonomies` — ver [ci-artifacts.md](ci-artifacts.md):

```json
{
  "ruleId": "SEC-003",
  "properties": {
    "cwe": ["CWE-89"],
    "owasp": ["A03:2021"],
    "mitre": ["T1190"]
  }
}
```

## Recursos

Mapeamento completo: usar julgamento + [exploitation-checklist.md](exploitation-checklist.md). Para dúvida CWE: https://cwe.mitre.org/
