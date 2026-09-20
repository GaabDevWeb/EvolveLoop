const express = require('express');
const app = express();

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
  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  const user = users[id];
  if (!user) return res.status(404).json({ error: 'not found' });
  return res.json(user);
});

module.exports = app;
