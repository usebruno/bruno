const { describe, it, expect, afterAll } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { stringifyRequest, stringifyEnvironment, stringifyCollection } = require('@usebruno/filestore');
const { createCollectionJsonFromPathname } = require('../../src/utils/collection');
const { createRunRequestByPathname } = require('../../src/runner/run-request-by-pathname');

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

const writeAuthCollection = (collectionPath) => {
  writeFile(collectionPath, 'opencollection.yml', stringifyCollection({}, { name: 'Auth API', version: '1' }, { format: 'yml' }));
  writeFile(collectionPath, path.join('auth', 'login.yml'), stringifyRequest(httpItem('login', '{{baseUrl}}/login'), { format: 'yml' }));
  writeFile(collectionPath, path.join('environments', 'Prod.yml'), stringifyEnvironment(environment('Prod', 'https://auth.prod'), { format: 'yml' }));
  writeFile(collectionPath, '.env', 'AUTH_CLIENT_SECRET=from-dotenv\n');
};

const writeWorkspace = (workspacePath, collections) => {
  const entries = collections.map(({ name, relativePath }) => `  - name: "${name}"\n    path: "${relativePath}"`).join('\n');
  writeFile(workspacePath, 'workspace.yml', `opencollection: 1.0.0\ninfo:\n  name: "Workspace"\n  type: workspace\n\ncollections:\n${entries}\n`);
};

const tmpDirs = [];
const makeWorkspace = () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-run-request-')));
  tmpDirs.push(root);

  const ordersPath = path.join(root, 'collections', 'orders');
  writeFile(ordersPath, 'bruno.json', JSON.stringify({ version: '1', name: 'Orders', type: 'collection' }));
  writeFile(ordersPath, 'list.bru', 'meta {\n  name: list\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://orders/list\n  body: none\n  auth: none\n}\n');
  const authPath = path.join(root, 'collections', 'auth');
  writeAuthCollection(authPath);
  writeWorkspace(root, [
    { name: 'Orders', relativePath: 'collections/orders' },
    { name: 'Old Auth Name', relativePath: 'collections/auth' }
  ]);

  return { root, ordersPath, authPath };
};

const makeCallerContext = (ordersPath) => {
  const collection = createCollectionJsonFromPathname(ordersPath);
  return {
    collection,
    collectionPath: ordersPath,
    brunoConfig: collection.brunoConfig,
    collectionRoot: collection.root,
    envVars: { __name__: 'Prod' },
    processEnvVars: {},
    runtimeVariables: { callerOnly: 'yes' },
    globalEnvVars: { region: 'eu' },
    persistPaths: { collectionRootPath: path.join(ordersPath, 'collection.bru') }
  };
};

const makeRunItem = () => jest.fn(async (item) => ({ response: { status: 200, data: { ran: item.name } } }));

afterAll(() => {
  tmpDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
});

