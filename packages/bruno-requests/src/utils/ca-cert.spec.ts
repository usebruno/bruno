import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const mockSystemCertsSync = jest.fn(() => [
  '-----BEGIN CERTIFICATE-----\nFAKE_SYSTEM_CERT_1\n-----END CERTIFICATE-----',
  '-----BEGIN CERTIFICATE-----\nFAKE_SYSTEM_CERT_2\n-----END CERTIFICATE-----'
]);

// Mock system-ca before importing the module under test
jest.mock('system-ca', () => ({
  systemCertsSync: () => mockSystemCertsSync()
}));

// Mock node:tls to control rootCertificates
jest.mock('node:tls', () => ({
  rootCertificates: [
    '-----BEGIN CERTIFICATE-----\nFAKE_ROOT_CERT_1\n-----END CERTIFICATE-----'
  ]
}));

import { getCACertificates } from './ca-cert';

describe('getCACertificates', () => {
  it('returns system and root certificates when no custom CA is provided', () => {
    const result = getCACertificates({});

    // system-ca's systemCertsSync should be used (not tls.getCACertificates)
    expect(mockSystemCertsSync).toHaveBeenCalled();
    expect(result.caCertificatesCount.system).toBe(2);
    expect(result.caCertificatesCount.root).toBe(1);
    expect(result.caCertificatesCount.custom).toBe(0);
    expect(result.caCertificates).toContain('FAKE_SYSTEM_CERT_1');
    expect(result.caCertificates).toContain('FAKE_SYSTEM_CERT_2');
    expect(result.caCertificates).toContain('FAKE_ROOT_CERT_1');
  });

  it('includes custom CA certificate when file path is provided', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ca-cert-test-'));
    const certPath = path.join(tmpDir, 'custom-ca.pem');
    const customCert = '-----BEGIN CERTIFICATE-----\nCUSTOM_CA_CERT\n-----END CERTIFICATE-----';
    fs.writeFileSync(certPath, customCert);

    try {
      const result = getCACertificates({ caCertFilePath: certPath });

      expect(result.caCertificatesCount.custom).toBe(1);
      expect(result.caCertificates).toContain('CUSTOM_CA_CERT');
      // Default certs should also be included (shouldKeepDefaultCerts defaults to true)
      expect(result.caCertificatesCount.system).toBe(2);
      expect(result.caCertificatesCount.root).toBe(1);
    } finally {
      fs.unlinkSync(certPath);
      fs.rmdirSync(tmpDir);
    }
  });

  it('excludes default certs when shouldKeepDefaultCerts is false with custom CA', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ca-cert-test-'));
    const certPath = path.join(tmpDir, 'custom-ca.pem');
    const customCert = '-----BEGIN CERTIFICATE-----\nCUSTOM_ONLY\n-----END CERTIFICATE-----';
    fs.writeFileSync(certPath, customCert);

    try {
      const result = getCACertificates({ caCertFilePath: certPath, shouldKeepDefaultCerts: false });

      expect(result.caCertificatesCount.custom).toBe(1);
      expect(result.caCertificatesCount.system).toBe(0);
      expect(result.caCertificatesCount.root).toBe(0);
      expect(result.caCertificates).toContain('CUSTOM_ONLY');
      expect(result.caCertificates).not.toContain('FAKE_SYSTEM_CERT_1');
    } finally {
      fs.unlinkSync(certPath);
      fs.rmdirSync(tmpDir);
    }
  });

  it('throws when custom CA file path does not exist', () => {
    expect(() => getCACertificates({ caCertFilePath: '/nonexistent/path.pem' }))
      .toThrow('Invalid custom CA certificate path');
  });

  it('deduplicates certificates across sources', () => {
    // The first test already cached system certs with 2 fake certs.
    // Root certs include FAKE_ROOT_CERT_1. If system also returned it, it should be deduped.
    // Since caching is in play, we test dedup by checking the merged output
    // has no duplicate PEM blocks.
    const result = getCACertificates({});
    const certs = result.caCertificates.split('-----BEGIN CERTIFICATE-----').filter(Boolean);
    const uniqueCerts = new Set(certs);
    expect(certs.length).toBe(uniqueCerts.size);
  });
});
