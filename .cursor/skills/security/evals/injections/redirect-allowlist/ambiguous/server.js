const express = require('express');
const { URL } = require('url');
const app = express();

// Allowlist explícita — redirect parece perigoso mas é controlado
const ALLOWED_HOSTS = new Set(['app.example.com', 'docs.example.com', 'status.example.com']);

function isAllowedRedirect(target) {
  try {
    const parsed = new URL(target);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

app.get('/go', (req, res) => {
  const target = String(req.query.url || '');
  if (!isAllowedRedirect(target)) {
    return res.status(400).json({ error: 'invalid redirect target' });
  }
  // Parece open redirect no grep, mas host foi validado
  return res.redirect(302, target);
});

module.exports = app;
