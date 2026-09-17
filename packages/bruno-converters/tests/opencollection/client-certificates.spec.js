import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

describe('openCollectionToBruno (import): client certificates', () => {
  it('reads a per-cert disabled flag when set to true', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: {
        clientCertificates: [
          {
            domain: 'localhost',
            type: 'pem',
            certificateFilePath: './certs/client-cert.pem',
            privateKeyFilePath: './certs/client-key.pem',
            disabled: true
          },
          {
            domain: 'example.com',
            type: 'pkcs12',
            pkcs12FilePath: './certs/client.pfx'
          }
        ]
      }
    });

    expect(brunoConfig.clientCertificates.certs[0].disabled).toBe(true);
    expect(brunoConfig.clientCertificates.certs[1]).not.toHaveProperty('disabled');
  });
});

describe('brunoToOpenCollection (export): client certificates', () => {
  it('writes disabled: true only for disabled certs and omits it otherwise', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: {
        clientCertificates: {
          certs: [
            {
              domain: 'localhost',
              type: 'pem',
              certFilePath: './certs/client-cert.pem',
              keyFilePath: './certs/client-key.pem',
              disabled: true
            },
            {
              domain: 'example.com',
              type: 'pkcs12',
              pfxFilePath: './certs/client.pfx'
            }
          ]
        }
      },
      items: []
    });

    expect(oc.config.clientCertificates[0].disabled).toBe(true);
    expect(oc.config.clientCertificates[1]).not.toHaveProperty('disabled');
  });
});

describe('client certificates: export then import keeps the disabled flag', () => {
  it('round-trips a disabled cert', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: {
        clientCertificates: {
          certs: [
            {
              domain: 'localhost',
              type: 'pem',
              certFilePath: './certs/client-cert.pem',
              keyFilePath: './certs/client-key.pem',
              passphrase: 'secret',
              disabled: true
            }
          ]
        }
      },
      items: []
    });

    const { brunoConfig } = openCollectionToBruno(oc);

    expect(brunoConfig.clientCertificates.certs[0].disabled).toBe(true);
  });
});
