const express = require('express');
const app = express();

function dbQuery(sql, params) {
  return { sql, params };
}

app.get('/users', (req, res) => {
  const email = String(req.query.email || '');
  const sql = 'SELECT id, email FROM users WHERE email = ?';
  const result = dbQuery(sql, [email]);
  return res.json(result);
});

module.exports = app;
