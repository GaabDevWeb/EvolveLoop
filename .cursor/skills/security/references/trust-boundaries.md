# Regra Mestre — Fronteiras de Confiança

Executar **após** [threat-modeling.md](threat-modeling.md) e [architecture-surfaces.md](architecture-surfaces.md). A skill não deve apenas grep padrões — deve **raciocinar sobre confiança** em cada fluxo, guiada pelos attack paths do threat model.

## Postura obrigatória

```text
Todo request pode ser forjado.
O frontend é apenas UI — nunca autoridade.
O backend é a única fonte de verdade para decisões de segurança.
```

## Perguntas por fluxo (obrigatórias)

Para **cada** endpoint, handler, job ou ação sensível, responda no relatório (mesmo que "não aplicável"):

| # | Pergunta | O que provar no código |
|---|----------|------------------------|
| 1 | Quais dados entram de **fontes externas**? | body, query, headers, cookies, JWT claims, uploads, WS, gRPC |
| 2 | Quais **decisões de segurança** são tomadas? | authz, preço, role, estado, limites, tenant |
| 3 | Onde ocorre **autenticação**? | boundary server-side; não confiar em flag do cliente |
| 4 | Onde ocorre **autorização**? | por recurso + ação; não só "está logado" |
| 5 | Quais dados são **persistidos**? | mass assignment; campos sensíveis allowlisted |
| 6 | Quais ações afetam **recursos sensíveis**? | pagamento, PII, admin, ficheiros |
| 7 | O que acontece se o atacante **modificar qualquer entrada**? | preço, ID, role, estado, quantidade |

## Mapa de confiança (template)

```text
[Fonte não confiável] → [Validação server-side?] → [Autorização server-side?] → [Sink/Persistência]
         ↓                        ↓                            ↓
    Assumir malícia          Schema + limites            Negar por defeito
```

## Princípios transversais (verificar sempre)

| Princípio | O que exigir no código |
|-----------|------------------------|
| **Least Privilege** | DB user, IAM, roles mínimos; sem root/admin desnecessário |
| **Fail Secure** | Erro → negar acesso; não fallback permissivo |
| **Defense in Depth** | Validação + authz + rate limit + logging; não uma camada só |
| **Separação de responsabilidades** | FE renderiza; BE decide |
| **Validação no servidor** | FE pode UX; BE **obrigatoriamente** valida |
| **Sanitização de saída** | encode contextual no render; não só validar entrada |
| **Erros genéricos ao cliente** | detalhes só server-side |
| **Secure by default** | debug off, headers on, CORS restrito em prod |

## Ordem de prioridade na auditoria

1. **Nunca confiar no cliente** — [never-trust-client.md](never-trust-client.md)
2. **Autorização** (IDOR/BOLA) — mais crítico que autenticação isolada
3. **Taint** source → sanitizer → sink
4. **Lógica de negócio** — preço, estado, race, replay
5. Checklist técnico — [exploitation-checklist.md](exploitation-checklist.md)
6. Código gerado por IA — [ai-code-antipatterns.md](ai-code-antipatterns.md)
