const express = require('express');
const app = express();

app.get('/users', (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  const query = 'SELECT * FROM users WHERE id = ?';
  res.json({ query, params: [id] });
});

module.exports = app;
