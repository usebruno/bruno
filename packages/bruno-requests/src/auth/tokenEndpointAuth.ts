// OAuth 2.0 client authentication at the token endpoint.
// Implements the five methods from RFC 7591 §2 / OIDC Core 1.0 §9:
//   - client_secret_basic   — HTTP Basic header (RFC 6749 §2.3.1)
//   - client_secret_post    — client_id + client_secret as form params (RFC 6749 §2.3.1)
//   - client_secret_jwt     — JWT signed with the client_secret (HMAC) (OIDC Core §9 / RFC 7523)
//   - private_key_jwt       — JWT signed with the client's private key (RFC 7523 §2.2)
//   - none                  — public client, no authentication
//
// The two JWT methods produce a `client_assertion` parameter together with
// `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer` (RFC 7521 §4.2).

import crypto from 'node:crypto';
import nodePath from 'node:path';
import { SignJWT, importPKCS8, importJWK, type JWK, type KeyLike } from 'jose';

import { readKeyFile } from './keyMaterial';

export type TokenEndpointAuthMethod
  = | 'client_secret_basic'
    | 'client_secret_post'
    | 'client_secret_jwt'
    | 'private_key_jwt'
    | 'none';

export type TokenEndpointAuthSigningAlg
  = | 'HS256' | 'HS384' | 'HS512'
    | 'RS256' | 'RS384' | 'RS512'
    | 'PS256' | 'PS384' | 'PS512'
    | 'ES256' | 'ES384' | 'ES512'
    | 'EdDSA';

export interface AdditionalClaim {
  name?: string;
  value?: string;
  enabled?: boolean;
}

export interface TokenEndpointAuthOptions {
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
  tokenEndpointAuthSigningAlg?: TokenEndpointAuthSigningAlg | '';
  clientId?: string;
  clientSecret?: string;
  accessTokenUrl: string;

  // private_key_jwt / client_secret_jwt only
  privateKey?: string;
  privateKeyType?: 'text' | 'file' | '';
  privateKeyFormat?: 'pem' | 'jwk' | '';
  keyId?: string;
  audience?: string;
  assertionLifetime?: number | null;
  additionalClaims?: AdditionalClaim[];

  // Used to resolve relative `privateKey` file paths against the collection directory.
  collectionPath?: string;

  // Legacy field — only honoured when `tokenEndpointAuthMethod` is undefined, for collections
  // that have not yet been re-saved by a Bruno build that knows the new field.
  credentialsPlacement?: 'body' | 'basic_auth_header';
}

export interface TokenEndpointAuthResult {
  headers: Record<string, string>;
  bodyParams: Record<string, string>;
}

const JWT_BEARER_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const DEFAULT_ASSERTION_LIFETIME_SECONDS = 300;
const DEFAULT_SECRET_JWT_ALG: TokenEndpointAuthSigningAlg = 'HS256';
const DEFAULT_PRIVATE_KEY_JWT_ALG: TokenEndpointAuthSigningAlg = 'RS256';

const resolveTokenEndpointAuthMethod = (opts: TokenEndpointAuthOptions): TokenEndpointAuthMethod => {
  if (opts.tokenEndpointAuthMethod) {
    return opts.tokenEndpointAuthMethod;
  }
  // Legacy migration: collections saved by older Bruno builds carry credentialsPlacement instead.
  // `basic_auth_header` -> client_secret_basic; anything else -> client_secret_post (matches the
  // pre-rename default of credentialsPlacement: 'body').
  return opts.credentialsPlacement === 'basic_auth_header'
    ? 'client_secret_basic'
    : 'client_secret_post';
};

const buildClaims = (opts: TokenEndpointAuthOptions): Record<string, unknown> => {
  const now = Math.floor(Date.now() / 1000);
  const lifetime = (opts.assertionLifetime && opts.assertionLifetime > 0)
    ? opts.assertionLifetime
    : DEFAULT_ASSERTION_LIFETIME_SECONDS;

  const claims: Record<string, unknown> = {
    iss: opts.clientId,
    sub: opts.clientId,
    aud: opts.audience && opts.audience.trim() !== '' ? opts.audience : opts.accessTokenUrl,
    iat: now,
    exp: now + lifetime,
    jti: crypto.randomUUID()
  };

  for (const claim of opts.additionalClaims || []) {
    if (claim?.enabled && claim?.name) {
      claims[claim.name] = claim.value ?? '';
    }
  }

  return claims;
};

const resolveKeyMaterial = (opts: TokenEndpointAuthOptions): string => {
  const raw = opts.privateKey || '';
  if (!raw) {
    throw new Error('private_key_jwt requires a private key — set `private_key` in the OAuth2 block');
  }
  if (opts.privateKeyType === 'file') {
    let filePath = raw;
    if (opts.collectionPath && !nodePath.isAbsolute(filePath)) {
      filePath = nodePath.join(opts.collectionPath, filePath);
    }
    return readKeyFile(filePath);
  }
  return raw;
};

