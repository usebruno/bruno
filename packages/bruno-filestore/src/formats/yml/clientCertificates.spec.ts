import parseCollection from './parseCollection';
import stringifyCollection from './stringifyCollection';
import { stringifyYml } from './utils';

/**
 * Helper: build a minimal brunoConfig with client certificates and stringify it,
 * then parse the result back and return the parsed certs.
 */
const roundTrip = (certs: any[]) => {
  const brunoConfig = {
    name: 'Test Collection',
    clientCertificates: { certs }
  };
  const yml = stringifyCollection({}, brunoConfig);
  const parsed = parseCollection(yml);
  return parsed.brunoConfig.clientCertificates?.certs || [];
};

/**
 * Helper: build raw YAML (as if hand-written or from an older Bruno version)
 * and parse it through the real parseCollection.
 */
const parseRawYml = (ymlString: string) => {
  const parsed = parseCollection(ymlString);
  return parsed.brunoConfig.clientCertificates?.certs || [];
};

describe('client certificate YAML round-trip', () => {
  describe('name field', () => {
    it('should persist name through round-trip', () => {
      const certs = [{
        domain: 'example.com',
        type: 'cert',
        name: 'My Cert',
        enabled: true,
        certFilePath: 'cert.pem',
        keyFilePath: 'key.pem',
        passphrase: ''
      }];

      const parsed = roundTrip(certs);
      expect(parsed[0].name).toBe('My Cert');
    });

    it('should omit name from YAML when empty', () => {
      const certs = [{
        domain: 'example.com',
        type: 'cert',
        name: '',
        enabled: true,
        certFilePath: 'cert.pem',
        keyFilePath: 'key.pem',
        passphrase: ''
      }];

      const brunoConfig = {
        name: 'Test Collection',
        clientCertificates: { certs }
      };
      const yml = stringifyCollection({}, brunoConfig);
      expect(yml).not.toContain('name: ""');

      const parsed = parseCollection(yml);
      const parsedCerts = parsed.brunoConfig.clientCertificates?.certs || [];
      expect(parsedCerts[0].name).toBe('');
    });

    it('should default name to empty string when missing in YAML', () => {
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

      const parsed = parseRawYml(yml);
      expect(parsed[0].name).toBe('');
    });
  });

  describe('enabled field', () => {
    it('should persist enabled: false through round-trip', () => {
      const certs = [{
        domain: 'example.com',
        type: 'pfx',
        name: '',
        enabled: false,
        pfxFilePath: 'cert.pfx',
        passphrase: 'secret'
      }];

      const brunoConfig = {
        name: 'Test Collection',
        clientCertificates: { certs }
      };
      const yml = stringifyCollection({}, brunoConfig);
      expect(yml).toContain('enabled: false');

      const parsed = parseCollection(yml);
      const parsedCerts = parsed.brunoConfig.clientCertificates?.certs || [];
      expect(parsedCerts[0].enabled).toBe(false);
    });

    it('should omit enabled from YAML when true (default)', () => {
      const certs = [{
        domain: 'example.com',
        type: 'cert',
        name: '',
        enabled: true,
        certFilePath: 'cert.pem',
        keyFilePath: 'key.pem',
        passphrase: ''
      }];

      const brunoConfig = {
        name: 'Test Collection',
        clientCertificates: { certs }
      };
      const yml = stringifyCollection({}, brunoConfig);
      expect(yml).not.toContain('enabled:');

      const parsed = parseCollection(yml);
      const parsedCerts = parsed.brunoConfig.clientCertificates?.certs || [];
      expect(parsedCerts[0].enabled).toBe(true);
    });

    it('should default to enabled when field is missing in YAML', () => {
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

      const parsed = parseRawYml(yml);
      expect(parsed[0].enabled).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('should parse legacy YAML without name or enabled fields', () => {
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

      expect(parsed[0]).toEqual({
        domain: 'api.example.com',
        type: 'cert',
        name: '',
        enabled: true,
        certFilePath: 'certs/cert.pem',
        keyFilePath: 'certs/key.pem',
        passphrase: 'pass123'
      });

      expect(parsed[1]).toEqual({
        domain: 'other.example.com',
        type: 'pfx',
        name: '',
        enabled: true,
        pfxFilePath: 'certs/bundle.pfx',
        passphrase: ''
      });
    });

    it('should round-trip mixed enabled/disabled certs with names', () => {
      const certs = [
        {
          domain: 'api.example.com',
          type: 'cert',
          name: 'Production',
          enabled: true,
          certFilePath: 'cert.pem',
          keyFilePath: 'key.pem',
          passphrase: ''
        },
        {
          domain: 'api.example.com',
          type: 'cert',
          name: 'Staging',
          enabled: false,
          certFilePath: 'staging-cert.pem',
          keyFilePath: 'staging-key.pem',
          passphrase: ''
        }
      ];

      const parsed = roundTrip(certs);

      expect(parsed[0].name).toBe('Production');
      expect(parsed[0].enabled).toBe(true);
      expect(parsed[1].name).toBe('Staging');
      expect(parsed[1].enabled).toBe(false);
    });
  });
});
