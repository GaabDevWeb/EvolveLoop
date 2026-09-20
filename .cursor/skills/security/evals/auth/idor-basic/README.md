# idor-basic

Express minimal: `GET /users/:id` retorna user sem verificar se `req.user.id === req.params.id`.

- **vulnerable/** — sem ownership
- **fixed/** — nega se ID ≠ actor

Run: ver [benchmark-protocol.md](../../benchmark-protocol.md)
