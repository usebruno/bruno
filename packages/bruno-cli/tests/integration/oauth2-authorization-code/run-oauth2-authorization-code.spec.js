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
 */
const createMockProvider = () => {
  const stats = { authorizations: 0, tokenRequests: 0 };
  const issuedCodes = new Map();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');

    if (url.pathname === '/authorize') {
      stats.authorizations++;
      const redirect = new URL(url.searchParams.get('redirect_uri'));
      redirect.searchParams.set('state', url.searchParams.get('state'));
      if (url.searchParams.get('client_id') === 'denied-app') {
        redirect.searchParams.set('error', 'access_denied');
      } else {
        const code = crypto.randomBytes(8).toString('hex');
        issuedCodes.set(code, { challenge: url.searchParams.get('code_challenge'), redirectUri: url.searchParams.get('redirect_uri') });
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
      const verifierMatches = issued && crypto.createHash('sha256').update(body.code_verifier || '').digest('base64url') === issued.challenge;
      if (body.grant_type !== 'authorization_code' || !verifierMatches || body.redirect_uri !== issued.redirectUri) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'invalid_grant' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ access_token: ACCESS_TOKEN, token_type: 'Bearer', expires_in: 3600 }));
    }

    if (url.pathname === '/quote') {
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

  const runQuoteRequests = async (envVariables) => {
    const collection = createCollectionJsonFromPathname(FIXTURE_COLLECTION);
    const scenarioGroup = collection.items[0].items[0];
    const statuses = [];

    for (const item of scenarioGroup.items) {
      const result = await runSingleRequest(
        structuredClone(item),
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
    }

    return statuses;
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
});
