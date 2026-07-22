import parseCollection from './parseCollection';
import stringifyCollection from './stringifyCollection';
import { stringifyYml } from './utils';

const makePemCert = (overrides: any = {}) => ({
  domain: 'example.com',
  type: 'cert',
  name: '',
  enabled: true,
  certFilePath: 'cert.pem',
  keyFilePath: 'key.pem',
  passphrase: '',
  ...overrides
});

const makePfxCert = (overrides: any = {}) => ({
  domain: 'example.com',
  type: 'pfx',
  name: '',
  enabled: true,
  pfxFilePath: 'cert.pfx',
  passphrase: '',
  ...overrides
});

const roundTrip = (certs: any[]) => {
  const yml = stringifyCollection({}, { name: 'Test Collection', clientCertificates: { certs } });
  const parsed = parseCollection(yml);
  return { yml, certs: parsed.brunoConfig.clientCertificates?.certs || [] };
};

const parseRawYml = (ymlString: string) =>
  parseCollection(ymlString).brunoConfig.clientCertificates?.certs || [];

describe('client certificate YAML round-trip', () => {
  describe('name field', () => {
    it('persists name through round-trip', () => {
      const { certs } = roundTrip([makePemCert({ name: 'My Cert' })]);
      expect(certs[0].name).toBe('My Cert');
    });

    it('omits name from YAML when empty and reads back as empty string', () => {
      const { yml, certs } = roundTrip([makePemCert({ name: '' })]);
      expect(yml).not.toContain('name: ""');
      expect(certs[0].name).toBe('');
    });

    it('defaults name to empty string when missing in YAML', () => {
      const yml = stringifyYml({
        opencollection: '1.0.0',
        config: {
          clientCertificates: [{
            domain: 'example.com',
            type: 'pem',
            certificateFilePath: 'cert.pem',
            privateKeyFilePath: 'key.pem'
          }]
        }
      });
      expect(parseRawYml(yml)[0].name).toBe('');
    });
  });

  describe('enabled field', () => {
    it('persists enabled: false through round-trip', () => {
      const { yml, certs } = roundTrip([makePfxCert({ enabled: false, passphrase: 'secret' })]);
      expect(yml).toContain('enabled: false');
      expect(certs[0].enabled).toBe(false);
    });

    it('omits enabled from YAML when true and reads back as enabled', () => {
      const { yml, certs } = roundTrip([makePemCert({ enabled: true })]);
      expect(yml).not.toContain('enabled:');
      expect(certs[0].enabled).toBe(true);
    });

    it('defaults to enabled when field is missing in YAML', () => {
      const yml = stringifyYml({
        opencollection: '1.0.0',
        config: {
          clientCertificates: [{
            domain: 'example.com',
            type: 'pkcs12',
            pkcs12FilePath: 'cert.pfx'
          }]
        }
      });
      expect(parseRawYml(yml)[0].enabled).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('parses legacy YAML without name or enabled fields', () => {
      const yml = stringifyYml({
        opencollection: '1.0.0',
        config: {
          clientCertificates: [
            {
              domain: 'api.example.com',
              type: 'pem',
              certificateFilePath: 'certs/cert.pem',
              privateKeyFilePath: 'certs/key.pem',
              passphrase: 'pass123'
            },
            {
              domain: 'other.example.com',
              type: 'pkcs12',
              pkcs12FilePath: 'certs/bundle.pfx'
            }
          ]
        }
      });

      const parsed = parseRawYml(yml);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual(makePemCert({
        domain: 'api.example.com',
        certFilePath: 'certs/cert.pem',
        keyFilePath: 'certs/key.pem',
        passphrase: 'pass123'
      }));
      expect(parsed[1]).toEqual(makePfxCert({
        domain: 'other.example.com',
        pfxFilePath: 'certs/bundle.pfx'
      }));
    });
  });
});
