import { jwtVerify, importSPKI, generateKeyPair, exportPKCS8, exportSPKI } from 'jose';
import { buildAuthorizationRequest } from './authorizationRequest';

const CLIENT_ID = 'rp-12345';
const REDIRECT_URI = 'https://app.example.com/callback';
const ISSUER = 'https://op.example.com';
const TOKEN_URL = 'https://op.example.com/oauth/token';

const JWT_BEARER_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

let rsaPrivatePem: string;
let rsaPublicPem: string;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  rsaPrivatePem = await exportPKCS8(privateKey as any);
  rsaPublicPem = await exportSPKI(publicKey as any);
});

describe('buildAuthorizationRequest', () => {
  describe('without JAR', () => {
    it('returns plain authorization params and no signed JWT', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        scope: 'openid profile email',
        state: 'abc123',
        responseType: 'code'
      });
      expect(result.signedRequest).toBeUndefined();
      expect(result.params.client_id).toBe(CLIENT_ID);
      expect(result.params.redirect_uri).toBe(REDIRECT_URI);
      expect(result.params.scope).toBe('openid profile email');
      expect(result.params.state).toBe('abc123');
      expect(result.params.response_type).toBe('code');
      // nonce is auto-generated
      expect(typeof result.params.nonce).toBe('string');
      expect(result.params.nonce.length).toBeGreaterThan(20);
      expect(result.effectiveNonce).toBe(result.params.nonce);
    });

    it('auto-generates a fresh nonce on every call when nonce is empty', async () => {
      const a = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, responseType: 'code'
      });
      const b = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, responseType: 'code'
      });
      expect(a.effectiveNonce).not.toBe(b.effectiveNonce);
    });

    it('preserves a user-supplied nonce', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, responseType: 'code',
        nonce: 'my-explicit-nonce'
      });
      expect(result.effectiveNonce).toBe('my-explicit-nonce');
      expect(result.params.nonce).toBe('my-explicit-nonce');
    });

    it('emits OIDC params when set', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, responseType: 'code',
        prompt: 'login', loginHint: 'jimmy@example.com',
        maxAge: 3600, acrValues: 'urn:mace:incommon:iap:silver'
      });
      expect(result.params.prompt).toBe('login');
      expect(result.params.login_hint).toBe('jimmy@example.com');
      expect(result.params.max_age).toBe('3600');
      expect(result.params.acr_values).toBe('urn:mace:incommon:iap:silver');
    });

    it('emits PKCE params when codeChallenge is set', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, responseType: 'code',
        codeChallenge: 'challenge-string', codeChallengeMethod: 'S256'
      });
      expect(result.params.code_challenge).toBe('challenge-string');
      expect(result.params.code_challenge_method).toBe('S256');
    });

    it('merges enabled additionalAuthorizationParams (queryparams only)', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, responseType: 'code',
        additionalAuthorizationParams: [
          { name: 'audience', value: 'https://api.example.com', enabled: true, sendIn: 'queryparams' },
          { name: 'ignored', value: 'no', enabled: false, sendIn: 'queryparams' },
          { name: 'header_thing', value: 'x', enabled: true, sendIn: 'headers' }
        ]
      });
      expect(result.params.audience).toBe('https://api.example.com');
      expect(result.params.ignored).toBeUndefined();
      expect(result.params.header_thing).toBeUndefined();
    });
  });

  describe('JAR — HMAC (HS256 with client_secret)', () => {
    const secret = 'super-secret-shhh-with-32-bytes-min-len';

    it('produces a JWT verifiable with the shared client_secret and typ=oauth-authz-req+jwt', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, scope: 'openid',
        responseType: 'code',
        useRequestObject: true, requestObjectSigningAlg: 'HS256',
        clientSecret: secret,
        issuer: ISSUER
      });
      expect(result.signedRequest).toBeTruthy();
      const { payload, protectedHeader } = await jwtVerify(
        result.signedRequest!,
        new TextEncoder().encode(secret)
      );
      expect(protectedHeader.alg).toBe('HS256');
      expect(protectedHeader.typ).toBe('oauth-authz-req+jwt');
      expect(payload.iss).toBe(CLIENT_ID);
      expect(payload.aud).toBe(ISSUER);
      expect(payload.client_id).toBe(CLIENT_ID);
      expect(payload.redirect_uri).toBe(REDIRECT_URI);
      expect(payload.scope).toBe('openid');
      expect(payload.response_type).toBe('code');
      expect(typeof payload.nonce).toBe('string');
      expect(typeof payload.exp).toBe('number');
      expect(typeof payload.iat).toBe('number');
      expect(typeof payload.jti).toBe('string');
    });

    it('falls back to accessTokenUrl as aud when issuer is not set', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI,
        responseType: 'code',
        useRequestObject: true, requestObjectSigningAlg: 'HS256',
        clientSecret: secret,
        accessTokenUrl: TOKEN_URL
      });
      const { payload } = await jwtVerify(result.signedRequest!, new TextEncoder().encode(secret));
      expect(payload.aud).toBe(TOKEN_URL);
    });

    it('custom requestObjectAdditionalClaims override standard claims', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, scope: 'profile email',
        responseType: 'code',
        useRequestObject: true, requestObjectSigningAlg: 'HS256',
        clientSecret: secret,
        issuer: ISSUER,
        requestObjectAdditionalClaims: [
          { name: 'scope', value: 'openid override', enabled: true },
          { name: 'custom_claim', value: 'value', enabled: true },
          { name: 'disabled_claim', value: 'no', enabled: false }
        ]
      });
      const { payload } = await jwtVerify(result.signedRequest!, new TextEncoder().encode(secret));
      expect(payload.scope).toBe('openid override');
      expect(payload.custom_claim).toBe('value');
      expect(payload.disabled_claim).toBeUndefined();
    });
  });

  describe('JAR — RSA (RS256 with PEM private key)', () => {
    it('produces a JWT verifiable with the matching public key', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI, scope: 'openid',
        responseType: 'code id_token',
        useRequestObject: true, requestObjectSigningAlg: 'RS256',
        privateKey: rsaPrivatePem, privateKeyType: 'text', privateKeyFormat: 'pem',
        issuer: ISSUER
      });
      const publicKey = await importSPKI(rsaPublicPem, 'RS256');
      const { payload, protectedHeader } = await jwtVerify(result.signedRequest!, publicKey);
      expect(protectedHeader.alg).toBe('RS256');
      expect(protectedHeader.typ).toBe('oauth-authz-req+jwt');
      expect(payload.response_type).toBe('code id_token');
      expect(payload.iss).toBe(CLIENT_ID);
      expect(payload.aud).toBe(ISSUER);
    });
  });

  describe('Hybrid Flow response types', () => {
    it('emits response_type=code id_token in params and JWT claims', async () => {
      const result = await buildAuthorizationRequest({
        clientId: CLIENT_ID, redirectUri: REDIRECT_URI,
        responseType: 'code id_token',
        useRequestObject: true, requestObjectSigningAlg: 'HS256',
        clientSecret: 'sekret-with-at-least-32-bytes-here',
        issuer: ISSUER
      });
      expect(result.params.response_type).toBe('code id_token');
      const { payload } = await jwtVerify(
        result.signedRequest!,
        new TextEncoder().encode('sekret-with-at-least-32-bytes-here')
      );
      expect(payload.response_type).toBe('code id_token');
    });
  });
});
