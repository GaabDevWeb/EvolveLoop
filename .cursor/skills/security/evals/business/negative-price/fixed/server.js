const express = require('express');
const app = express();
app.use(express.json());

const catalog = { sku1: { price: 99.0 } };

app.post('/checkout', (req, res) => {
  const { sku, quantity } = req.body;
  const item = catalog[sku];
  if (!item) return res.status(400).json({ error: 'invalid sku' });
  const qty = Math.max(1, Math.min(100, parseInt(quantity, 10) || 1));
  const total = item.price * qty;
  if (total <= 0) return res.status(400).json({ error: 'invalid total' });
  res.json({ charged: total, sku, status: 'paid' });
});

module.exports = app;
