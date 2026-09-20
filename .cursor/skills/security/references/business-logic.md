# Lógica de Negócio — Módulo Prioritário

**Mais comum que SQLi** em aplicações modernas. Tratar como **módulo obrigatório**, não sub-bullet de OWASP.

## Porquê priorizar

Ferramentas SAST encontram injeção; **não encontram** "cupão aplicado duas vezes" ou "preço negativo aceite". A IA deve **simular abusos de negócio** em cada fluxo monetário ou com estado.

## Domínios a auditar (checklist)

Para cada domínio presente no sistema, marcar testado sim/não e resultado:

| Domínio | Abusos a simular mentalmente |
|---------|------------------------------|
| **Preço** | negativo, zero, overflow, moeda trocada, arredondamento |
| **Desconto / cupão** | reutilização, stack infinito, expirado, de outro user, race duplo |
| **Pagamento** | parcial sem fechar pedido, replay callback, status `paid` forjado |
| **Saldo / carteira** | débito sem crédito, race em transferência, float precision |
| **Cashback / créditos** | duplo crédito, withdraw > saldo |
| **Estoque** | negativo, oversell, último item em race, reserva sem TTL |
| **Workflow** | saltar estados (`draft`→`shipped`), aprovar sem permissão |
| **Aprovação** | auto-aprovar, aprovador ≠ role exigida, bypass multi-step |
| **Permissões** | self-grant role, tenant bleed, impersonation sem audit |
| **Reembolso** | duplo reembolso, reembolso > valor pago, de pedido alheio |
| **Subscrição** | trial infinito, downgrade sem perder features, proration abuse |
| **Convite / referral** | auto-referral, bots, limite bypass |
| **Rate / limite** | quota por IP vs user, reset de janela, negativos |

## Padrões de falha no código

```javascript
// ❌ Estado aceite do cliente
await Order.update({ status: 'paid' });

// ❌ Preço do request
const total = req.body.price * req.body.qty;

// ❌ Check-then-act sem lock
if (stock > 0) { stock--; sell(); }  // race

// ❌ Cupão sem idempotência
await applyCoupon(orderId, code);  // chamada paralela 2×
```

## Template no relatório — Abuse Cases Testados

| ID | Fluxo | Abuso simulado | Resultado | SEC ref |
|----|-------|----------------|-----------|---------|
| BL-01 | checkout | preço negativo no body | vulnerável | SEC-003 |
| BL-02 | cupão | duas requests paralelas | race provável | SEC-007 |

## Ligação com threat model

Os **attack paths** do threat model devem incluir pelo menos um abuse case de negócio por ativo financeiro ou de identidade.

## Severidade

Bypass de pagamento, escalada de privilégio via workflow, ou exfiltração cross-tenant → tipicamente **crítica** ou **alta**, mesmo sem uma linha de SQLi.
