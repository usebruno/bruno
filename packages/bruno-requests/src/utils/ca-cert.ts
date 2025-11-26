import * as tls from 'node:tls';
import * as fs from 'node:fs';

type T_CACertificatesOptions = {
  caCertFilePath?: string;
  shouldKeepDefaultCerts?: boolean;
}

type T_CACertificatesResult = {
  caCertificates: string;
  caCertificatesCount: {
    system: number;
    root: number;
    custom: number;
    extra: number;
  };
}

let systemCertsCache: string[] | undefined;

function getSystemCerts(): string[] {
  if (systemCertsCache) return systemCertsCache;

  try {
    systemCertsCache = tls.getCACertificates('system');

    return systemCertsCache;
  } catch (error) {
    return [];
  }
}

function certToString(cert: string | Buffer) {
  return typeof cert === 'string'
    ? cert
    : Buffer.from(cert.buffer, cert.byteOffset, cert.byteLength).toString('utf8');
}

function mergeCA(...args: (string | string[])[]): string {
  const ca = new Set<string>();
  for (const item of args) {
    if (!item) continue;
    const caList = Array.isArray(item) ? item : [item];
    for (const cert of caList) {
      if (cert) {
        ca.add(certToString(cert));
      }
    }
  }
  return [...ca].join('\n');
}

function getNodeExtraCACerts(): string[] {
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
    console.error(`Failed to read NODE_EXTRA_CA_CERTS from ${extraCACertPath}:`, (err as Error).message);
  }

  return [];
}

/**
 * Get CA certificates
 * 
 * Generic function to get CA certificates
 * - System CA certificates (From OS)
 * - Root CA certificates (From Node)
 * - Custom CA certificates (From user-provided file)
 * - NODE_EXTRA_CA_CERTS (From environment variable)
 * 
 * If no custom CA certificate file path is provided
 *  → return system CA certificates and root certificates + NODE_EXTRA_CA_CERTS
 * 
 * If custom CA certificate file path is provided
 *  → use custom CA certificate file + NODE_EXTRA_CA_CERTS
 *  → ignore system + root certificates if shouldKeepDefaultCerts is false
 * 
 * @param caCertFilePath - path to custom CA certificate file
 * @param shouldKeepDefaultCerts - whether to keep default CA certificates
 * @returns {T_CACertificatesResult} - CA certificates and their count
 */

const getCACertificates = ({ caCertFilePath, shouldKeepDefaultCerts = true }: T_CACertificatesOptions): T_CACertificatesResult => {
  try {
    let caCertificates = '';
    let caCertificatesCount = {
      system: 0,
      root: 0,
      custom: 0,
      extra: 0
    }

    let systemCerts: string[] = [];
    let rootCerts: string[] = [];
    let customCerts: string[] = [];
    let nodeExtraCerts: string[] = [];


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
          console.error(`Failed to read custom CA certificate from ${caCertFilePath}:`, (err as Error).message);
          throw new Error(`Unable to load custom CA certificate: ${(err as Error).message}`);
        }
      } else {
        throw new Error(`Invalid custom CA certificate path: ${caCertFilePath}`);
      }

      if (shouldKeepDefaultCerts) {
        // get system certs
        systemCerts = getSystemCerts();
        caCertificatesCount.system = systemCerts.length;

        // get root certs
        rootCerts = [...tls.rootCertificates];
        caCertificatesCount.root = rootCerts.length;
      }
    } else {
      // get system certs
      systemCerts = getSystemCerts();
      caCertificatesCount.system = systemCerts.length;

      // get root certs
      rootCerts = [...tls.rootCertificates];
      caCertificatesCount.root = rootCerts.length;
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
    console.error('Error configuring CA certificates:', (err as Error).message);
    throw err; // Re-throw certificate loading errors as they're critical
  }
}

export {
  getCACertificates
};