const express = require('express');
const app = express();

// Pseudo-DB — padrão vulnerável óbvio para auditoria estática
app.get('/users', (req, res) => {
  const id = req.query.id;
  // BUG: SQL injection via string concat
  const query = "SELECT * FROM users WHERE id = " + id;
  res.json({ query, note: 'would execute: ' + query });
});

module.exports = app;
