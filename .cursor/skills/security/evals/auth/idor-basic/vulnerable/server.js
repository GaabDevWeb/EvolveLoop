const express = require('express');
const app = express();

// Simula auth middleware — req.user vem da sessão
function fakeAuth(req, res, next) {
  req.user = { id: 14, role: 'user' };
  next();
}

const users = {
  14: { id: 14, email: 'user14@example.com', role: 'user' },
  15: { id: 15, email: 'user15@example.com', role: 'user' },
};

app.get('/users/:id', fakeAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users[id];
  if (!user) return res.status(404).json({ error: 'not found' });
  // BUG: no ownership check — user 14 can read user 15
  return res.json(user);
});

module.exports = app;
