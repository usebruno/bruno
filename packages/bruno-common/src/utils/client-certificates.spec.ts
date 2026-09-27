import {
  normalizeClientCertificate,
  normalizeClientCertificates,
  toLegacyClientCertificate,
  toLegacyClientCertificates,
  toOpenCollectionClientCertificates
} from './client-certificates';

const pem = {
  domain: 'localhost',
  type: 'pem' as const,
  certificateFilePath: './certs/client-cert.pem',
  privateKeyFilePath: './certs/client-key.pem',
  passphrase: 'secret',
  disabled: true
};

const pkcs12 = {
  domain: 'example.com',
  type: 'pkcs12' as const,
  pkcs12FilePath: './certs/client.pfx',
  passphrase: ''
};

const legacyCert = {
  domain: 'localhost',
  type: 'cert' as const,
  certFilePath: './certs/client-cert.pem',
  keyFilePath: './certs/client-key.pem',
  passphrase: 'secret',
  disabled: true
};

const legacyPfx = {
  domain: 'example.com',
  type: 'pfx' as const,
  pfxFilePath: './certs/client.pfx',
  passphrase: ''
};

describe('normalizeClientCertificate', () => {
  it('upgrades legacy cert and pfx entries', () => {
    expect(normalizeClientCertificate(legacyCert)).toEqual(pem);
    expect(normalizeClientCertificate(legacyPfx)).toEqual(pkcs12);
  });

  it('passes pem and pkcs12 entries through unchanged', () => {
    expect(normalizeClientCertificate(pem)).toEqual(pem);
    expect(normalizeClientCertificate(pkcs12)).toEqual(pkcs12);
  });

  it('treats a missing type as the legacy cert type', () => {
    const { type, ...untyped } = legacyCert;
    expect(normalizeClientCertificate(untyped)).toEqual(pem);
  });

  it('omits passphrase and disabled when they are absent', () => {
    expect(normalizeClientCertificate({ domain: 'a', type: 'pfx', pfxFilePath: 'x' })).toEqual({
      domain: 'a',
      type: 'pkcs12',
      pkcs12FilePath: 'x'
    });
  });

  it('keeps an explicit disabled: false so the on-disk value survives a round-trip', () => {
    expect(normalizeClientCertificate({ ...legacyPfx, disabled: false })).toEqual({ ...pkcs12, disabled: false });
  });

  it('rejects unknown types and non-objects', () => {
    expect(normalizeClientCertificate({ domain: 'a', type: 'jks' })).toBeNull();
    expect(normalizeClientCertificate(null)).toBeNull();
    expect(normalizeClientCertificate('cert')).toBeNull();
  });
});

describe('normalizeClientCertificates', () => {
  it('drops unrecognised entries and tolerates a non-array', () => {
    expect(normalizeClientCertificates([legacyCert, { type: 'jks' }, pkcs12])).toEqual([pem, pkcs12]);
    expect(normalizeClientCertificates(undefined)).toEqual([]);
  });
});

describe('toLegacyClientCertificate', () => {
  it('downgrades pem and pkcs12 entries', () => {
    expect(toLegacyClientCertificate(pem)).toEqual(legacyCert);
    expect(toLegacyClientCertificate(pkcs12)).toEqual(legacyPfx);
  });

  it('passes legacy entries through unchanged', () => {
    expect(toLegacyClientCertificate(legacyCert)).toEqual(legacyCert);
    expect(toLegacyClientCertificate(legacyPfx)).toEqual(legacyPfx);
  });

  it('round-trips losslessly in both directions', () => {
    for (const cert of [pem, pkcs12, { ...pkcs12, disabled: false }]) {
      expect(normalizeClientCertificate(toLegacyClientCertificate(cert))).toEqual(cert);
    }
    for (const cert of [legacyCert, legacyPfx]) {
      expect(toLegacyClientCertificate(normalizeClientCertificate(cert))).toEqual(cert);
    }
  });

  it('maps a list', () => {
    expect(toLegacyClientCertificates([pem, pkcs12])).toEqual([legacyCert, legacyPfx]);
  });
});

describe('toOpenCollectionClientCertificates', () => {
  it('omits an empty passphrase and a false disabled flag', () => {
    expect(toOpenCollectionClientCertificates([pem, { ...pkcs12, disabled: false }])).toEqual([
      pem,
      { domain: 'example.com', type: 'pkcs12', pkcs12FilePath: './certs/client.pfx' }
    ]);
  });

  it('accepts legacy input', () => {
    expect(toOpenCollectionClientCertificates([legacyPfx])).toEqual([
      { domain: 'example.com', type: 'pkcs12', pkcs12FilePath: './certs/client.pfx' }
    ]);
  });
});
