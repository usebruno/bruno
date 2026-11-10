const fs = require('fs');
const path = require('path');
const http = require('http');
const { stringifyRequest } = require('@usebruno/filestore');
const { runCli } = require('./helpers/run-cli');
const { createTmpDir, removeTmpDir } = require('./helpers/tmp-dir');

const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const close = (server) => new Promise((resolve) => {
  server.closeAllConnections();
  server.close(resolve);
});

describe('CLI request proxy setting', () => {
  let target;
  let proxy;
  let targetPort;
  let proxyPort;
  let requests;
  let proxyHits;

  beforeAll(async () => {
    target = http.createServer((req, res) => {
      requests.push({ path: req.url, authorization: req.headers.authorization });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(req.url === '/token'
        ? { access_token: 'test-token', token_type: 'Bearer', expires_in: 3600 }
        : { ok: true }));
    });
    proxy = http.createServer((req, res) => {
      proxyHits++;
      res.writeHead(502);
      res.end('The collection proxy was used');
    });
    targetPort = await listen(target);
    proxyPort = await listen(proxy);
  });

  afterAll(async () => {
    await Promise.all([close(proxy), close(target)]);
  });

  beforeEach(() => {
    requests = [];
    proxyHits = 0;
  });

  it.each(['bru', 'yml'])('bypasses the collection proxy for the request, script, and OAuth token in %s', async (format) => {
    const directory = createTmpDir('request-proxy');
    const baseUrl = `http://127.0.0.1:${targetPort}`;
    const collectionProxy = {
      inherit: false, disabled: false,
      config: { protocol: 'http', hostname: '127.0.0.1', port: proxyPort, bypassProxy: '' }
    };
    const collection = format === 'bru'
      ? { version: '1', name: 'Request proxy', type: 'collection', proxy: collectionProxy }
      : { opencollection: '1.0.0', info: { name: 'Request proxy' }, config: { proxy: collectionProxy } };
    const request = {
      name: 'Direct request', type: 'http-request', seq: 1, settings: { useProxy: false },
      request: {
        method: 'GET', url: `${baseUrl}/resource`, headers: [], params: [], body: { mode: 'none' },
        auth: {
          mode: 'oauth2',
          oauth2: {
            grantType: 'client_credentials', accessTokenUrl: `${baseUrl}/token`,
            clientId: 'test-client', clientSecret: 'test-secret', credentialsPlacement: 'body',
            credentialsId: 'proxy-test', tokenSource: 'access_token', tokenPlacement: 'header',
            tokenHeaderPrefix: 'Bearer', autoFetchToken: true
          }
        },
        script: { req: `await bru.sendRequest({ method: 'GET', url: '${baseUrl}/script' });` },
        vars: {}, assertions: [], tests: ''
      }
    };

    try {
      fs.writeFileSync(path.join(directory, format === 'bru' ? 'bruno.json' : 'opencollection.yml'), JSON.stringify(collection));
      fs.writeFileSync(path.join(directory, `request.${format}`), stringifyRequest(request, { format }));

      const result = await runCli(['run', `request.${format}`], directory);
      expect({ code: result.code, stderr: result.stderr }).toEqual({ code: 0, stderr: '' });
      expect(proxyHits).toBe(0);
      expect(requests).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: '/script' }),
        expect.objectContaining({ path: '/token' }),
        { path: '/resource', authorization: 'Bearer test-token' }
      ]));
    } finally {
      removeTmpDir(directory);
    }
  }, 30000);
});
