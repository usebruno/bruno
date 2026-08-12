const path = require('path');
const fs = require('fs');
const os = require('os');
const { INVALID_EXTENSION_MESSAGE } = require('../../src/app/apiSpecs');

jest.mock('electron', () => ({
  dialog: { showOpenDialog: jest.fn() },
  ipcMain: { emit: jest.fn() }
}));

const { ipcMain } = require('electron');
const { openApiSpec } = require('../../src/app/apiSpecs');

describe('openApiSpec', () => {
  let tmpDir;
  let win;
  let watcher;

  const writeSpecFile = (filename, content) => {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-apispec-'));
    win = { webContents: { send: jest.fn() } };
    watcher = { hasWatcher: jest.fn() };
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test.each(['spec.txt', 'spec.xml', 'spec', 'spec.yamlx'])(
    'rejects a file with an unsupported extension (%s)',
    async (filename) => {
      const specPath = writeSpecFile(filename, 'This is a plain text file, not an OpenAPI spec.');

      await openApiSpec(win, watcher, specPath);

      expect(win.webContents.send).toHaveBeenCalledWith('main:display-error', {
        message: INVALID_EXTENSION_MESSAGE
      });
      expect(ipcMain.emit).not.toHaveBeenCalled();
    }
  );

  test.each(['openapi.yaml', 'openapi.yml', 'openapi.json', 'openapi.YAML', 'openapi.Json'])(
    'accepts a file with a supported extension (%s)',
    async (filename) => {
      const specPath = writeSpecFile(filename, '{}');
      watcher.hasWatcher.mockReturnValue(false);

      await openApiSpec(win, watcher, specPath);

      expect(win.webContents.send).not.toHaveBeenCalledWith('main:display-error', expect.anything());
      expect(ipcMain.emit).toHaveBeenCalledWith('main:apispec-opened', win, specPath, expect.any(String), undefined);
    }
  );

  test('does not send a display error when dontSendDisplayErrors is set', async () => {
    const specPath = writeSpecFile('spec.txt', 'not a spec');

    await openApiSpec(win, watcher, specPath, { dontSendDisplayErrors: true });

    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  test('opens a valid spec by emitting main:apispec-opened', async () => {
    const specPath = writeSpecFile('openapi.yaml', 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0\npaths: {}\n');
    watcher.hasWatcher.mockReturnValue(false);

    await openApiSpec(win, watcher, specPath);

    expect(ipcMain.emit).toHaveBeenCalledWith('main:apispec-opened', win, specPath, expect.any(String), undefined);
    expect(win.webContents.send).not.toHaveBeenCalledWith('main:display-error', expect.anything());
  });

  test('opens a malformed file with a valid extension without throwing, resolving json to null', async () => {
    const specPath = writeSpecFile('malformed.yaml', 'openapi: 3.0.0\ninfo:\n  title: Test\n   version: : :\npaths: [');
    watcher.hasWatcher.mockReturnValue(true);

    await openApiSpec(win, watcher, specPath);

    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:apispec-tree-updated',
      'addFile',
      expect.objectContaining({ pathname: specPath, json: null })
    );
    expect(win.webContents.send).not.toHaveBeenCalledWith('main:display-error', expect.anything());
  });

  test('sends the referenced files inlined as resolvedJson for a multi-file spec', async () => {
    writeSpecFile('endpoint.yaml', 'get:\n  summary: Hello endpoint\n  operationId: hello\n');
    const specPath = writeSpecFile(
      'openapi.yaml',
      'openapi: 3.1.0\ninfo:\n  title: Test API\n  version: 1.0.0\npaths:\n  /hello:\n    $ref: "./endpoint.yaml"\n'
    );
    watcher.hasWatcher.mockReturnValue(true);

    await openApiSpec(win, watcher, specPath);

    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:apispec-tree-updated',
      'addFile',
      expect.objectContaining({
        json: expect.objectContaining({ paths: { '/hello': { $ref: './endpoint.yaml' } } }),
        resolvedJson: expect.objectContaining({
          paths: { '/hello': { get: { summary: 'Hello endpoint', operationId: 'hello' } } }
        })
      })
    );
  });

  test('sends resolvedJson as null for a single-file spec', async () => {
    const specPath = writeSpecFile(
      'openapi.yaml',
      'openapi: 3.1.0\ninfo:\n  title: Test API\n  version: 1.0.0\npaths:\n  /hello:\n    get:\n      responses:\n        "200":\n          description: ok\n'
    );
    watcher.hasWatcher.mockReturnValue(true);

    await openApiSpec(win, watcher, specPath);

    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:apispec-tree-updated',
      'addFile',
      expect.objectContaining({ resolvedJson: null })
    );
  });

  test('opens a broken JSON file with a valid extension without throwing, resolving json to null', async () => {
    const specPath = writeSpecFile('broken.json', '{\n  "openapi": "3.0.0",\n  "info": {\n    "title": "Test"\n    "version": "1.0.0"\n  },\n  "paths": {\n');
    watcher.hasWatcher.mockReturnValue(true);

    await openApiSpec(win, watcher, specPath);

    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:apispec-tree-updated',
      'addFile',
      expect.objectContaining({ pathname: specPath, json: null })
    );
    expect(win.webContents.send).not.toHaveBeenCalledWith('main:display-error', expect.anything());
  });
});
