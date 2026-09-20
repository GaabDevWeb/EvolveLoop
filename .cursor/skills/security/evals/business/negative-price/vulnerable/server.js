const express = require('express');
const app = express();
app.use(express.json());

const catalog = { sku1: { price: 99.0 } };

app.post('/checkout', (req, res) => {
  const { sku, price, quantity } = req.body;
  // BUG: trusts client price
  const total = price * quantity;
  if (total < 0) {
    // some devs think this is enough — still wrong if price manipulated
  }
  res.json({ charged: total, sku, status: 'paid' });
});

module.exports = app;
