import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jwtVerify, importSPKI, exportJWK, generateKeyPair } from 'jose';
import { applyTokenEndpointAuth } from './tokenEndpointAuth';

const TOKEN_URL = 'https://idp.example.com/oauth2/token';
const CLIENT_ID = 'my-client';
const CLIENT_SECRET = 'super-secret-shhh';
const JWT_BEARER_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

// RSA keypair used for private_key_jwt tests. Generated once at module load.
let rsaPrivatePem: string;
let rsaPublicPem: string;
let rsaPublicJwk: Record<string, unknown>;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  rsaPrivatePem = await (await import('jose')).exportPKCS8(privateKey as any);
  rsaPublicPem = await (await import('jose')).exportSPKI(publicKey as any);
  rsaPublicJwk = await exportJWK(publicKey as any);
});

describe('applyTokenEndpointAuth', () => {
  describe('client_secret_basic (RFC 6749 §2.3.1)', () => {
    it('sends Authorization: Basic header and no client_id/secret in body', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'client_secret_basic',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        accessTokenUrl: TOKEN_URL
      });
      const expected = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
      expect(result.headers.Authorization).toBe(expected);
      expect(result.bodyParams).toEqual({});
    });
  });

  describe('client_secret_post (RFC 6749 §2.3.1)', () => {
    it('sends client_id and client_secret in body and no Authorization header', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'client_secret_post',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers).toEqual({});
      expect(result.bodyParams).toEqual({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      });
    });

    it('omits client_secret if not set', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'client_secret_post',
        clientId: CLIENT_ID,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.bodyParams).toEqual({ client_id: CLIENT_ID });
    });
  });

  describe('tls_client_auth / self_signed_tls_client_auth (RFC 8705)', () => {
    it('tls_client_auth emits only client_id and no Authorization header', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'tls_client_auth',
        clientId: CLIENT_ID,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers).toEqual({});
      expect(result.bodyParams).toEqual({ client_id: CLIENT_ID });
    });

    it('self_signed_tls_client_auth emits only client_id', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'self_signed_tls_client_auth',
        clientId: CLIENT_ID,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers).toEqual({});
      expect(result.bodyParams).toEqual({ client_id: CLIENT_ID });
    });

    it('rejects when client_id is missing (RFC 8705 §2.1 makes it REQUIRED)', async () => {
      await expect(
        applyTokenEndpointAuth({
          tokenEndpointAuthMethod: 'tls_client_auth',
          accessTokenUrl: TOKEN_URL
        })
      ).rejects.toThrow(/client_id/);
    });
  });

  describe('none (RFC 7591 §2)', () => {
    it('emits only client_id when set, no Authorization header', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'none',
        clientId: CLIENT_ID,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers).toEqual({});
      expect(result.bodyParams).toEqual({ client_id: CLIENT_ID });
    });

    it('emits nothing when clientId is also unset', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'none',
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers).toEqual({});
      expect(result.bodyParams).toEqual({});
    });
  });

  describe('client_secret_jwt (OIDC Core §9 / RFC 7523)', () => {
    it('emits an HMAC-signed JWT assertion verifiable with the same client_secret', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'client_secret_jwt',
        tokenEndpointAuthSigningAlg: 'HS256',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers).toEqual({});
      expect(result.bodyParams.client_id).toBe(CLIENT_ID);
      expect(result.bodyParams.client_assertion_type).toBe(JWT_BEARER_ASSERTION_TYPE);
      expect(result.bodyParams.client_assertion).toBeTruthy();

      const { payload, protectedHeader } = await jwtVerify(
        result.bodyParams.client_assertion,
        new TextEncoder().encode(CLIENT_SECRET)
      );
      expect(protectedHeader.alg).toBe('HS256');
      expect(protectedHeader.typ).toBe('JWT');
      expect(payload.iss).toBe(CLIENT_ID);
      expect(payload.sub).toBe(CLIENT_ID);
      expect(payload.aud).toBe(TOKEN_URL);
      expect(typeof payload.jti).toBe('string');
      expect(typeof payload.exp).toBe('number');
      expect(typeof payload.iat).toBe('number');
    });

    it('respects keyId, audience override, assertionLifetime, and additionalClaims', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'client_secret_jwt',
        tokenEndpointAuthSigningAlg: 'HS384',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        accessTokenUrl: TOKEN_URL,
        keyId: 'my-key-1',
        audience: 'https://issuer.example.com',
        assertionLifetime: 60,
        additionalClaims: [
          { name: 'scope', value: 'read', enabled: true },
          { name: 'ignored', value: 'no', enabled: false }
        ]
      });

      const { payload, protectedHeader } = await jwtVerify(
        result.bodyParams.client_assertion,
        new TextEncoder().encode(CLIENT_SECRET)
      );
      expect(protectedHeader.alg).toBe('HS384');
      expect(protectedHeader.kid).toBe('my-key-1');
      expect(payload.aud).toBe('https://issuer.example.com');
      expect((payload.exp as number) - (payload.iat as number)).toBe(60);
      expect(payload.scope).toBe('read');
      expect(payload.ignored).toBeUndefined();
    });

    it('rejects when client_secret is missing', async () => {
      await expect(
        applyTokenEndpointAuth({
          tokenEndpointAuthMethod: 'client_secret_jwt',
          clientId: CLIENT_ID,
          accessTokenUrl: TOKEN_URL
        })
      ).rejects.toThrow(/client_secret/);
    });
  });

  describe('private_key_jwt (RFC 7523 §2.2)', () => {
    it('signs with PEM private key and is verifiable with the matching public key', async () => {
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'private_key_jwt',
        tokenEndpointAuthSigningAlg: 'RS256',
        privateKey: rsaPrivatePem,
        privateKeyType: 'text',
        privateKeyFormat: 'pem',
        clientId: CLIENT_ID,
        accessTokenUrl: TOKEN_URL
      });

      const publicKey = await importSPKI(rsaPublicPem, 'RS256');
      const { payload, protectedHeader } = await jwtVerify(result.bodyParams.client_assertion, publicKey);
      expect(protectedHeader.alg).toBe('RS256');
      expect(payload.iss).toBe(CLIENT_ID);
      expect(payload.sub).toBe(CLIENT_ID);
      expect(payload.aud).toBe(TOKEN_URL);
    });

    it('accepts a single JWK and propagates the JWK kid when keyId is empty', async () => {
      const jwkWithKid = { ...rsaPublicJwk, ...(await exportJWK(await (await import('jose')).importPKCS8(rsaPrivatePem, 'RS256') as any)), kid: 'auto-kid' };

      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'private_key_jwt',
        tokenEndpointAuthSigningAlg: 'RS256',
        privateKey: JSON.stringify(jwkWithKid),
        privateKeyType: 'text',
        privateKeyFormat: 'jwk',
        clientId: CLIENT_ID,
        accessTokenUrl: TOKEN_URL
      });

      const publicKey = await importSPKI(rsaPublicPem, 'RS256');
      const { protectedHeader } = await jwtVerify(result.bodyParams.client_assertion, publicKey);
      expect(protectedHeader.kid).toBe('auto-kid');
    });

    it('picks the matching key from a JWK Set by kid', async () => {
      const { exportJWK: doExportJWK, importPKCS8: doImportPKCS8 } = await import('jose');
      const privateJwk = await doExportJWK(await doImportPKCS8(rsaPrivatePem, 'RS256') as any);
      const set = {
        keys: [
          { ...privateJwk, kid: 'other' },
          { ...privateJwk, kid: 'wanted' }
        ]
      };
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'private_key_jwt',
        tokenEndpointAuthSigningAlg: 'RS256',
        privateKey: JSON.stringify(set),
        privateKeyType: 'text',
        privateKeyFormat: 'jwk',
        keyId: 'wanted',
        clientId: CLIENT_ID,
        accessTokenUrl: TOKEN_URL
      });
      const publicKey = await importSPKI(rsaPublicPem, 'RS256');
      const { protectedHeader } = await jwtVerify(result.bodyParams.client_assertion, publicKey);
      expect(protectedHeader.kid).toBe('wanted');
    });

    it('reads the key from disk when privateKeyType=file', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-pkjwt-'));
      const keyPath = path.join(tmpDir, 'priv.pem');
      fs.writeFileSync(keyPath, rsaPrivatePem, 'utf-8');

      try {
        const result = await applyTokenEndpointAuth({
          tokenEndpointAuthMethod: 'private_key_jwt',
          tokenEndpointAuthSigningAlg: 'RS256',
          privateKey: keyPath,
          privateKeyType: 'file',
          privateKeyFormat: 'pem',
          clientId: CLIENT_ID,
          accessTokenUrl: TOKEN_URL
        });
        const publicKey = await importSPKI(rsaPublicPem, 'RS256');
        const { payload } = await jwtVerify(result.bodyParams.client_assertion, publicKey);
        expect(payload.iss).toBe(CLIENT_ID);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('rejects when privateKey is missing', async () => {
      await expect(
        applyTokenEndpointAuth({
          tokenEndpointAuthMethod: 'private_key_jwt',
          tokenEndpointAuthSigningAlg: 'RS256',
          clientId: CLIENT_ID,
          accessTokenUrl: TOKEN_URL
        })
      ).rejects.toThrow(/private key/i);
    });
  });

  describe('legacy migration from credentialsPlacement', () => {
    it('maps credentialsPlacement=basic_auth_header → client_secret_basic', async () => {
      const result = await applyTokenEndpointAuth({
        credentialsPlacement: 'basic_auth_header',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers.Authorization).toContain('Basic ');
      expect(result.bodyParams).toEqual({});
    });

    it('maps credentialsPlacement=body (or anything else) → client_secret_post', async () => {
      const result = await applyTokenEndpointAuth({
        credentialsPlacement: 'body',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers).toEqual({});
      expect(result.bodyParams).toEqual({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
    });

    it('defaults to client_secret_post when both fields are absent', async () => {
      const result = await applyTokenEndpointAuth({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        accessTokenUrl: TOKEN_URL
      });
      expect(result.headers).toEqual({});
      expect(result.bodyParams).toEqual({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
    });
  });

  describe('claims (RFC 7523 §3)', () => {
    it('emits jti as a UUID and exp = iat + assertionLifetime', async () => {
      const before = Math.floor(Date.now() / 1000);
      const result = await applyTokenEndpointAuth({
        tokenEndpointAuthMethod: 'client_secret_jwt',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        accessTokenUrl: TOKEN_URL,
        assertionLifetime: 120
      });
      const { payload } = await jwtVerify(
        result.bodyParams.client_assertion,
        new TextEncoder().encode(CLIENT_SECRET)
      );
      expect(typeof payload.jti).toBe('string');
      // crypto.randomUUID() shape (8-4-4-4-12 hex)
      expect(payload.jti as string).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect((payload.exp as number) - (payload.iat as number)).toBe(120);
      expect(payload.iat as number).toBeGreaterThanOrEqual(before);
    });
  });
});
