import * as tls from 'node:tls';

type T_CACertSource = 'bundled' | 'system' | 'extra'

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
const getCACertificates = (sources: T_CACertSource[] = ['bundled', 'system', 'extra']): string[] => {
  let certificates: string[] = [];
  
  // iterate through different certificate store types to build comprehensive CA list
  (sources).forEach(certType => {
    try {
      // get certificates from specific store type
      const certList = tls.getCACertificates(certType);
      
      if (certList && Array.isArray(certList)) {
        // filter out empty/invalid certificates to ensure we only include valid data
        const validCertificates = certList.filter(cert => cert && cert.trim());
        certificates.push(...validCertificates);
      }
    } catch (err) {
      console.warn(`Failed to load ${certType} CA certificates:`, (err as Error).message);
    }
  });
  
  return certificates;
};

export {
  getCACertificates
};