# Nunca Confiar no Cliente (Frontend)

**Erro mais comum em código gerado por IA.** O frontend é apresentação e UX — **nunca** autoridade de segurança.

## Regra absoluta

Se uma decisão de segurança, negócio ou permissão existe **apenas** no cliente → **Vulnerabilidade Detectada** (mínimo **alta**).

## O que o backend DEVE decidir (nunca o FE)

| Decisão | Anti-padrão no FE | Verificação no BE |
|---------|-------------------|-------------------|
| Permissões / roles | `isAdmin = true`, `if (user.role === 'admin')` esconde UI | Checagem server-side por recurso e ação |
| Preços | `price` no body do checkout | Preço calculado no servidor a partir de catálogo/DB |
| Descontos | `discount`, `couponValue` enviados pelo cliente | Regra de cupão validada server-side |
| Quantidades / limites | `quantity`, `maxItems` do formulário | Limites enforced no BE; stock atómico |
| IDs de recurso | `userId`, `orderId`, `tenantId` no body | ID derivado da sessão/token; ownership check |
| Estados críticos | `status: 'paid'`, `approved: true` | Máquina de estados server-side; transições validadas |
| Identidade | `email`, `sub` do JWT sem validar assinatura/exp | Sessão/JWT validado no boundary |

## Padrões a caçar no código

```javascript
// ❌ FE decide permissão
const isAdmin = localStorage.getItem('role') === 'admin';
if (isAdmin) showAdminPanel();

// ❌ BE confia em campo do cliente
app.post('/checkout', (req) => {
  const { price, discount, userId } = req.body;
  charge(userId, price - discount);
});

// ❌ Mass assignment via body completo
User.create(req.body); // pode conter isAdmin: true
```

```javascript
// ✅ BE deriva identidade e autoriza
const userId = req.session.userId; // não req.body.userId
const price = await catalog.getPrice(productId);
await authorize(userId, 'order', 'create');
```

## Checklist por endpoint

- [ ] Identidade vem de **sessão/JWT validado**, não de body/query
- [ ] `userId` / `tenantId` do request **ignorados** ou comparados com actor autenticado
- [ ] Preço/desconto **recalculados** no servidor
- [ ] Role/permission checados **no handler**, não só middleware genérico
- [ ] Estado (`status`, `paid`, `verified`) **não aceito** do cliente em writes
- [ ] UI "admin" oculta **não substitui** authz no endpoint
- [ ] Hidden fields / disabled buttons **não são segurança**

## Grep mental (procurar no repo)

- `req.body.(price|discount|role|isAdmin|status|userId|tenantId)`
- `localStorage.*(role|admin|token)`
- `dangerouslySetInnerHTML` com dados de API sem encode
- `if (.*admin|isAdmin|role)` **sem** chamada API de autorização correspondente
- `create(req.body)` / `update(req.body)` / `.fill(req.body)` / `Object.assign`

## Severidade

| Cenário | Severidade típica |
|---------|-------------------|
| `isAdmin` só no FE, endpoint admin aberto | **crítica** |
| Preço/desconto do cliente em pagamento | **crítica** |
| `userId` do body permite IDOR | **alta** |
| Validação só Zod no FE, BE aceita raw | **alta** |
| Limites só no input `max` HTML | **média** (se BE também limita → informativa) |

## Ligação com outras falhas

- **IDOR/BOLA** — quase sempre começa por confiar em ID do cliente
- **Mass assignment** — `req.body` completo no ORM
- **Lógica de negócio** — estado/preço forjados no request
