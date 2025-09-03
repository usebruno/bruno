#!/usr/bin/env node

const path = require('node:path');
const {
  installOpenSSL,
  createCertsDir,
  generateCertificates,
  addCAToTruststore,
  verifyCertificates
} = require('./cert-helpers');

/**
 * Setup CA certificates for testing server
 */
async function setup() {
  console.log('setting up CA certificates for test server');
  
  const certsDir = path.join(__dirname, 'certs');

  try {
    console.log('installing openssl');
    installOpenSSL();

    console.log('creating certificates directory');
    createCertsDir(certsDir);

    console.log('generating certificates');
    generateCertificates(certsDir);

    console.log('verifying certificates');
    verifyCertificates(certsDir);

    console.log('adding CA to truststore');
    addCAToTruststore(certsDir);

    console.log('CA certificate setup completed successfully');
    return true;
  } catch (error) {
    console.error('setup failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  setup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setup };
