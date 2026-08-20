const path = require('node:path');
const { execFileSync } = require('node:child_process');

const generateSelfSignedCert = (dir, name, commonName) => {
  const keyPath = path.join(dir, `${name}-key.pem`);
  const certPath = path.join(dir, `${name}-cert.pem`);

  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyPath,
    '-out', certPath,
    '-days', '1',
    '-subj', `/CN=${commonName}`,
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'
  ], { stdio: 'ignore' });

  return { keyPath, certPath };
};

module.exports = { generateSelfSignedCert };
