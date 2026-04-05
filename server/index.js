'use strict';

/**
 * Servidor estático opcional (produção: pode servir só o client/dist atrás de CDN).
 * Dados e autenticação: Supabase (cliente liga direto).
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const STATIC_DIR = fs.existsSync(path.join(CLIENT_DIST, 'index.html')) ? CLIENT_DIST : PUBLIC_DIR;

const app = express();
app.use(express.static(STATIC_DIR));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(STATIC_DIR, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.listen(PORT, () => {
  console.log(`Estático em http://localhost:${PORT} (${STATIC_DIR})`);
});
