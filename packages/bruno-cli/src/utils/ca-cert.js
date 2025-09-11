const { systemCertsAsync } = require('system-ca');
const { rootCertificates } = require('node:tls');
const fs = require('node:fs');

let systemCertsCache;

async function getSystemCerts(systemCAOpts = {}) {
  if (systemCertsCache) return systemCertsCache;

  try {
    systemCertsCache = await systemCertsAsync(systemCAOpts);

    return systemCertsCache;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function certToString(cert) {
  return typeof cert === 'string'
    ? cert
    : Buffer.from(cert.buffer, cert.byteOffset, cert.byteLength).toString('utf8');
}

function mergeCA(...args) {
  const ca = new Set();
  for (const item of args) {
    if (!item) continue;
    const caList = Array.isArray(item) ? item : [item];
    for (const cert of caList) {
      ca.add(certToString(cert));
    }
  }
  return [...ca].join('\n');
}

function getNodeExtraCACerts() {
  const extraCACertPath = process.env.NODE_EXTRA_CA_CERTS;
  if (!extraCACertPath) return [];

  try {
    if (fs.existsSync(extraCACertPath)) {
      const extraCACert = fs.readFileSync(extraCACertPath, 'utf8');
      if (extraCACert && extraCACert.trim()) {
        return [extraCACert];
      }
    }
  } catch (err) {
    console.error(`Failed to read NODE_EXTRA_CA_CERTS from ${extraCACertPath}:`, err.message);
  }

  return [];
}


const getCACertificates = async ({ caCertFilePath, shouldKeepDefaultCerts = true }) => {
  try {
    let caCertificates = '';
    let caCertificatesCount = {
      system: 0,
      root: 0,
      custom: 0,
      extra: 0
    }

    let systemCerts = [];
    let rootCerts = [];
    let customCerts = [];
    let nodeExtraCerts = [];

    if (shouldKeepDefaultCerts) {
      // get system certs
      systemCerts = await getSystemCerts();
      caCertificatesCount.system = systemCerts.length;

      // get root certs
      rootCerts = [...rootCertificates];
      caCertificatesCount.root = rootCerts.length;
    }

    // handle user-provided custom CA certificate file with optional default certificates
    if (caCertFilePath) {
      // validate custom CA certificate file
      if (fs.existsSync(caCertFilePath)) {
        try {
          const customCert = fs.readFileSync(caCertFilePath, 'utf8');
          if (customCert && customCert.trim()) {
            customCerts.push(customCert);
            caCertificatesCount.custom = customCerts.length;
          }
        } catch (err) {
          console.error(`Failed to read custom CA certificate from ${caCertFilePath}:`, (err).message);
          throw new Error(`Unable to load custom CA certificate: ${(err).message}`);
        }
      }
    }

    // get NODE_EXTRA_CA_CERTS
    nodeExtraCerts = getNodeExtraCACerts();
    caCertificatesCount.extra = nodeExtraCerts.length;

    // merge certs
    const mergedCerts = mergeCA(systemCerts, rootCerts, customCerts, nodeExtraCerts);
    caCertificates = mergedCerts;

    return {
      caCertificates,
      caCertificatesCount
    }
  } catch (err) {
    console.error('Error configuring CA certificates:', (err).message);
    throw err; // Re-throw certificate loading errors as they're critical
  }
}

module.exports = {
  getCACertificates
};