const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stringifyRequest, stringifyEnvironment, stringifyCollection, stringifyFolder } = require('@usebruno/filestore');

jest.mock('../../store/preferences', () => ({ preferencesUtil: {} }));
jest.mock('../../utils/environments', () => ({
  ...jest.requireActual('../../utils/environments'),
  hydrateEnvironments: jest.fn()
}));
jest.mock('../../store/collection-security', () => {
  return jest.fn().mockImplementation(() => ({
    getSecurityConfigForCollection: jest.fn(() => ({ jsSandboxMode: 'developer' }))
  }));
});

const { hydrateEnvironments } = require('../../utils/environments');
const { generateUidBasedOnHash } = require('../../utils/common');
const { createRunRequestByItemPathname } = require('./run-request-by-pathname');

const httpItem = (name, url) => ({
  type: 'http-request',
  name,
  seq: 1,
  request: { method: 'POST', url, headers: [], params: [], body: { mode: 'none' }, auth: { mode: 'none' } }
});

const environment = (name, baseUrl) => ({
  name,
  variables: [{ name: 'baseUrl', value: baseUrl, enabled: true, secret: false, type: 'text' }]
});

const writeFile = (dir, relativePath, content) => {
  const fullPath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
};

const writeWorkspace = (workspacePath, collections) => {
  const entries = collections.map(({ name, relativePath }) => `  - name: "${name}"\n    path: "${relativePath}"`).join('\n');
  writeFile(workspacePath, 'workspace.yml', `opencollection: 1.0.0\ninfo:\n  name: "Workspace"\n  type: workspace\n\ncollections:\n${entries}\n`);
};

// "Auth API" is a yml collection whose workspace.yml entry still has an old name.
const writeAuthCollection = (collectionPath) => {
  writeFile(collectionPath, 'opencollection.yml', stringifyCollection(
    { request: { headers: [{ name: 'x-collection', value: 'auth', enabled: true }] } },
    { name: 'Auth API', version: '1' },
    { format: 'yml' }
  ));
  writeFile(collectionPath, path.join('auth', 'folder.yml'), stringifyFolder(
    { meta: { name: 'auth' }, request: { headers: [{ name: 'x-folder', value: 'auth-folder', enabled: true }] } },
    { format: 'yml' }
  ));
  writeFile(collectionPath, path.join('auth', 'login.yml'), stringifyRequest(httpItem('login', '{{baseUrl}}/login'), { format: 'yml' }));
  writeFile(collectionPath, path.join('auth', 'csrf.yml'), stringifyRequest(httpItem('csrf', '{{baseUrl}}/csrf'), { format: 'yml' }));
  writeFile(collectionPath, path.join('environments', 'Prod.yml'), stringifyEnvironment(environment('Prod', 'https://auth.prod'), { format: 'yml' }));
  writeFile(collectionPath, path.join('environments', 'Dev.yml'), stringifyEnvironment(environment('Dev', 'https://auth.dev'), { format: 'yml' }));
  writeFile(collectionPath, '.env', 'AUTH_CLIENT_SECRET=from-dotenv\n');
};

const tmpDirs = [];
const makeWorkspace = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-request-by-pathname-'));
  tmpDirs.push(root);

  const ordersPath = path.join(root, 'collections', 'orders');
  writeFile(ordersPath, 'bruno.json', JSON.stringify({ version: '1', name: 'Orders', type: 'collection' }));
  const authPath = path.join(root, 'collections', 'auth');
  writeAuthCollection(authPath);
  writeWorkspace(root, [
    { name: 'Orders', relativePath: 'collections/orders' },
    { name: 'Old Auth Name', relativePath: 'collections/auth' }
  ]);

  return { root, ordersPath, authPath };
};

const makeCallerCollection = (ordersPath) => ({
  uid: 'orders-uid',
  name: 'Orders',
  pathname: ordersPath,
  globalEnvironmentVariables: { region: 'eu' },
  globalEnvironmentName: 'Global',
  items: [
    { uid: 'list-uid', type: 'http-request', name: 'list', pathname: path.join(ordersPath, 'list.bru'), request: { method: 'GET', url: 'https://orders/list' } },
    { uid: 'socket-uid', type: 'ws-request', name: 'socket', pathname: path.join(ordersPath, 'socket.bru'), request: { url: 'wss://orders/socket' } }
  ]
});

const makeCallerBru = () => ({ _recordScriptedRequest: jest.fn() });

afterAll(() => {
  tmpDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }));
});

beforeEach(() => {
  hydrateEnvironments.mockClear();
});

