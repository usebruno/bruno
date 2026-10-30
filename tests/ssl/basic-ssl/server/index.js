#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const certsDir = path.join(__dirname, 'certs');
const port = 8092;

const server = https.createServer({
  key: fs.readFileSync(path.join(certsDir, 'key.pem')),
  cert: fs.readFileSync(path.join(certsDir, 'cert.pem'))
}, (_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
});

server.listen(port, () => {
  console.log(`self-signed HTTPS server listening on https://localhost:${port}`);
});
