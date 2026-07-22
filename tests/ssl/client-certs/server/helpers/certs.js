const { execCommand, execCommandSilent } = require('./platform');
const fs = require('node:fs');
const path = require('node:path');

const PFX_PASSPHRASE = 'bruno';

function createCertsDir(certsDir) {
  if (fs.existsSync(certsDir)) {
    fs.rmSync(certsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(certsDir, { recursive: true });
}

/**
 * Generates a self-contained mTLS certificate set:
 *   ca-cert.pem / ca-key.pem          - the CA that signs everything
 *   server-cert.pem / server-key.pem  - server cert (CN=localhost, SAN localhost/127.0.0.1)
 *   client-cert.pem / client-key.pem  - client cert (extendedKeyUsage=clientAuth, CN=bruno-client)
 *   client.pfx                        - PKCS#12 bundle of the client cert (passphrase: "bruno")
 *
 * Point Bruno's client-certificate config at client-cert.pem/client-key.pem (type "cert")
 * or client.pfx (type "pfx"). The CA (ca-cert.pem) must be trusted by Bruno for the TLS
 * handshake to complete — set it as the custom CA cert in Preferences, or disable TLS verification.
 */
function generateCertificates(certsDir) {
  execCommand('openssl version');

  const write = (name, content) => fs.writeFileSync(path.join(certsDir, name), content);

  // --- CA ---
  execCommand('openssl genrsa -out ca-key.pem 4096', certsDir);
  write('ca.conf', `[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no
[dn]
CN = Bruno Test CA
[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign`);
  execCommand('openssl req -new -x509 -key ca-key.pem -out ca-cert.pem -days 3650 -config ca.conf', certsDir);

  // --- Server cert (localhost) ---
  execCommand('openssl genrsa -out server-key.pem 4096', certsDir);
  write('server.conf', `[req]
distinguished_name = dn
req_extensions = v3_req
prompt = no
[dn]
CN = localhost
[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt
basicConstraints = critical, CA:FALSE
[alt]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1`);
  execCommand('openssl req -new -key server-key.pem -out server.csr -config server.conf', certsDir);
  execCommand('openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -days 730 -extensions v3_req -extfile server.conf', certsDir);

  // --- Client cert (clientAuth) ---
  execCommand('openssl genrsa -out client-key.pem 4096', certsDir);
  write('client.conf', `[req]
distinguished_name = dn
req_extensions = v3_req
prompt = no
[dn]
CN = bruno-client
[v3_req]
keyUsage = critical, digitalSignature
extendedKeyUsage = clientAuth
basicConstraints = critical, CA:FALSE`);
  execCommand('openssl req -new -key client-key.pem -out client.csr -config client.conf', certsDir);
  execCommand('openssl x509 -req -in client.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out client-cert.pem -days 730 -extensions v3_req -extfile client.conf', certsDir);

  // --- Client PFX (PKCS#12) ---
  // Force AES-256-CBC + SHA-256 MAC. macOS ships LibreSSL, whose default pkcs12
  // export uses the legacy pbeWithSHA1And40BitRC2-CBC cipher; Node's OpenSSL 3
  // keeps RC2 in the unloaded "legacy" provider and rejects such files with
  // "Unsupported PKCS12 PFX data". These flags keep the bundle readable by Node.
  execCommand(`openssl pkcs12 -export -out client.pfx -inkey client-key.pem -in client-cert.pem -certfile ca-cert.pem -certpbe AES-256-CBC -keypbe AES-256-CBC -macalg sha256 -password pass:${PFX_PASSPHRASE}`, certsDir);

  // Cleanup intermediates
  ['ca.conf', 'server.conf', 'client.conf', 'server.csr', 'client.csr', 'ca-cert.srl'].forEach((file) => {
    const filePath = path.join(certsDir, file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  validateCertificateChain(certsDir);
}

function validateCertificateChain(certsDir) {
  try {
    const caVerifyOutput = execCommandSilent('openssl x509 -in ca-cert.pem -text -noout', certsDir).toString();
    if (!caVerifyOutput.includes('CA:TRUE')) {
      throw new Error('CA certificate missing basicConstraints=CA:TRUE');
    }

    const clientVerifyOutput = execCommandSilent('openssl x509 -in client-cert.pem -text -noout', certsDir).toString();
    if (!clientVerifyOutput.includes('TLS Web Client Authentication')) {
      throw new Error('Client certificate missing clientAuth in extendedKeyUsage');
    }

    // Verify both server and client certs chain up to the CA
    execCommandSilent('openssl verify -CAfile ca-cert.pem server-cert.pem', certsDir);
    execCommandSilent('openssl verify -CAfile ca-cert.pem client-cert.pem', certsDir);

    console.log('✅ Certificate chain validation passed');
  } catch (error) {
    console.error('❌ Certificate validation failed:', error.message);
    throw new Error(`Certificate validation failed: ${error.message}`);
  }
}

function verifyCertificates(certsDir) {
  const requiredFiles = [
    'ca-cert.pem',
    'ca-key.pem',
    'server-cert.pem',
    'server-key.pem',
    'client-cert.pem',
    'client-key.pem',
    'client.pfx'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(certsDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`missing certificate file: ${file}`);
    }
  }
}

module.exports = {
  PFX_PASSPHRASE,
  createCertsDir,
  generateCertificates,
  verifyCertificates
};
