const express = require('express');
const app = express();
app.use(express.json());

const users = [];
const ALLOWED = ['name', 'email', 'password'];

app.post('/register', (req, res) => {
  const user = { id: users.length + 1, role: 'user' };
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) user[key] = req.body[key];
  }
  users.push(user);
  res.status(201).json(user);
});

module.exports = app;
