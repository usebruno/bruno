import fs from 'node:fs';
import path from 'node:path';

export interface ClientCertConfig {
  domain?: string;
  type?: 'cert' | 'pfx';
  certFilePath?: string;
  keyFilePath?: string;
  pfxFilePath?: string;
  passphrase?: string;
}

export interface ResolvedClientCert {
  cert?: Buffer;
  key?: Buffer;
  pfx?: Buffer;
  passphrase?: string;
}

export interface ResolveClientCertOptions {
  configs: ClientCertConfig[];
  requestUrl: string;
  collectionPath: string;
  interpolateString?: (str: string | undefined) => string | undefined;
}

const createDomainRegex = (domain: string): RegExp => {
  const hostRegex = '^(https:\\/\\/|grpc:\\/\\/|grpcs:\\/\\/|ws:\\/\\/|wss:\\/\\/)?'
    + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
  return new RegExp(hostRegex);
};

export const resolveClientCert = (options: ResolveClientCertOptions): ResolvedClientCert | null => {
  const { configs, requestUrl, collectionPath, interpolateString = (s) => s } = options;

  for (const clientCert of configs) {
    const domain = interpolateString(clientCert?.domain);
    const type = clientCert?.type || 'cert';

    if (!domain) continue;

    const domainRegex = createDomainRegex(domain);
    const interpolatedUrl = interpolateString(requestUrl);

    if (!interpolatedUrl || !interpolatedUrl.match(domainRegex)) continue;

    const result: ResolvedClientCert = {};

    if (type === 'cert') {
      try {
        let certFilePath = interpolateString(clientCert?.certFilePath);
        if (certFilePath) {
          certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collectionPath, certFilePath);
          result.cert = fs.readFileSync(certFilePath);
        }

        let keyFilePath = interpolateString(clientCert?.keyFilePath);
        if (keyFilePath) {
          keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collectionPath, keyFilePath);
          result.key = fs.readFileSync(keyFilePath);
        }
      } catch (err) {
        console.error('Error reading cert/key file', err);
        throw new Error('Error reading cert/key file: ' + (err as Error).message);
      }
    } else if (type === 'pfx') {
      try {
        let pfxFilePath = interpolateString(clientCert?.pfxFilePath);
        if (pfxFilePath) {
          pfxFilePath = path.isAbsolute(pfxFilePath) ? pfxFilePath : path.join(collectionPath, pfxFilePath);
          result.pfx = fs.readFileSync(pfxFilePath);
        }
      } catch (err) {
        console.error('Error reading pfx file', err);
        throw new Error('Error reading pfx file: ' + (err as Error).message);
      }
    }

    const passphrase = interpolateString(clientCert.passphrase);
    if (passphrase) {
      result.passphrase = passphrase;
    }

    return result;
  }

  return null;
};
