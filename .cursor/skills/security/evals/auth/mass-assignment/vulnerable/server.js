const express = require('express');
const app = express();
app.use(express.json());

const users = [];

app.post('/register', (req, res) => {
  // BUG: mass assignment — isAdmin from body
  const user = { id: users.length + 1, ...req.body };
  users.push(user);
  res.status(201).json(user);
});

module.exports = app;
