const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ApiSpecWatcher = require('../../src/app/apiSpecsWatcher');

describe('ApiSpecWatcher ref file watching', () => {
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
