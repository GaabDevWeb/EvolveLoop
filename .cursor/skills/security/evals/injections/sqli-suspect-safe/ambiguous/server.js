const express = require('express');
const app = express();

// Cenário "suspeito": a query é construída dinamicamente, mas os valores do utilizador
// NÃO entram na string SQL. Tudo vai por parâmetros.

function dbQuery(sql, params) {
  // Não executa nada — fixture de auditoria estática
  return { sql, params };
}

app.get('/users', (req, res) => {
  const email = String(req.query.email || '');

  // A construção dinâmica aqui é só composição de fragmentos fixos.
  const where = 'email = ?';
  const sql = 'SELECT id, email FROM users WHERE ' + where;

  const result = dbQuery(sql, [email]);
  return res.json(result);
});

module.exports = app;
