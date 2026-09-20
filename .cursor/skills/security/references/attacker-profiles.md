# Perfis de Atacante

**Obrigatório por achado:** campo **Quem explora** — liga severidade teórica à exploitabilidade real.

## Escala de perfis (do menor ao maior privilégio inicial)

| Perfil | Capacidade típica | Exemplo de vetor |
|--------|-------------------|------------------|
| **Script kiddie** | scanners, payloads públicos | SQLi óbvio, `.env` exposto |
| **Anónimo na internet** | forjar requests, enumeração | registo aberto, rate limit ausente |
| **User autenticado** | IDOR, lógica de negócio, CSRF | `GET /users/15` como user 14 |
| **Cliente malicioso** | app legítima, requests forjados | preço no body, mass assignment |
| **Funcionário** | acesso interno, suporte, logs | insider, excesso de permissão |
| **Admin comprometido** | painel, impersonation | stored XSS → roubo sessão admin |
| **Insider malicioso** | credenciais, CI, backups | exfiltração DB, supply chain |
| **APT** | cadeias multi-etapa, persistência | SSRF → metadata → role chain |

## Campos por achado

| Campo | Valores exemplo |
|-------|-----------------|
| **Perfil mínimo** | user autenticado |
| **Requer login** | sim / não |
| **Requer admin** | sim / não |
| **Requer VPN / rede interna** | sim / não |
| **Requer interação da vítima** | sim (XSS, CSRF) / não |

## Calibração de exploitabilidade

| Contexto defensivo | Efeito na exploitabilidade |
|--------------------|----------------------------|
| Internet-facing, sem MFA | **Alta** |
| VPN + IP whitelist + MFA | **Baixa** (impacto pode manter-se alto) |
| Apenas rede interna | **Média** — insider ou SSRF como pivot |
| Requer admin + 2FA hardware | **Muito baixa** — não confundir com impacto baixo |

RCE atrás de VPN + MFA + IP whitelist ≠ RCE na internet pública — documentar ambos **impacto** e **exploitabilidade** separadamente.
