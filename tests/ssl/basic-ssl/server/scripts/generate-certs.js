#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const certsDir = path.join(__dirname, '..', 'certs');

if (fs.existsSync(certsDir)) {
  fs.rmSync(certsDir, { recursive: true, force: true });
}
fs.mkdirSync(certsDir, { recursive: true });

const config = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
`;

fs.writeFileSync(path.join(certsDir, 'localhost.conf'), config);

execSync('openssl genrsa -out key.pem 2048', { cwd: certsDir, stdio: 'inherit' });
execSync('openssl req -new -x509 -key key.pem -out cert.pem -days 2 -config localhost.conf', {
  cwd: certsDir,
  stdio: 'inherit'
});

fs.unlinkSync(path.join(certsDir, 'localhost.conf'));
console.log('self-signed certs generated');