const selectJwkFromString = (raw: string, requestedKeyId: string | undefined): { jwk: JWK; effectiveKid?: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error('private_key with private_key_format=jwk must contain valid JSON');
  }

  // RFC 7517 §5 JWK Set: { "keys": [...] }
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { keys?: unknown[] }).keys)) {
    const keys = (parsed as { keys: JWK[] }).keys;
    if (keys.length === 0) {
      throw new Error('JWK Set contains no keys');
    }
    const picked = requestedKeyId
      ? keys.find((k) => k.kid === requestedKeyId)
      : keys[0];
    if (!picked) {
      throw new Error(`JWK Set has no key with kid=${requestedKeyId}`);
    }
    return { jwk: picked, effectiveKid: picked.kid };
  }

  const jwk = parsed as JWK;
  return { jwk, effectiveKid: jwk.kid };
};

const signClientAssertion = async (
  opts: TokenEndpointAuthOptions,
  signingKey: Uint8Array | KeyLike,
  algorithm: TokenEndpointAuthSigningAlg,
  effectiveKeyId: string | undefined
): Promise<string> => {
  const header: { alg: TokenEndpointAuthSigningAlg; typ: 'JWT'; kid?: string } = {
    alg: algorithm,
    typ: 'JWT'
  };
  if (effectiveKeyId) {
    header.kid = effectiveKeyId;
  }

  const claims = buildClaims(opts);
  return new SignJWT(claims as Record<string, unknown>)
    .setProtectedHeader(header)
    .sign(signingKey);
};

/**
 * Computes the headers + body params that should be merged into a token-endpoint request to
 * authenticate the client per the configured `tokenEndpointAuthMethod`. The caller merges the
 * returned `headers` into the axios request config's headers, and the `bodyParams` into the form
 * data before stringifying.
 */
export const applyTokenEndpointAuth = async (opts: TokenEndpointAuthOptions): Promise<TokenEndpointAuthResult> => {
  const method = resolveTokenEndpointAuthMethod(opts);
  const clientId = opts.clientId ?? '';
  const clientSecret = opts.clientSecret ?? '';

  if (method === 'client_secret_basic') {
    // RFC 6749 §2.3.1 strictly requires application/x-www-form-urlencoded encoding of clientId/secret
    // before the `:` join + base64. Matching Bruno's prior behaviour (and curl, Postman, axios) we
    // base64 the raw bytes; clients that put special characters in client_id/secret may need the
    // strict variant, but it is incompatible with the majority of real IdPs.
    return {
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      bodyParams: {}
    };
  }

  if (method === 'client_secret_post') {
    const bodyParams: Record<string, string> = { client_id: clientId };
    if (clientSecret !== '') {
      bodyParams.client_secret = clientSecret;
    }
    return { headers: {}, bodyParams };
  }

  if (method === 'none') {
    const bodyParams: Record<string, string> = {};
    if (clientId !== '') {
      bodyParams.client_id = clientId;
    }
    return { headers: {}, bodyParams };
  }

  if (method === 'client_secret_jwt') {
    if (clientSecret === '') {
      throw new Error('client_secret_jwt requires a client_secret');
    }
    const alg = (opts.tokenEndpointAuthSigningAlg || DEFAULT_SECRET_JWT_ALG) as TokenEndpointAuthSigningAlg;
    const assertion = await signClientAssertion(
      opts,
      new TextEncoder().encode(clientSecret),
      alg,
      opts.keyId || undefined
    );
    return {
      headers: {},
      bodyParams: {
        client_id: clientId,
        client_assertion: assertion,
        client_assertion_type: JWT_BEARER_ASSERTION_TYPE
      }
    };
  }

  if (method === 'private_key_jwt') {
    const alg = (opts.tokenEndpointAuthSigningAlg || DEFAULT_PRIVATE_KEY_JWT_ALG) as TokenEndpointAuthSigningAlg;
    const keyMaterial = resolveKeyMaterial(opts);

    let signingKey: KeyLike;
    let effectiveKeyId = opts.keyId || undefined;

    if (opts.privateKeyFormat === 'jwk') {
      const { jwk, effectiveKid } = selectJwkFromString(keyMaterial, opts.keyId || undefined);
      signingKey = (await importJWK(jwk, alg)) as KeyLike;
      if (!effectiveKeyId && effectiveKid) {
        effectiveKeyId = effectiveKid;
      }
    } else {
      // PEM (RFC 7468) — default. We use PKCS#8 since that's what `openssl genpkey` emits and what
      // `jose.importPKCS8` accepts.
      signingKey = await importPKCS8(keyMaterial, alg);
    }

    const assertion = await signClientAssertion(opts, signingKey, alg, effectiveKeyId);
    return {
      headers: {},
      bodyParams: {
        client_id: clientId,
        client_assertion: assertion,
        client_assertion_type: JWT_BEARER_ASSERTION_TYPE
      }
    };
  }

  throw new Error(`Unsupported token_endpoint_auth_method: ${method}`);
};
