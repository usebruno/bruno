import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';

type T_CACertSource = 'bundled' | 'system' | 'extra'

type T_CACertificateData = {
  type: T_CACertSource | 'custom';
  certificate: string
}

/**
 * Safely executes tls.getCACertificates in a separate Node.js process
 * Returns empty array if the process fails or exits
 */
const safeTlsGetCACertificates = (certType: T_CACertSource): string[] => {
  try {

    // adding seperate script for each cert type
    // to make sure no unexpected code can be included in the script

    const getBundledCACertificatesScript = `
      const tls = require('node:tls');
      try {
        const result = tls.getCACertificates('bundled');
        console.log(JSON.stringify(result || []));
      } catch (error) {
        console.log('[]');
      }
    `;

    const getSystemCACertificatesScript = `
      const tls = require('node:tls');
      try {
        const result = tls.getCACertificates('system');
        console.log(JSON.stringify(result || []));
      } catch (error) {
        console.log('[]');
      }
    `;

    const getExtraCACertificatesScript = `
      const tls = require('node:tls');
      try {
        const result = tls.getCACertificates('extra');
        console.log(JSON.stringify(result || []));
      } catch (error) {
        console.log('[]');
      }
    `;

    // bundled
    let script = getBundledCACertificatesScript;

    // system
    if (certType === 'system') script = getSystemCACertificatesScript;

    // extra
    if (certType === 'extra') script = getExtraCACertificatesScript;

    const result = spawnSync('node', ['-e', script], {
      encoding: 'utf8',
      timeout: 5000, // 5 second timeout
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 50
    });
    
    if (result.error || result.status !== 0) {
      return [];
    }
    
    const output = result.stdout.trim();
    
    return JSON.parse(output);
  } catch (error) {
    // Return empty array if child process fails
    return [];
  }
};

/**
 * retrieves default CA certificates from multiple sources using Node.js TLS API
 * 
 * this function aggregates CA certificates from three sources:
 * - 'bundled': mozilla CA certificates bundled with Node.js (same as tls.rootCertificates)
 * - 'system': CA certificates from the system's trusted certificate store  
 * - 'extra': additional CA certificates loaded from `NODE_EXTRA_CA_CERTS` environment variable
 * 
 * @returns {string[]} Array of PEM-encoded CA certificate strings
 * @see https://nodejs.org/docs/latest-v22.x/api/tls.html#tlsgetcacertificatestype
 */
const getCerts = (sources: T_CACertSource[] = ['bundled', 'system', 'extra']): T_CACertificateData[] => {
  let certificates: T_CACertificateData[] = [];

  // iterate through different certificate store types to build comprehensive CA list
  (sources).forEach(certType => {
    try {
      // get certificates from specific store type
      const certList = safeTlsGetCACertificates(certType);

      if (certList && Array.isArray(certList)) {
        // filter out empty/invalid certificates to ensure we only include valid data
        const validCertificates = certList.filter(cert => cert && cert.trim());
        const validCertificatesWithCertType = validCertificates.map(certificate => ({
          type: certType,
          certificate
        }));
        certificates.push(...validCertificatesWithCertType);
      }
    } catch (err) {
      console.warn(`Failed to load ${certType} CA certificates:`, (err as Error).message);
    }
  });

  return certificates;
};

const getCACertificates = ({ caCertFilePath, shouldKeepDefaultCerts = true }: { caCertFilePath: string, shouldKeepDefaultCerts: boolean }) : T_CACertificateData[] => {
  // CA certificate configuration
  try {
    let caCertificates: T_CACertificateData[] = [];

    // handle user-provided custom CA certificate file with optional default certificates
    if (caCertFilePath) {

      // validate custom CA certificate file
      if (fs.existsSync(caCertFilePath)) {
        try {
          const customCert = fs.readFileSync(caCertFilePath, 'utf8');
          if (customCert && customCert.trim()) {
            caCertificates.push({
              type: 'custom',
              certificate: customCert.trim()
            });
          }
        } catch (err) {
          console.error(`Failed to read custom CA certificate from ${caCertFilePath}:`, (err as Error).message);
          throw new Error(`Unable to load custom CA certificate: ${(err as Error).message}`);
        }
      }

      // optionally augment custom CA with default certificates
      if (shouldKeepDefaultCerts) {
        const defaultCertificates = getCerts(['bundled', 'system', 'extra']);
        if (defaultCertificates?.length > 0) {
          caCertificates.push(...defaultCertificates);
        }
      }
    } else {
      // use default CA certificates when no custom configuration is specified
      const defaultCertificates = getCerts(['bundled', 'system', 'extra']);
      if (defaultCertificates?.length > 0) {
        caCertificates.push(...defaultCertificates);
      }
    }

    return caCertificates;
  } catch (err) {
    console.error('Error configuring CA certificates:', (err as Error).message);
    throw err; // Re-throw certificate loading errors as they're critical
  }
}

export {
  getCACertificates
};