describe('createRunRequestByItemPathname', () => {
  describe('a request of the same collection', () => {
    it('runs the item found by its extensionless path and records the call on the caller', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runItem = jest.fn(async () => ({ status: 200, statusText: 'OK', data: { ok: true }, requestSent: { method: 'GET', url: 'https://orders/list' } }));
      const callerBru = makeCallerBru();
      const runRequestByItemPathname = createRunRequestByItemPathname({
        collection: makeCallerCollection(ordersPath),
        activeEnvironmentName: 'Prod',
        workspacePath: root,
        runItem
      });

      const res = await runRequestByItemPathname('list', callerBru);

      expect(res.status).toBe(200);
      expect(runItem).toHaveBeenCalledWith({ item: expect.objectContaining({ uid: 'list-uid' }), callerBru, target: undefined });
      expect(callerBru._recordScriptedRequest).toHaveBeenCalledWith(expect.objectContaining({ source: 'runRequest' }));
    });

    it('rejects with the invalid-path message for an unknown request', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runRequestByItemPathname = createRunRequestByItemPathname({
        collection: makeCallerCollection(ordersPath),
        activeEnvironmentName: undefined,
        workspacePath: root,
        runItem: jest.fn()
      });

      await expect(runRequestByItemPathname('missing', makeCallerBru()))
        .rejects.toBe(`bru.runRequest: invalid request path - ${path.join(ordersPath, 'missing.bru')}`);
    });

    it('skips a WebSocket request without running it', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runItem = jest.fn();
      const callerBru = makeCallerBru();
      const runRequestByItemPathname = createRunRequestByItemPathname({
        collection: makeCallerCollection(ordersPath),
        activeEnvironmentName: undefined,
        workspacePath: root,
        runItem
      });

      const res = await runRequestByItemPathname('socket', callerBru);

      expect(res).toEqual(expect.objectContaining({ status: 'skipped', statusText: 'bru.runRequest does not support WebSocket requests' }));
      expect(runItem).not.toHaveBeenCalled();
      expect(callerBru._recordScriptedRequest).toHaveBeenCalledWith(expect.objectContaining({
        response: expect.objectContaining({ statusText: 'Skipped' })
      }));
    });

    it('records a failed run on the caller and rethrows its error', async () => {
      const { root, ordersPath } = makeWorkspace();
      const error = new Error('boom');
      const callerBru = makeCallerBru();
      const runRequestByItemPathname = createRunRequestByItemPathname({
        collection: makeCallerCollection(ordersPath),
        activeEnvironmentName: undefined,
        workspacePath: root,
        runItem: jest.fn(async () => {
          throw error;
        })
      });

      await expect(runRequestByItemPathname('list', callerBru)).rejects.toBe(error);
      expect(callerBru._recordScriptedRequest).toHaveBeenCalledWith(expect.objectContaining({
        request: expect.objectContaining({ method: 'GET', url: 'https://orders/list' })
      }));
    });
  });

  describe('a request of another collection', () => {
    const runFromAuth = async ({ activeEnvironmentName = 'Prod', requestPath = 'auth/login', options = { collection: 'Auth API' }, workspace } = {}) => {
      const { root, ordersPath, authPath } = workspace || makeWorkspace();
      const runItem = jest.fn(async () => ({ status: 200, data: { token: 't' } }));
      const callerCollection = makeCallerCollection(ordersPath);
      const runRequestByItemPathname = createRunRequestByItemPathname({
        collection: callerCollection,
        activeEnvironmentName,
        workspacePath: root,
        runItem
      });
      const res = await runRequestByItemPathname(requestPath, makeCallerBru(), options);
      return { res, runItem, root, authPath, callerCollection };
    };

    it('finds the collection by its own name and runs the request from its saved files', async () => {
      const { res, runItem, authPath } = await runFromAuth();

      expect(res.data).toEqual({ token: 't' });
      const { item, target } = runItem.mock.calls[0][0];
      expect(item.pathname).toBe(path.join(authPath, 'auth', 'login.yml'));
      expect(item.request.url).toBe('{{baseUrl}}/login');
      expect(target.collection).toEqual(expect.objectContaining({
        uid: generateUidBasedOnHash(authPath),
        name: 'Auth API',
        pathname: authPath,
        securityConfig: { jsSandboxMode: 'developer' }
      }));
    });

    it('includes the collection root and the folder roots above the request', async () => {
      const { runItem } = await runFromAuth();

      const { target } = runItem.mock.calls[0][0];
      expect(target.collection.root.request.headers).toEqual([expect.objectContaining({ name: 'x-collection', value: 'auth' })]);
      const folder = target.collection.items.find((i) => i.type === 'folder');
      expect(folder.root.request.headers).toEqual([expect.objectContaining({ name: 'x-folder', value: 'auth-folder' })]);
    });

    it('uses the target environment named like the active one, and the target .env', async () => {
      const { runItem, authPath } = await runFromAuth();

      const { target } = runItem.mock.calls[0][0];
      expect(target.envVars).toEqual({ baseUrl: 'https://auth.prod', __name__: 'Prod' });
      expect(target.processEnvVars.AUTH_CLIENT_SECRET).toBe('from-dotenv');
      expect(hydrateEnvironments).toHaveBeenCalledWith(authPath, expect.arrayContaining([expect.objectContaining({ name: 'Prod' })]));
    });

    it('uses no collection environment when the target has none with the active name', async () => {
      const { runItem } = await runFromAuth({ activeEnvironmentName: 'Staging' });

      expect(runItem.mock.calls[0][0].target.envVars).toEqual({ __name__: undefined });
    });

    it('isolates the target: fresh runtime variables and a copy of the global environment', async () => {
      const { runItem, root, callerCollection } = await runFromAuth();

      const { target } = runItem.mock.calls[0][0];
      expect(target.runtimeVariables).toEqual({});
      expect(target.isolateVariables).toBe(true);
      expect(target.workspacePath).toBe(root);
      expect(target.collection.globalEnvironmentVariables).toEqual({ region: 'eu' });
      expect(target.collection.globalEnvironmentVariables).not.toBe(callerCollection.globalEnvironmentVariables);
    });

    it('gives the script only the response, not the request as sent or its timeline', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runRequestByItemPathname = createRunRequestByItemPathname({
        collection: makeCallerCollection(ordersPath),
        activeEnvironmentName: 'Prod',
        workspacePath: root,
        runItem: jest.fn(async () => ({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { token: 't' },
          dataBuffer: 'eyJ0b2tlbiI6InQifQ==',
          duration: 12,
          size: 13,
          url: 'https://auth.prod/login?api_key=secret',
          timeline: [{ requestHeaders: { authorization: 'Bearer secret' } }],
          requestSent: { headers: { authorization: 'Bearer secret' }, data: { password: 'secret' } }
        }))
      });

      const res = await runRequestByItemPathname('auth/login', makeCallerBru(), { collection: 'Auth API' });

      expect(res).toEqual({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { token: 't' },
        duration: 12,
        size: 13
      });
    });

    it('replaces a request extension the script wrote with the target collection\'s own', async () => {
      const { runItem, authPath } = await runFromAuth({ requestPath: 'auth/login.bru' });

      expect(runItem.mock.calls[0][0].item.pathname).toBe(path.join(authPath, 'auth', 'login.yml'));
    });

    it('runs the requests the target\'s own scripts run, reading them from disk with the same state', async () => {
      const { runItem, authPath } = await runFromAuth();
      const { target } = runItem.mock.calls[0][0];
      const nestedRunItem = jest.fn(async () => ({ status: 200 }));
      const runTargetRequest = createRunRequestByItemPathname({
        collection: target.collection,
        activeEnvironmentName: 'Prod',
        workspacePath: target.workspacePath,
        runItem: nestedRunItem
      });

      await runTargetRequest('auth/csrf', makeCallerBru());

      const nested = nestedRunItem.mock.calls[0][0];
      expect(nested.item.pathname).toBe(path.join(authPath, 'auth', 'csrf.yml'));
      expect(nested.target.collection).toEqual(expect.objectContaining({ uid: target.collection.uid, root: target.collection.root }));
      expect(Object.keys(nested.target)).toEqual(['collection']);
    });

    it('matches the request path\'s exact case, on every platform', async () => {
      await expect(runFromAuth({ requestPath: 'Auth/Login' }))
        .rejects.toThrow('bru.runRequest: no request "Auth/Login" in the collection "Auth API"');
    });

    it('rejects a request path that leaves the target collection, without naming paths on disk', async () => {
      await expect(runFromAuth({ requestPath: '../orders/list' }))
        .rejects.toThrow('bru.runRequest: "../orders/list" is outside the collection "Auth API"');
    });

    it('rejects a request that does not exist in the target, without naming paths on disk', async () => {
      await expect(runFromAuth({ requestPath: 'auth/missing' }))
        .rejects.toThrow('bru.runRequest: no request "auth/missing" in the collection "Auth API"');
    });

    it('rejects an unknown collection name', async () => {
      await expect(runFromAuth({ options: { collection: 'Old Auth Name' } }))
        .rejects.toThrow('bru.runRequest: no collection named "Old Auth Name" in the workspace');
    });

    it('rejects a name shared by more than one collection', async () => {
      const workspace = makeWorkspace();
      const copyPath = path.join(workspace.root, 'collections', 'auth-copy');
      writeAuthCollection(copyPath);
      writeWorkspace(workspace.root, [
        { name: 'Orders', relativePath: 'collections/orders' },
        { name: 'Auth API', relativePath: 'collections/auth' },
        { name: 'Auth API copy', relativePath: 'collections/auth-copy' }
      ]);

      await expect(runFromAuth({ workspace })).rejects.toThrow('more than one collection in the workspace is named "Auth API"');
    });

    it('rejects when the calling collection is not in a workspace', async () => {
      const { ordersPath } = makeWorkspace();
      const runRequestByItemPathname = createRunRequestByItemPathname({
        collection: makeCallerCollection(ordersPath),
        activeEnvironmentName: undefined,
        workspacePath: undefined,
        runItem: jest.fn()
      });

      await expect(runRequestByItemPathname('auth/login', makeCallerBru(), { collection: 'Auth API' }))
        .rejects.toThrow('this collection is not in a workspace');
    });

    it('rejects options that are not an object, and a collection that is not a name', async () => {
      await expect(runFromAuth({ options: 'Auth API' })).rejects.toThrow('bru.runRequest: options must be an object');
      await expect(runFromAuth({ options: { collection: 42 } })).rejects.toThrow('options.collection must be the name of a collection');
    });
  });
});
