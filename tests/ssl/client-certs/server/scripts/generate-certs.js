#!/usr/bin/env node

const path = require('node:path');
const { createCertsDir, generateCertificates, verifyCertificates, PFX_PASSPHRASE } = require('../helpers/certs');

/**
 * Setup mTLS certificates (CA + server + client PEM/PFX) for the client-certificate test server.
 *
 * The CA (ca-cert.pem) is NOT added to the OS truststore — tests trust it via Bruno's
 * custom CA preference (or by disabling TLS verification), which keeps this script sudo-free.
 */
async function setup() {
  console.log('🔧 Setting up mTLS certificates for client-cert test server');

  const certsDir = path.join(__dirname, '..', 'certs');

  try {
    console.log('📁 Creating certificates directory');
    createCertsDir(certsDir);

    console.log('🔐 Generating certificates');
    generateCertificates(certsDir);

    console.log('✅ Verifying certificates');
    verifyCertificates(certsDir);

    console.log('🎉 Certificate setup completed successfully');
    console.log(`   Client PEM : client-cert.pem + client-key.pem  (type: cert)`);
    console.log(`   Client PFX : client.pfx  (type: pfx, passphrase: "${PFX_PASSPHRASE}")`);
    console.log(`   Trust CA   : ca-cert.pem  (set as custom CA in Bruno, or disable TLS verification)`);
    return true;
  } catch (error) {
    console.error('❌ Generate certs failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  setup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setup };
