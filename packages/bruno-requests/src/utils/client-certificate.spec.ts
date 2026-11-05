import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getClientCertificate } from './http-https-agents';

type CertificateConfig = NonNullable<Parameters<typeof getClientCertificate>[0]['clientCertificates']>;

describe('getClientCertificate', () => {
  let collectionPath: string;
  beforeEach(() => {
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-client-cert-'));
    fs.writeFileSync(path.join(collectionPath, 'client.pem'), 'certificate');
    fs.writeFileSync(path.join(collectionPath, 'client.key'), 'private key');
    fs.writeFileSync(path.join(collectionPath, 'client.pfx'), Buffer.from([0, 128, 255]));
  });
  afterEach(() => fs.rmSync(collectionPath, { recursive: true, force: true }));

  const pem = { domain: 'api.example.com', certFilePath: 'client.pem', keyFilePath: 'client.key' };
  const resolve = (certs: CertificateConfig['certs'], requestUrl = 'https://api.example.com/token') =>
    getClientCertificate({ collectionPath, requestUrl, clientCertificates: { certs } });

  it('reads relative PEM paths and passphrases without changing the configuration', () => {
    const certificate = { ...pem, passphrase: 'test passphrase' };
    expect(resolve([certificate])).toEqual({
      cert: Buffer.from('certificate'), key: Buffer.from('private key'), passphrase: 'test passphrase'
    });
    expect(certificate.certFilePath).toBe('client.pem');
  });

  it('reads an absolute PFX path without corrupting binary contents', () => {
    expect(resolve([{ domain: pem.domain, type: 'pfx', pfxFilePath: path.join(collectionPath, 'client.pfx') }]))
      .toEqual({ pfx: Buffer.from([0, 128, 255]), passphrase: undefined });
  });

  it('skips disabled entries and uses the first enabled matching certificate', () => {
    expect(resolve([{ ...pem, disabled: true, certFilePath: 'missing' }, pem])).toHaveProperty('cert');
  });

  it('supports wildcard domains and explicit ports', () => {
    expect(resolve([{ ...pem, domain: '*.example.com:9443' }], 'https://auth.example.com:9443/token')).toHaveProperty('key');
  });

  it('does not match a different hostname sharing the configured prefix', () => {
    expect(resolve([pem], 'https://api.example.com.attacker.test/token')).toBeUndefined();
  });

  it('returns undefined without a match or configuration', () => {
    expect(resolve([pem], 'https://other.example.com')).toBeUndefined();
    expect(getClientCertificate({ collectionPath, requestUrl: 'https://api.example.com' })).toBeUndefined();
  });

  it('reports missing certificate files', () => {
    expect(() => resolve([{ ...pem, certFilePath: 'missing.pem' }])).toThrow('Error reading cert/key file');
  });
});
