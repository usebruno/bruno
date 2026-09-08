const path = require('path');

const watcherHandlers = {};
const mockWatcher = {
  on: jest.fn((event, handler) => {
    watcherHandlers[event] = handler;
    return mockWatcher;
  }),
  close: jest.fn()
};

jest.mock('chokidar', () => ({
  watch: jest.fn(() => mockWatcher)
}));

jest.mock('../utils/filesystem', () => ({
  hasRequestExtension: jest.fn(),
  isWSLPath: jest.fn(() => false),
  normalizeAndResolvePath: jest.fn((pathname) => pathname),
  sizeInMB: jest.fn(),
  getCollectionFormat: jest.fn(() => 'bru')
}));

jest.mock('@usebruno/filestore', () => ({
  parseEnvironment: jest.fn(),
  parseRequest: jest.fn(),
  parseRequestViaWorker: jest.fn(),
  parseCollection: jest.fn(),
  parseFolder: jest.fn()
}), { virtual: true });

jest.mock('@usebruno/common/utils', () => ({
  parseValueByDataType: jest.fn()
}), { virtual: true });

jest.mock('../utils/common', () => ({
  uuid: jest.fn(() => 'uuid')
}));

jest.mock('../cache/requestUids', () => ({
  getRequestUid: jest.fn()
}));

jest.mock('../utils/encryption', () => ({
  decryptStringSafe: jest.fn()
}));

jest.mock('../store/env-secrets', () => jest.fn().mockImplementation(() => ({})));

jest.mock('../services/snapshot', () => ({
  getCollection: jest.fn()
}));

jest.mock('../utils/collection', () => ({
  parseFileMeta: jest.fn(),
  hydrateRequestWithUuid: jest.fn()
}));

jest.mock('../utils/parse', () => ({
  parseLargeRequestWithRedaction: jest.fn()
}));

jest.mock('../utils/transformBrunoConfig', () => ({
  transformBrunoConfigAfterRead: jest.fn()
}));

jest.mock('./dotenv-watcher', () => ({
  addCollectionWatcher: jest.fn(),
  removeCollectionWatcher: jest.fn()
}));

const { getBrunoConfig } = require('../store/bruno-config');
const collectionWatcher = require('./collection-watcher');

describe('CollectionWatcher', () => {
  afterEach(() => {
    collectionWatcher.closeAllWatchers();
    Object.keys(watcherHandlers).forEach((event) => delete watcherHandlers[event]);
    jest.clearAllMocks();
  });

  it('honors configured ignore paths during the initial scan', () => {
    const watchPath = path.join('tmp', 'collection');
    const collectionUid = 'collection-uid';
    const brunoConfig = { ignore: ['myfolder'] };
    const win = { webContents: { send: jest.fn() } };

    collectionWatcher.addWatcher(win, watchPath, collectionUid, brunoConfig);

    const ignored = mockWatcher.on.mock.calls.length > 0
      ? require('chokidar').watch.mock.calls[0][1].ignored
      : null;

    expect(getBrunoConfig(collectionUid)).toEqual(brunoConfig);
    expect(ignored(path.join(watchPath, 'myfolder', 'somefile.yml'))).toBe(true);
    expect(ignored(path.join(watchPath, 'visible', 'somefile.yml'))).toBe(false);
  });
});
