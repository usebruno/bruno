const path = require('node:path');
const { execFileSync } = require('node:child_process');

let opensslChecked = false;

const assertOpensslAvailable = () => {
  if (opensslChecked) return;
  try {
    execFileSync('openssl', ['version'], { stdio: 'ignore' });
  } catch {
    throw new Error('The NTLM TLS test server needs `openssl` on PATH to generate its certificates; install openssl or skip the TLS specs.');
  }
  opensslChecked = true;
};

const generateSelfSignedCert = (dir, name, commonName) => {
  assertOpensslAvailable();

  const keyPath = path.join(dir, `${name}-key.pem`);
  const certPath = path.join(dir, `${name}-cert.pem`);

  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', keyPath,
      '-out', certPath,
      '-days', '1',
      '-subj', `/CN=${commonName}`,
      '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`Could not generate the ${name} certificate with openssl: ${detail}`);
  }

  return { keyPath, certPath };
};

module.exports = { generateSelfSignedCert };
