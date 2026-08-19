const path = require('node:path');
const { get, set } = require('lodash');

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) },
  dialog: { showOpenDialog: jest.fn() }
}));

const { buildTree, REQUEST_UID_PATHS } = require('./tree-builder');

const COLLECTION_PATH = path.join(path.sep === '\\' ? 'C:\\' : '/', 'collections', 'my-collection');

const buildSingleRequest = (relativePath, data) =>
  buildTree(COLLECTION_PATH, new Map([[relativePath, { data, raw: '' }]])).items[0];

const REQUEST_LIST_PATHS = [
  ['request.params', [{ name: 'q', value: '1' }, { name: 'page', value: '2' }]],
  ['request.headers', [{ name: 'Accept', value: '*/*' }, { name: 'X-Trace', value: 'on' }]],
  ['request.vars.req', [{ name: 'token' }, { name: 'userId' }]],
  ['request.vars.res', [{ name: 'sessionId' }, { name: 'etag' }]],
  ['request.assertions', [{ name: 'res.status', value: '200' }, { name: 'res.body.ok', value: 'true' }]],
  ['request.body.formUrlEncoded', [{ name: 'field' }, { name: 'other' }]],
  ['request.body.multipartForm', [{ name: 'file' }, { name: 'caption' }]],
  ['request.body.file', [{ filePath: 'a.json' }, { filePath: 'b.json' }]],
  ['request.body.ws', [{ name: 'ping', content: 'ping' }, { name: 'pong', content: 'pong' }]]
];

const requestWithEveryList = () => {
  const data = { name: 'req', type: 'http-request', request: {} };
  for (const [dotPath, entries] of REQUEST_LIST_PATHS) {
    set(data, dotPath, entries.map((entry) => ({ ...entry })));
  }
  return data;
};

describe('buildTree — app code', () => {
  it('carries a request app block so the App view survives a cold mount', () => {
    const app = { enabled: true, code: '<h1>hello</h1>' };
    const node = buildSingleRequest('req.yml', { name: 'req', type: 'http-request', request: {}, app });

    expect(node.app).toEqual(app);
  });

  it('carries the app code of a standalone app item', () => {
    const node = buildSingleRequest('my-app.yml', {
      name: 'my-app',
      type: 'app',
      request: null,
      app: { code: '<h1>standalone</h1>' }
    });

    expect(node.app).toEqual({ code: '<h1>standalone</h1>' });
  });

  it('leaves app null for a request without one', () => {
    expect(buildSingleRequest('req.yml', { name: 'req', type: 'http-request', request: {} }).app).toBeNull();
  });
});

describe('buildTree — environments', () => {
  const buildSingleEnvironment = (data) =>
    buildTree(COLLECTION_PATH, new Map([[path.join('environments', 'Local.yml'), { data, raw: '' }]])).environments[0];

  it('carries the color of an environment', () => {
    const node = buildSingleEnvironment({ name: 'Local', color: '#CE4F3B', variables: [] });

    expect(node.color).toBe('#CE4F3B');
  });

  it('carries external secrets alongside the variables', () => {
    const externalSecrets = { type: 'infisical', variables: [{ name: 'token' }] };
    const node = buildSingleEnvironment({ name: 'Local', variables: [], externalSecrets });

    expect(node.externalSecrets).toEqual(externalSecrets);
  });

  it('names the environment after its file, not the name stored inside it', () => {
    const node = buildSingleEnvironment({ name: 'stale', variables: [] });

    expect(node.name).toBe('Local');
  });
});

describe('buildTree — uid hydration', () => {
  it('hydrates exactly the request lists this spec covers', () => {
    expect(REQUEST_UID_PATHS.map(([dotPath]) => dotPath).sort()).toEqual(
      REQUEST_LIST_PATHS.map(([dotPath]) => dotPath).sort()
    );
  });

  it.each(REQUEST_LIST_PATHS)('gives every entry in %s a unique uid', (dotPath, fixture) => {
    const node = buildSingleRequest('req.bru', requestWithEveryList());

    const entries = get({ request: node.request }, dotPath);
    expect(entries).toHaveLength(fixture.length);
    const uids = entries.map((entry) => entry.uid);
    expect(uids.filter((uid) => typeof uid !== 'string' || !uid.length)).toStrictEqual([]);
    expect(new Set(uids).size).toBe(uids.length);
  });

  it('assigns the same websocket message uids across rebuilds so persisted per-message UI state survives a restart', () => {
    const first = buildSingleRequest('req.bru', requestWithEveryList());
    const second = buildSingleRequest('req.bru', requestWithEveryList());

    expect(second.request.body.ws.map((message) => message.uid)).toEqual(
      first.request.body.ws.map((message) => message.uid)
    );
  });

  it('scopes websocket message uids to the request, so two requests never share one', () => {
    const first = buildSingleRequest('chat.bru', requestWithEveryList());
    const second = buildSingleRequest('echo.bru', requestWithEveryList());

    expect(second.request.body.ws[0].uid).not.toEqual(first.request.body.ws[0].uid);
  });
});
