import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

const clientCertificates = [
  {
    domain: 'localhost',
    type: 'pem',
    certificateFilePath: './certs/client-cert.pem',
    privateKeyFilePath: './certs/client-key.pem',
    passphrase: 'secret',
    disabled: true
  },
  {
    domain: 'example.com',
    type: 'pkcs12',
    pkcs12FilePath: './certs/client.pfx'
  }
];

describe('openCollectionToBruno (import): client certificates', () => {
  it('keeps certificates in the OpenCollection shape', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: { clientCertificates }
    });

    expect(brunoConfig.clientCertificates.certs).toEqual(clientCertificates);
  });

  it('drops certificates with an unrecognised type', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: { clientCertificates: [{ domain: 'a', type: 'jks', pkcs12FilePath: 'x' }, clientCertificates[1]] }
    });

    expect(brunoConfig.clientCertificates.certs).toEqual([clientCertificates[1]]);
  });
});

describe('brunoToOpenCollection (export): client certificates', () => {
  it('writes certificates in the OpenCollection shape, omitting an empty passphrase', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: {
        clientCertificates: {
          certs: [clientCertificates[0], { ...clientCertificates[1], passphrase: '' }]
        }
      },
      items: []
    });

    expect(oc.config.clientCertificates).toEqual(clientCertificates);
  });

  it('still exports the legacy cert/pfx shape', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: {
        clientCertificates: {
          certs: [
            {
              domain: 'localhost',
              type: 'cert',
              certFilePath: './certs/client-cert.pem',
              keyFilePath: './certs/client-key.pem',
              passphrase: 'secret',
              disabled: true
            },
            {
              domain: 'example.com',
              type: 'pfx',
              pfxFilePath: './certs/client.pfx',
              passphrase: ''
            }
          ]
        }
      },
      items: []
    });

    expect(oc.config.clientCertificates).toEqual(clientCertificates);
  });

  it('writes disabled: true only for disabled certs and omits it otherwise', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: { clientCertificates: { certs: [clientCertificates[0], { ...clientCertificates[1], disabled: false }] } },
      items: []
    });

    expect(oc.config.clientCertificates[0].disabled).toBe(true);
    expect(oc.config.clientCertificates[1]).not.toHaveProperty('disabled');
  });
});

describe('client certificates: round-trip', () => {
  it('export then import keeps every certificate field', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: { clientCertificates: { certs: clientCertificates } },
      items: []
    });

    const { brunoConfig } = openCollectionToBruno(oc);

    expect(brunoConfig.clientCertificates.certs).toEqual(clientCertificates);
  });

  it('import then export keeps every certificate field', () => {
    const bruno = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: { clientCertificates }
    });

    const oc = brunoToOpenCollection(bruno);

    expect(oc.config.clientCertificates).toEqual(clientCertificates);
  });
});
