/**
 * Client certificates follow the OpenCollection shape in memory:
 *
 *   { domain, type: 'pem',    certificateFilePath, privateKeyFilePath, passphrase?, disabled? }
 *   { domain, type: 'pkcs12', pkcs12FilePath,                          passphrase?, disabled? }
 *
 * `bruno.json` and the app preferences file predate that shape and store the legacy form
 * (`type: 'cert' | 'pfx'` with `certFilePath` / `keyFilePath` / `pfxFilePath`). Those files
 * are shared across Bruno versions, so they keep the legacy shape on disk: the helpers here
 * upgrade on read and downgrade on write. Nothing else should need to know about the legacy keys.
 */

export interface PemClientCertificate {
  domain: string;
  type: 'pem';
  certificateFilePath: string;
  privateKeyFilePath: string;
  passphrase?: string;
  disabled?: boolean;
}

export interface Pkcs12ClientCertificate {
  domain: string;
  type: 'pkcs12';
  pkcs12FilePath: string;
  passphrase?: string;
  disabled?: boolean;
}

export type ClientCertificate = PemClientCertificate | Pkcs12ClientCertificate;

export interface LegacyCertClientCertificate {
  domain: string;
  type: 'cert';
  certFilePath: string;
  keyFilePath: string;
  passphrase?: string;
  disabled?: boolean;
}

export interface LegacyPfxClientCertificate {
  domain: string;
  type: 'pfx';
  pfxFilePath: string;
  passphrase?: string;
  disabled?: boolean;
}

export type LegacyClientCertificate = LegacyCertClientCertificate | LegacyPfxClientCertificate;

const CLIENT_CERTIFICATE_TYPES = ['pem', 'pkcs12', 'cert', 'pfx'] as const;

const isPlainObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const optionalFields = (cert: Record<string, any>) => ({
  ...(typeof cert.passphrase === 'string' && { passphrase: cert.passphrase }),
  ...(typeof cert.disabled === 'boolean' && { disabled: cert.disabled })
});

/**
 * Upgrades a legacy cert to the OpenCollection shape. A cert already in that shape is copied
 * through unchanged. A cert with no `type` is treated as the legacy `cert` type, which is what
 * the request runtime has always assumed. Returns null for anything unrecognised.
 */
export const normalizeClientCertificate = (cert: unknown): ClientCertificate | null => {
  if (!isPlainObject(cert)) {
    return null;
  }

  const type = cert.type ?? 'cert';
  if (!CLIENT_CERTIFICATE_TYPES.includes(type)) {
    return null;
  }

  const domain = typeof cert.domain === 'string' ? cert.domain : '';

  if (type === 'pem' || type === 'cert') {
    return {
      domain,
      type: 'pem',
      certificateFilePath: cert.certificateFilePath ?? cert.certFilePath ?? '',
      privateKeyFilePath: cert.privateKeyFilePath ?? cert.keyFilePath ?? '',
      ...optionalFields(cert)
    };
  }

  return {
    domain,
    type: 'pkcs12',
    pkcs12FilePath: cert.pkcs12FilePath ?? cert.pfxFilePath ?? '',
    ...optionalFields(cert)
  };
};

export const normalizeClientCertificates = (certs: unknown): ClientCertificate[] => {
  if (!Array.isArray(certs)) {
    return [];
  }
  return certs
    .map(normalizeClientCertificate)
    .filter((cert): cert is ClientCertificate => cert !== null);
};

/**
 * Downgrades a cert to the legacy shape for `bruno.json` and the preferences file.
 * Inverse of `normalizeClientCertificate`; the two round-trip losslessly.
 */
export const toLegacyClientCertificate = (cert: unknown): LegacyClientCertificate | null => {
  const normalized = normalizeClientCertificate(cert);
  if (!normalized) {
    return null;
  }

  if (normalized.type === 'pem') {
    return {
      domain: normalized.domain,
      type: 'cert',
      certFilePath: normalized.certificateFilePath,
      keyFilePath: normalized.privateKeyFilePath,
      ...optionalFields(normalized)
    };
  }

  return {
    domain: normalized.domain,
    type: 'pfx',
    pfxFilePath: normalized.pkcs12FilePath,
    ...optionalFields(normalized)
  };
};

export const toLegacyClientCertificates = (certs: unknown): LegacyClientCertificate[] => {
  if (!Array.isArray(certs)) {
    return [];
  }
  return certs
    .map(toLegacyClientCertificate)
    .filter((cert): cert is LegacyClientCertificate => cert !== null);
};

/**
 * The shape written to `opencollection.yml` and OpenCollection exports: the in-memory shape
 * with an empty passphrase and a false `disabled` flag omitted.
 */
export const toOpenCollectionClientCertificates = (certs: unknown): ClientCertificate[] => {
  return normalizeClientCertificates(certs).map((cert) => {
    const { passphrase, disabled, ...rest } = cert;
    return {
      ...rest,
      ...(passphrase && { passphrase }),
      ...(disabled === true && { disabled: true })
    } as ClientCertificate;
  });
};
