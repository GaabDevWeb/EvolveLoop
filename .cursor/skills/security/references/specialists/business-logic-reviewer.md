# Especialista: business-logic-reviewer

## Activar quando

Stripe/PayPal, checkout, wallet, cupões, stock, workflow, aprovações, subscrições.

## Foco

[business-logic.md](../business-logic.md) + [never-trust-client.md](../never-trust-client.md)

- Preço/desconto do cliente
- Race em stock/saldo/cupão
- Replay webhook pagamento
- Estado `paid` forjado
- TOCTOU em aprovações

## Evidence

- L1: código aceita campo do body
- L2: PoC mental (duas requests paralelas, preço negativo)
- L3: curl replay webhook (se staging ✓)

## Taxonomias

OWASP A04; CWE-841, CWE-1284 (evitar CWE-840 para mapping); MITRE T1565

## Coverage

`Business Logic / Payments`
