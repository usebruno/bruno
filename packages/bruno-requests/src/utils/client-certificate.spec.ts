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

  it.each([
    ['api.example.com', 'https://api.example.com:443@attacker.test'],
    ['api.example.com', 'https://api.example.com:9443@attacker.test/token'],
    ['*.example.com', 'https://attacker.test/path/.example.com'],
    ['*.example.com', 'https://attacker.test/?next=.example.com'],
    ['*.example.com', 'https://attacker.test/#.example.com'],
    ['*.example.com', 'https://user.example.com@attacker.test'],
    ['*.example.com:9443', 'https://attacker.test/path/.example.com:9443']
  ])('does not select %s from userinfo, a path, query, or fragment in %s', (domain, requestUrl) => {
    expect(resolve([{ ...pem, domain }], requestUrl)).toBeUndefined();
  });

  it.each([
    ['*.example.com', 'https://nested.api.example.com/token'],
    ['api.example.com:9443', 'https://api.example.com:94430/token'],
    ['api.example.com:9443', 'https://api.example.com/token'],
    ['api.example.com', 'not a URL'],
    ['api.example.com', 'https://'],
    ['api.example.com/path', 'https://api.example.com/path'],
    ['user@api.example.com', 'https://user@api.example.com'],
    ['api.example.com:', 'https://api.example.com:8443/token'],
    ['api.example.com:', 'https://api.example.com/token'],
    ['[::1]:', 'https://[::1]:9443/token'],
    ['api.example.com:9443', 'wss://api.example.com/socket'],
    ['api.example.com', 'ws://api.example.com/socket'],
    ['api.example.com', 'http://api.example.com/token']
  ])('rejects a different authority or invalid configuration: %s / %s', (domain, requestUrl) => {
    expect(resolve([{ ...pem, domain }], requestUrl)).toBeUndefined();
  });

  it.each([
    ['api.example.com', 'https://API.EXAMPLE.COM/token'],
    ['api.example.com', 'https://user:password@api.example.com:9443/token'],
    ['api.example.com:443', 'https://api.example.com/token'],
    ['api.example.com:443', 'https://api.example.com:443/token'],
    ['api.example.com:9443', 'https://api.example.com:9443/token'],
    ['*.example.com', 'https://api.example.com/token'],
    ['api*.example.com', 'https://api1.example.com/token'],
    ['a*b*c.example.com', 'https://axbyc.example.com/token'],
    ['localhost:9443', 'https://localhost:9443/token'],
    ['[::1]:9443', 'https://[::1]:9443/token'],
    ['api.example.com:9443', 'grpcs://api.example.com:9443/token'],
    ['api.example.com', 'wss://api.example.com/socket'],
    ['api.example.com:443', 'wss://api.example.com/socket'],
    ['*.example.com:9443', 'wss://ws.example.com:9443/socket']
  ])('matches the parsed authority for %s / %s', (domain, requestUrl) => {
    expect(resolve([{ ...pem, domain }], requestUrl)).toHaveProperty('cert');
  });

  it('does not allow wildcard prefixes and suffixes to overlap', () => {
    expect(resolve([{ ...pem, domain: 'ab*bc.example.com' }], 'https://abc.example.com')).toBeUndefined();
  });

  it.each(['api.example.com:443 ', 'api.example.com:44\t3'])('does not ignore a configured port containing whitespace: %s', (domain) => {
    expect(resolve([{ ...pem, domain }], 'https://api.example.com:9443')).toBeUndefined();
  });

  it('returns undefined without a match or configuration', () => {
    expect(resolve([pem], 'https://other.example.com')).toBeUndefined();
    expect(getClientCertificate({ collectionPath, requestUrl: 'https://api.example.com' })).toBeUndefined();
  });

  it('reports missing certificate files', () => {
    expect(() => resolve([{ ...pem, certFilePath: 'missing.pem' }])).toThrow('Error reading cert/key file');
  });
});
