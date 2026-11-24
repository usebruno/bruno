jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: { getPath: jest.fn(() => require('os').tmpdir()), getVersion: jest.fn(() => '0.0.0') }
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const jsyaml = require('js-yaml');
const { ipcMain } = require('electron');
const registerOpenAPISyncIpc = require('../../src/ipc/openapi-sync');

const SOURCE_URL = 'https://example.com/openapi.json';

const getUpdateSyncConfigHandler = () => {
  registerOpenAPISyncIpc({ webContents: { send: jest.fn() } });
  const [, handler] = ipcMain.handle.mock.calls.find(([channel]) => channel === 'renderer:update-openapi-sync-config');
  return (collectionPath, config) => handler({}, { collectionPath, config });
};

const writeCollection = (collectionPath, format, openapi) => {
  if (format === 'yml') {
    fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), jsyaml.dump({
      opencollection: '1.0.0',
      info: { name: 'Pets' },
      ...(openapi && { extensions: { bruno: { openapi } } })
    }));
    return;
  }
  fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify({
    version: '1',
    name: 'Pets',
    type: 'collection',
    ...(openapi && { openapi })
  }, null, 2));
};

const configFileOf = (collectionPath, format) => path.join(collectionPath, format === 'yml' ? 'opencollection.yml' : 'bruno.json');

const readSyncConfig = (collectionPath, format) => {
  const content = fs.readFileSync(configFileOf(collectionPath, format), 'utf8');
  return format === 'yml' ? jsyaml.load(content).extensions.bruno.openapi : JSON.parse(content).openapi;
};

describe.each(['bru', 'yml'])('renderer:update-openapi-sync-config (%s collection)', (format) => {
  let collectionPath;
  let updateSyncConfig;

  beforeEach(() => {
    ipcMain.handle.mockClear();
    updateSyncConfig = getUpdateSyncConfigHandler();
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-openapi-sync-config-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it('saves the request naming and auth placement of a new connection', async () => {
    writeCollection(collectionPath, format);

    await updateSyncConfig(collectionPath, {
      sourceUrl: SOURCE_URL,
      groupBy: 'tags',
      authPlacement: 'request',
      requestNameSource: 'summary',
      autoCheck: true,
      autoCheckInterval: 5
    });

    expect(readSyncConfig(collectionPath, format)).toEqual([{
      sourceUrl: SOURCE_URL,
      groupBy: 'tags',
      authPlacement: 'request',
      requestNameSource: 'summary',
      autoCheck: true,
      autoCheckInterval: 5
    }]);
  });

  it('keeps the saved request naming and auth placement when other settings change', async () => {
    writeCollection(collectionPath, format, [{
      sourceUrl: SOURCE_URL,
      groupBy: 'tags',
      authPlacement: 'collection',
      requestNameSource: 'path',
      autoCheck: true,
      autoCheckInterval: 5
    }]);

    await updateSyncConfig(collectionPath, { sourceUrl: SOURCE_URL, autoCheck: false, autoCheckInterval: 10 });

    expect(readSyncConfig(collectionPath, format)).toEqual([expect.objectContaining({
      authPlacement: 'collection',
      requestNameSource: 'path',
      autoCheck: false,
      autoCheckInterval: 10
    })]);
  });

  it.each([
    ['an auth placement', { authPlacement: 'folder' }, 'authPlacement must be one of: request, collection'],
    ['a request naming', { requestNameSource: 'title' }, 'requestNameSource must be one of: summary, operationId, description, path']
  ])('refuses %s the sync does not know and leaves the config as it was', async (_label, setting, message) => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    writeCollection(collectionPath, format);
    const before = fs.readFileSync(configFileOf(collectionPath, format), 'utf8');

    await expect(updateSyncConfig(collectionPath, { sourceUrl: SOURCE_URL, ...setting })).rejects.toThrow(message);

    expect(fs.readFileSync(configFileOf(collectionPath, format), 'utf8')).toBe(before);
  });
});