describe('createRunRequestByPathname', () => {
  describe('a request of the same collection', () => {
    it('runs the item with the running context and resolves with its response', async () => {
      const { root, ordersPath } = makeWorkspace();
      const context = makeCallerContext(ordersPath);
      const runItem = makeRunItem();
      const runRequestByPathname = createRunRequestByPathname({ context, workspacePath: root, runItem });

      const response = await runRequestByPathname('list', {});

      expect(response).toEqual({ status: 200, data: { ran: 'list' } });
      expect(runItem).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: path.join(ordersPath, 'list.bru') }),
        context,
        runRequestByPathname
      );
    });

    it('rejects with the invalid-path message for an unknown request', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem: makeRunItem() });

      await expect(runRequestByPathname('missing', {}))
        .rejects.toBe(`bru.runRequest: invalid request path - ${path.join(ordersPath, 'missing.bru')}`);
    });
  });

  describe('a request of another collection', () => {
    it('finds the collection by its own name and runs the request with that collection\'s context', async () => {
      const { root, ordersPath, authPath } = makeWorkspace();
      const callerContext = makeCallerContext(ordersPath);
      const runItem = makeRunItem();
      const runRequestByPathname = createRunRequestByPathname({ context: callerContext, workspacePath: root, runItem });

      const response = await runRequestByPathname('auth/login', {}, { collection: 'Auth API' });

      expect(response).toEqual({ status: 200, data: { ran: 'login' } });
      const [item, context] = runItem.mock.calls[0];
      expect(item.pathname).toBe(path.join(authPath, 'auth', 'login.yml'));
      expect(context.collectionPath).toBe(authPath);
      expect(context.brunoConfig.name).toBe('Auth API');
      expect(context.envVars).toEqual({ baseUrl: 'https://auth.prod', __name__: 'Prod' });
      expect(context.processEnvVars.AUTH_CLIENT_SECRET).toBe('from-dotenv');
    });

    it('isolates the target: fresh runtime variables, a copy of the global environment, nothing persisted', async () => {
      const { root, ordersPath } = makeWorkspace();
      const callerContext = makeCallerContext(ordersPath);
      const runItem = makeRunItem();
      const runRequestByPathname = createRunRequestByPathname({ context: callerContext, workspacePath: root, runItem });

      await runRequestByPathname('auth/login', {}, { collection: 'Auth API' });

      const [, context] = runItem.mock.calls[0];
      expect(context.runtimeVariables).toEqual({});
      expect(context.globalEnvVars).toEqual({ region: 'eu' });
      expect(context.globalEnvVars).not.toBe(callerContext.globalEnvVars);
      expect(context.persistPaths).toEqual({});
    });

    it('binds the nested runRequest to the target collection', async () => {
      const { root, ordersPath, authPath } = makeWorkspace();
      const runItem = makeRunItem();
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem });

      await runRequestByPathname('auth/login', {}, { collection: 'Auth API' });
      const [, targetContext, runTargetRequestByPathname] = runItem.mock.calls[0];
      await runTargetRequestByPathname('auth/login', {});

      const [nestedItem, nestedContext] = runItem.mock.calls[1];
      expect(nestedItem.pathname).toBe(path.join(authPath, 'auth', 'login.yml'));
      expect(nestedContext).toBe(targetContext);
    });

    it('ignores an active environment name that is not a bare file name', async () => {
      const { root, ordersPath } = makeWorkspace();
      const callerContext = { ...makeCallerContext(ordersPath), envVars: { __name__: '../Prod' } };
      const runItem = makeRunItem();
      const runRequestByPathname = createRunRequestByPathname({ context: callerContext, workspacePath: root, runItem });

      await runRequestByPathname('auth/login', {}, { collection: 'Auth API' });

      expect(runItem.mock.calls[0][1].envVars).toEqual({});
    });

    it('rejects an unknown collection name', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem: makeRunItem() });

      await expect(runRequestByPathname('auth/login', {}, { collection: 'Old Auth Name' }))
        .rejects.toThrow('bru.runRequest: no collection named "Old Auth Name" in the workspace');
    });

    it('rejects a name shared by more than one collection', async () => {
      const { root, ordersPath } = makeWorkspace();
      writeAuthCollection(path.join(root, 'collections', 'auth-copy'));
      writeWorkspace(root, [
        { name: 'Orders', relativePath: 'collections/orders' },
        { name: 'Auth API', relativePath: 'collections/auth' },
        { name: 'Auth API copy', relativePath: 'collections/auth-copy' }
      ]);
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem: makeRunItem() });

      await expect(runRequestByPathname('auth/login', {}, { collection: 'Auth API' }))
        .rejects.toThrow('more than one collection in the workspace is named "Auth API"');
    });

    it('rejects a request outside the target, without naming paths on disk', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem: makeRunItem() });

      await expect(runRequestByPathname('../orders/list', {}, { collection: 'Auth API' }))
        .rejects.toThrow('bru.runRequest: no request "../orders/list" in the collection "Auth API"');
    });

    it('gives the script only the response, not the full URL', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runItem = jest.fn(async () => ({
        response: { status: 200, statusText: 'OK', headers: {}, data: { token: 't' }, url: 'https://auth.prod/login?api_key=secret', responseTime: 5, duration: 5, size: 13 }
      }));
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem });

      const response = await runRequestByPathname('auth/login', {}, { collection: 'Auth API' });

      expect(response).toEqual({ status: 200, statusText: 'OK', headers: {}, data: { token: 't' }, duration: 5, size: 13 });
    });

    it('replaces a request extension the script wrote with the target collection\'s own', async () => {
      const { root, ordersPath, authPath } = makeWorkspace();
      const runItem = makeRunItem();
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem });

      await runRequestByPathname('auth/login.bru', {}, { collection: 'Auth API' });

      expect(runItem.mock.calls[0][0].pathname).toBe(path.join(authPath, 'auth', 'login.yml'));
    });

    it('uses the environment that was active when the run started, even if a script renames it', async () => {
      const { root, ordersPath } = makeWorkspace();
      const callerContext = makeCallerContext(ordersPath);
      const runItem = makeRunItem();
      const runRequestByPathname = createRunRequestByPathname({ context: callerContext, workspacePath: root, runItem });
      callerContext.envVars.__name__ = 'Dev';

      await runRequestByPathname('auth/login', {}, { collection: 'Auth API' });

      expect(runItem.mock.calls[0][1].envVars.__name__).toBe('Prod');
    });

    it('keeps the other collection\'s unparsable files out of the run report', async () => {
      const { root, ordersPath, authPath } = makeWorkspace();
      writeFile(authPath, path.join('auth', 'broken.yml'), 'info: [unclosed\n');
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem: makeRunItem() });
      const skippedFilesBefore = global.brunoSkippedFiles;
      global.brunoSkippedFiles = [];
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await runRequestByPathname('auth/login', {}, { collection: 'Auth API' });
        expect(global.brunoSkippedFiles).toEqual([]);
      } finally {
        warn.mockRestore();
        global.brunoSkippedFiles = skippedFilesBefore;
      }
    });

    it('rejects when the running collection is not in a workspace', async () => {
      const { ordersPath } = makeWorkspace();
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: null, runItem: makeRunItem() });

      await expect(runRequestByPathname('auth/login', {}, { collection: 'Auth API' }))
        .rejects.toThrow('this collection is not in a workspace');
    });

    it('rejects when the workspace found above the running collection doesn\'t list it', async () => {
      const { root } = makeWorkspace();
      const unlistedPath = path.join(root, 'collections', 'unlisted');
      writeFile(unlistedPath, 'bruno.json', JSON.stringify({ version: '1', name: 'Unlisted', type: 'collection' }));
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(unlistedPath), workspacePath: root, runItem: makeRunItem() });

      await expect(runRequestByPathname('auth/login', {}, { collection: 'Auth API' }))
        .rejects.toThrow('this collection is not in a workspace');
    });

    it('rejects options that are not an object, and a collection that is not a name', async () => {
      const { root, ordersPath } = makeWorkspace();
      const runRequestByPathname = createRunRequestByPathname({ context: makeCallerContext(ordersPath), workspacePath: root, runItem: makeRunItem() });

      await expect(runRequestByPathname('auth/login', {}, 'Auth API')).rejects.toThrow('bru.runRequest: options must be an object');
      await expect(runRequestByPathname('auth/login', {}, { collection: '' })).rejects.toThrow('options.collection must be the name of a collection');
    });
  });
});
