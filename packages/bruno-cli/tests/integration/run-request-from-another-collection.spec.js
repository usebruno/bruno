const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { stringifyRequest, stringifyEnvironment, stringifyCollection, stringifyFolder } = require('@usebruno/filestore');
const { runCli } = require('./helpers/run-cli');
const { stripAnsi } = require('./helpers/strip-ansi');
const { createTmpDir, removeTmpDir } = require('./helpers/tmp-dir');

const writeFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const LIST_ORDERS_BRU = `meta {
  name: list
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/orders
  body: none
  auth: none
}

headers {
  authorization: Bearer {{token}}
}

script:pre-request {
  const login = await bru.runRequest('auth/login', { collection: 'Auth API' });
  bru.setVar('token', login.data.token);
  bru.setVar('loginUrl', login.url === undefined ? 'hidden' : 'visible');
}

tests {
  test("variables set by the other collection stay there", function () {
    expect(bru.getVar('leaked')).to.equal(undefined);
  });

  test("the other collection's request URL is not handed to the script", function () {
    expect(bru.getVar('loginUrl')).to.equal('hidden');
  });
}
`;

// The login request's post-response script sets variables; none of them may reach the caller.
const LOGIN_POST_RESPONSE_SCRIPT = `bru.setVar('leaked', 'yes');
bru.setEnvVar('baseUrl', 'http://127.0.0.1:1');`;

describe('CLI run - bru.runRequest from another collection of the workspace', () => {
  let server;
  let serverUrl;
  let receivedRequests;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedRequests.push({ method: req.method, url: req.url, headers: req.headers });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(req.url === '/login' ? { token: 'abc' } : { ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    receivedRequests = [];
    // The spawned CLI takes its collection path from process.cwd(), which the OS returns resolved.
    tmpDir = fs.realpathSync(createTmpDir('cross-collection'));
  });

  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  const seedWorkspace = () => {
    const ordersPath = path.join(tmpDir, 'collections', 'orders');
    writeFile(path.join(ordersPath, 'bruno.json'), JSON.stringify({ version: '1', name: 'Orders', type: 'collection' }));
    writeFile(path.join(ordersPath, 'environments', 'Prod.bru'), `vars {\n  baseUrl: ${serverUrl}\n}\n`);
    writeFile(path.join(ordersPath, 'list.bru'), LIST_ORDERS_BRU);

    const authPath = path.join(tmpDir, 'collections', 'auth');
    writeFile(path.join(authPath, 'opencollection.yml'), stringifyCollection(
      { request: { headers: [{ name: 'x-collection', value: 'auth', enabled: true }] } },
      { name: 'Auth API', version: '1' },
      { format: 'yml' }
    ));
    writeFile(path.join(authPath, 'auth', 'folder.yml'), stringifyFolder(
      { meta: { name: 'auth' }, request: { headers: [{ name: 'x-folder', value: 'auth-folder', enabled: true }] } },
      { format: 'yml' }
    ));
    writeFile(path.join(authPath, 'auth', 'login.yml'), stringifyRequest({
      type: 'http-request',
      name: 'login',
      seq: 1,
      request: {
        method: 'POST',
        url: '{{baseUrl}}/login',
        headers: [{ name: 'x-client-secret', value: '{{process.env.AUTH_CLIENT_SECRET}}', enabled: true }],
        params: [],
        body: { mode: 'none' },
        auth: { mode: 'none' },
        script: { res: LOGIN_POST_RESPONSE_SCRIPT }
      }
    }, { format: 'yml' }));
    const authEnvironmentPath = path.join(authPath, 'environments', 'Prod.yml');
    writeFile(authEnvironmentPath, stringifyEnvironment({
      name: 'Prod',
      variables: [{ name: 'baseUrl', value: serverUrl, enabled: true, secret: false, type: 'text' }]
    }, { format: 'yml' }));
    writeFile(path.join(authPath, '.env'), 'AUTH_CLIENT_SECRET=from-dotenv\n');

    // workspace.yml keeps an old name for the auth collection; runRequest matches its own name.
    writeFile(path.join(tmpDir, 'workspace.yml'), [
      'opencollection: 1.0.0',
      'info:',
      '  name: "Workspace"',
      '  type: workspace',
      '',
      'collections:',
      '  - name: "Orders"',
      '    path: "collections/orders"',
      '  - name: "Old Auth Name"',
      '    path: "collections/auth"',
      ''
    ].join('\n'));

    return { ordersPath, authEnvironmentPath };
  };

  it.each(['safe', 'developer'])('runs the other collection\'s request with its own settings (%s sandbox)', async (sandbox) => {
    const { ordersPath, authEnvironmentPath } = seedWorkspace();
    const authEnvironmentBefore = fs.readFileSync(authEnvironmentPath, 'utf8');

    const result = await runCli(['run', 'list.bru', '--env', 'Prod', '--sandbox', sandbox, '--noproxy'], ordersPath);

    if (result.code !== 0) {
      throw new Error(`CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`);
    }

    const login = receivedRequests.find((request) => request.url === '/login');
    expect(login).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(login.headers).toEqual(expect.objectContaining({
      'x-collection': 'auth',
      'x-folder': 'auth-folder',
      'x-client-secret': 'from-dotenv'
    }));

    const orders = receivedRequests.find((request) => request.url === '/orders');
    expect(orders.headers.authorization).toBe('Bearer abc');

    expect(stripAnsi(result.stdout)).toContain('✓ variables set by the other collection stay there');
    expect(stripAnsi(result.stdout)).toContain('✓ the other collection\'s request URL is not handed to the script');
    expect(fs.readFileSync(authEnvironmentPath, 'utf8')).toBe(authEnvironmentBefore);
  }, 60_000);
});
