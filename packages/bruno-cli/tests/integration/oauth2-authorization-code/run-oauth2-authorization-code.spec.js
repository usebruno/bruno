const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const crypto = require('node:crypto');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

// Only the browser is simulated: it follows the IdP's redirect to the callback, as a user approving
// sign-in would. Everything else (loopback listener, OAuth2 helper, runner) is the real code path.
jest.mock('../../../src/utils/oauth2-authorize', () => {
  const actual = jest.requireActual('../../../src/utils/oauth2-authorize');
  const { EventEmitter } = require('node:events');
  const { PassThrough } = require('node:stream');
  const mockHttp = require('node:http');

  const mockBrowser = (command, args) => {
    const child = new EventEmitter();
    child.unref = () => {};
    process.nextTick(() => {
      child.emit('spawn');
      mockHttp.get(args[args.length - 1], { agent: false }, (idpResponse) => {
        idpResponse.resume();
        mockHttp.get(idpResponse.headers.location, { agent: false }, (callbackResponse) => callbackResponse.resume());
      });
    });
    return child;
  };

  return {
    ...actual,
    createCliAuthorizer: (options) => actual.createCliAuthorizer({
      ...options,
      stdin: { isTTY: true },
      stderr: new PassThrough(),
      env: {},
      spawnProcess: mockBrowser
    })
  };
});

const { runSingleRequest } = require('../../../src/runner/run-single-request');
const { createCollectionJsonFromPathname } = require('../../../src/utils/collection');

const FIXTURE_COLLECTION = path.join(__dirname, 'fixtures', 'collection');
const ACCESS_TOKEN = 'quote-api-token';

const getFreePort = () =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const readBody = (req) =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(body))));
  });

/**
 * A minimal IdP plus protected API: /authorize redirects to the callback with a one-time code
 * (or `access_denied` for the `denied-app` client), /token redeems it with PKCE, /quote requires the token.
 * For the `flaky-app` client, the first token request fails with a 503. For `forged-error-app`, the
 * callback carries `access_denied` without the state, as a forged callback would.
 */
const createMockProvider = () => {
  const stats = { authorizations: 0, tokenRequests: 0, apiRequests: 0 };
  const issuedCodes = new Map();
  let flakyTokenFailed = false;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');

    if (url.pathname === '/authorize') {
      stats.authorizations++;
      const redirect = new URL(url.searchParams.get('redirect_uri'));
      if (url.searchParams.get('client_id') !== 'forged-error-app') {
        redirect.searchParams.set('state', url.searchParams.get('state'));
      }
      if (['denied-app', 'forged-error-app'].includes(url.searchParams.get('client_id'))) {
        redirect.searchParams.set('error', 'access_denied');
      } else {
        const code = crypto.randomBytes(8).toString('hex');
        issuedCodes.set(code, { challenge: url.searchParams.get('code_challenge'), redirectUri: url.searchParams.get('redirect_uri'), clientId: url.searchParams.get('client_id') });
        redirect.searchParams.set('code', code);
      }
      res.writeHead(302, { Location: redirect.toString() });
      return res.end();
    }

    if (url.pathname === '/token' && req.method === 'POST') {
      stats.tokenRequests++;
      const body = await readBody(req);
      const issued = issuedCodes.get(body.code);
      issuedCodes.delete(body.code);
      if (issued?.clientId === 'flaky-app' && !flakyTokenFailed) {
        flakyTokenFailed = true;
        res.writeHead(503);
        return res.end();
      }
      const verifierMatches = issued && crypto.createHash('sha256').update(body.code_verifier || '').digest('base64url') === issued.challenge;
      if (body.grant_type !== 'authorization_code' || !verifierMatches || body.redirect_uri !== issued.redirectUri) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'invalid_grant' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ access_token: ACCESS_TOKEN, token_type: 'Bearer', expires_in: 3600 }));
    }

    if (url.pathname === '/quote') {
      stats.apiRequests++;
      const authorized = req.headers.authorization === `Bearer ${ACCESS_TOKEN}`;
      res.writeHead(authorized ? 200 : 401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ authorized }));
    }

    res.writeHead(404);
    res.end();
  });

  return { server, stats };
};

