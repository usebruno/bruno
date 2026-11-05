const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Bru = require('../src/bru');
const { executeQuickJsVmAsync } = require('../src/sandbox/quickjs');

describe('bru.getClientCertificate', () => {
  let collectionPath;
  beforeEach(() => {
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-client-cert-'));
    fs.writeFileSync(path.join(collectionPath, 'client.pem'), 'certificate');
    fs.writeFileSync(path.join(collectionPath, 'client.key'), 'private key');
    fs.writeFileSync(path.join(collectionPath, 'client.pfx'), Buffer.from([0, 128, 255]));
  });
  afterEach(() => fs.rmSync(collectionPath, { recursive: true, force: true }));

  const makeBru = (certs) => new Bru({
    collectionPath,
    certsAndProxyConfig: { collectionPath, clientCertificates: { certs } }
  });
  const pem = { domain: 'api.example.com', certFilePath: 'client.pem', keyFilePath: 'client.key' };

  it('returns PEM strings that a script can pass to an HTTPS client', () => {
    expect(makeBru([pem]).getClientCertificate('https://api.example.com/token')).toEqual({
      cert: 'certificate', key: 'private key', passphrase: undefined
    });
  });

  it('returns PFX as base64, preserving all binary bytes', () => {
    const certificate = makeBru([{ domain: pem.domain, type: 'pfx', pfxFilePath: 'client.pfx' }])
      .getClientCertificate('https://api.example.com');
    expect(Buffer.from(certificate.pfx, 'base64')).toEqual(Buffer.from([0, 128, 255]));
  });

  it('returns undefined without configured certificates', () => {
    expect(new Bru({ collectionPath }).getClientCertificate('https://api.example.com')).toBeUndefined();
  });

  it('makes matching certificate contents available in Safe Mode', async () => {
    const bru = makeBru([pem]);
    await executeQuickJsVmAsync({
      script: 'bru.setVar("certificate", bru.getClientCertificate("https://api.example.com/token"));',
      context: { bru }, collectionPath
    });
    expect(bru.getVar('certificate')).toMatchObject({ cert: 'certificate', key: 'private key' });
  });

  it.each([
    ['api.example.com', 'https://api.example.com:443@attacker.test'],
    ['*.example.com', 'https://attacker.test/path/.example.com']
  ])('does not expose %s credentials to a misleading URL in Safe Mode', async (domain, requestUrl) => {
    const bru = makeBru([{ ...pem, domain }]);
    await executeQuickJsVmAsync({
      script: `bru.setVar("certificate", bru.getClientCertificate(${JSON.stringify(requestUrl)}));`,
      context: { bru }, collectionPath
    });
    expect(bru.getVar('certificate')).toBeUndefined();
  });
});
