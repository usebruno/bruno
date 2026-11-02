const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ApiSpecWatcher = require('../../src/app/apiSpecsWatcher');

describe('ApiSpecWatcher', () => {
  let specDir;
  let win;
  let apiSpecWatcher;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const specUpdates = () => win.webContents.send.mock.calls.filter(([channel]) => channel === 'main:apispec-tree-updated');

  const waitForUpdates = async (predicate, description) => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (predicate()) return;
      await sleep(25);
    }
    throw new Error(`Timed out waiting for ${description}. Updates so far: ${specUpdates().length}`);
  };

  beforeEach(() => {
    specDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-apispec-watcher-')));
    win = { webContents: { send: jest.fn() } };
    apiSpecWatcher = new ApiSpecWatcher();
  });

  afterEach(async () => {
    await apiSpecWatcher.closeAllWatchers();
    fs.rmSync(specDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  });

  const lastUpdate = () => specUpdates()[specUpdates().length - 1];

  it('counts a spec as watched while its watcher is still starting', () => {
    const specPath = path.join(specDir, 'openapi.yaml');
    fs.writeFileSync(specPath, 'openapi: 3.0.3\ninfo:\n  title: Orders API\npaths: {}\n');

    apiSpecWatcher.addWatcher(win, specPath, 'api-spec-uid', {});

    expect(apiSpecWatcher.hasWatcher(specPath)).toBe(true);
  });

  it('keeps a single watcher when the same spec is added twice before the first one starts', async () => {
    const specPath = path.join(specDir, 'openapi.yaml');
    fs.writeFileSync(specPath, 'openapi: 3.0.3\ninfo:\n  title: Orders API\npaths: {}\n');

    apiSpecWatcher.addWatcher(win, specPath, 'api-spec-uid', {});
    apiSpecWatcher.addWatcher(win, specPath, 'api-spec-uid', {});
    await waitForUpdates(() => specUpdates().length >= 1, 'the spec to be picked up');
    await sleep(300);

    fs.writeFileSync(specPath, 'openapi: 3.0.3\ninfo:\n  title: Orders API v2\npaths: {}\n');
    await waitForUpdates(() => lastUpdate()[2].name === 'Orders API v2', 'the edit to be picked up');
    await sleep(300);

    expect(specUpdates().filter(([, type]) => type === 'addFile')).toHaveLength(1);
    expect(specUpdates().filter(([, type]) => type === 'changeFile')).toHaveLength(1);
  }, 20000);

  it('starts nothing when a spec is removed before its watcher starts', async () => {
    const specPath = path.join(specDir, 'openapi.yaml');
    fs.writeFileSync(specPath, 'openapi: 3.0.3\ninfo:\n  title: Orders API\npaths: {}\n');

    apiSpecWatcher.addWatcher(win, specPath, 'api-spec-uid', {});
    apiSpecWatcher.removeWatcher(specPath, win);
    await sleep(300);

    expect(apiSpecWatcher.hasWatcher(specPath)).toBe(false);
    expect(specUpdates()).toEqual([]);
  });

  it('names a spec after its info.title when it is picked up', async () => {
    const specPath = path.join(specDir, 'orders.v2.yaml');
    fs.writeFileSync(specPath, 'openapi: 3.0.3\ninfo:\n  title: Orders API\n  version: 1.0.0\npaths: {}\n');

    apiSpecWatcher.addWatcher(win, specPath, 'api-spec-uid', {});
    await waitForUpdates(() => specUpdates().length >= 1, 'the spec to be picked up');

    const [, type, file] = specUpdates()[0];
    expect(type).toBe('addFile');
    expect(file.name).toBe('Orders API');
  }, 20000);

  it('follows an edited title, and falls back to the filename once the title is gone', async () => {
    const specPath = path.join(specDir, 'orders.v2.yaml');
    fs.writeFileSync(specPath, 'openapi: 3.0.3\ninfo:\n  title: Orders API\n  version: 1.0.0\npaths: {}\n');

    apiSpecWatcher.addWatcher(win, specPath, 'api-spec-uid', {});
    await waitForUpdates(() => specUpdates().length >= 1, 'the spec to be picked up');

    fs.writeFileSync(specPath, 'openapi: 3.0.3\ninfo:\n  title: Orders API v2\n  version: 1.0.0\npaths: {}\n');
    await waitForUpdates(() => lastUpdate()[2].name === 'Orders API v2', 'the edited title to rename the spec');
    expect(lastUpdate()[1]).toBe('changeFile');

    fs.writeFileSync(specPath, 'openapi: 3.0.3\ninfo:\n  version: 1.0.0\npaths: {}\n');
    await waitForUpdates(() => lastUpdate()[2].name === 'orders.v2', 'the name to fall back to the filename');
    expect(lastUpdate()[1]).toBe('changeFile');
  }, 20000);

  it('resolves the spec once on open and again when a referenced file changes', async () => {
    const refPath = path.join(specDir, 'endpoint.yaml');
    const specPath = path.join(specDir, 'openapi.yaml');
    fs.writeFileSync(refPath, 'get:\n  operationId: hello\n');
    fs.writeFileSync(specPath, 'openapi: 3.1.0\npaths:\n  /hello:\n    $ref: \'./endpoint.yaml\'\n');

    apiSpecWatcher.addWatcher(win, specPath, 'api-spec-uid', {});
    await waitForUpdates(() => specUpdates().length >= 1, 'the spec to be picked up');
    await sleep(600);
    expect(specUpdates()).toHaveLength(1);
    expect(specUpdates()[0][2].resolvedJson.paths['/hello'].get.operationId).toBe('hello');

    fs.writeFileSync(refPath, 'get:\n  operationId: helloEdited\n');

    await waitForUpdates(() => specUpdates().length > 1, 'the ref file edit to refresh the spec');
    const [, type, file] = specUpdates()[specUpdates().length - 1];
    expect(type).toBe('changeFile');
    expect(file.resolvedJson.paths['/hello'].get.operationId).toBe('helloEdited');
  }, 20000);
});