describe('CLI run — OAuth2 authorization code inherited from a folder (#9356)', () => {
  let provider;
  let baseUrl;
  let callbackPort;

  beforeAll(async () => {
    provider = createMockProvider();
    await new Promise((resolve) => provider.server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${provider.server.address().port}`;
    callbackPort = await getFreePort();
  });

  afterAll(async () => {
    await new Promise((resolve) => provider.server.close(resolve));
  });

  // `withAuth` lets a test swap the inherited folder auth for a request-level config
  const runQuoteRequests = async (envVariables, { withAuth, withErrors = false } = {}) => {
    const collection = createCollectionJsonFromPathname(FIXTURE_COLLECTION);
    const scenarioGroup = collection.items[0].items[0];
    const statuses = [];
    const errors = [];

    for (const item of scenarioGroup.items) {
      const requestItem = structuredClone(item);
      if (withAuth) {
        requestItem.request.auth = withAuth;
      }
      const result = await runSingleRequest(
        requestItem,
        FIXTURE_COLLECTION,
        {},
        { idp: baseUrl, api: baseUrl, callbackPort: String(callbackPort), ...envVariables },
        {},
        collection.brunoConfig,
        collection.root,
        'quickjs',
        collection,
        jest.fn(),
        {},
        {}
      );
      statuses.push(result.response.status);
      errors.push(result.error);
    }

    return withErrors ? { statuses, errors } : statuses;
  };

  it('signs in once and reuses the token for every inheriting request', async () => {
    const before = { ...provider.stats };

    const statuses = await runQuoteRequests({ clientId: 'quote-app', credentialsId: 'approved' });

    expect(statuses).toEqual([200, 200]);
    expect(provider.stats.authorizations - before.authorizations).toBe(1);
    expect(provider.stats.tokenRequests - before.tokenRequests).toBe(1);
  });

  it('does not prompt again for each request after the IdP denies sign-in', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const before = { ...provider.stats };

    try {
      const statuses = await runQuoteRequests({ clientId: 'denied-app', credentialsId: 'denied' });

      expect(statuses).toEqual([401, 401]);
      expect(provider.stats.authorizations - before.authorizations).toBe(1);
      expect(provider.stats.tokenRequests - before.tokenRequests).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith('OAuth2 token fetch error:', 'OAuth2 authorization failed: access_denied');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('does not let an error callback without the issued state block later sign-ins', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const before = { ...provider.stats };

    try {
      const statuses = await runQuoteRequests({ clientId: 'forged-error-app', credentialsId: 'forged-error' });

      // Each request rejects the unverified callback and tries again, rather than caching a fake denial
      expect(statuses).toEqual([401, 401]);
      expect(provider.stats.authorizations - before.authorizations).toBe(2);
      expect(errorSpy).toHaveBeenCalledWith('OAuth2 token fetch error:', expect.stringContaining('OAuth2 state mismatch'));
      expect(errorSpy).not.toHaveBeenCalledWith('OAuth2 token fetch error:', expect.stringContaining('access_denied'));
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('signs in again after a transient token endpoint failure instead of giving up for the run', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const before = { ...provider.stats };

    try {
      const statuses = await runQuoteRequests({ clientId: 'flaky-app', credentialsId: 'flaky' });

      // The first request's token exchange hits the 503 and goes out unauthenticated, as before;
      // the second retries sign-in and succeeds
      expect(statuses).toEqual([401, 200]);
      expect(provider.stats.authorizations - before.authorizations).toBe(2);
      expect(provider.stats.tokenRequests - before.tokenRequests).toBe(2);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('rejects an implicit grant without a token URL before sending the protected request', async () => {
    const before = { ...provider.stats };
    const implicitAuth = {
      mode: 'oauth2',
      oauth2: { grantType: 'implicit', authorizationUrl: `${baseUrl}/authorize`, callbackUrl: `http://localhost:${callbackPort}/callback`, clientId: 'quote-app' }
    };

    const { statuses, errors } = await runQuoteRequests({}, { withAuth: implicitAuth, withErrors: true });

    expect(statuses).toEqual(['error', 'error']);
    errors.forEach((error) => expect(error).toContain('Interactive OAuth2 grant type \'implicit\' is not supported'));
    expect(provider.stats.apiRequests - before.apiRequests).toBe(0);
    expect(provider.stats.authorizations - before.authorizations).toBe(0);
  });
});
