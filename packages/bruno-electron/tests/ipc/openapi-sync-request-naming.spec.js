const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

let mockUserData;

jest.mock('electron', () => {
  const handlers = {};
  return {
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler;
      }),
      on: jest.fn(),
      _getHandler: (channel) => handlers[channel]
    },
    app: { getPath: jest.fn(() => mockUserData), getVersion: jest.fn(() => '1.0.0') }
  };
});

jest.mock('@usebruno/filestore', () => {
  const filestore = jest.requireActual('@usebruno/filestore');
  return { ...filestore, stringifyRequestViaWorker: async (item, options) => filestore.stringifyRequest(item, options) };
});

const { ipcMain } = require('electron');
const { parseRequest, stringifyRequest, stringifyCollection } = require('@usebruno/filestore');
const { openApiToBruno } = require('@usebruno/converters');
const registerOpenAPISyncIpc = require('../../src/ipc/openapi-sync');

const { _test: { specConversionOptions, requestFileBase } } = registerOpenAPISyncIpc;

const spec = {
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1.0' },
  servers: [{ url: 'https://example.com' }],
  paths: {
    '/pets/{petId}': {
      get: { summary: 'Find pet by ID', operationId: 'getPetById', description: 'Returns a single pet.', responses: { 200: { description: 'OK' } } }
    }
  }
};

const syncedNameWith = (syncConfig) => openApiToBruno(spec, specConversionOptions({ openapi: [{ sourceUrl: '../openapi.yaml', ...syncConfig }] })).items[0].name;

describe('syncing with the saved request naming', () => {
  it.each([
    ['summary', 'Find pet by ID'],
    ['operationId', 'getPetById'],
    ['description', 'Returns a single pet'],
    ['path', '/pets/{petId}']
  ])('names synced requests from the saved %s choice', (requestNameSource, name) => {
    expect(specConversionOptions({ openapi: [{ sourceUrl: '../openapi.yaml', requestNameSource }] }).requestNameSource).toBe(requestNameSource);
    expect(syncedNameWith({ requestNameSource })).toBe(name);
  });

  it.each([undefined, 'title', 'OperationId', 7])('names synced requests from the summary when the saved choice is %p', (requestNameSource) => {
    expect(syncedNameWith({ requestNameSource })).toBe('Find pet by ID');
  });
});

describe('the file of a request that sync adds', () => {
  it.each([
    [{ name: '/pets/{petId}', filename: 'GET /pets/{petId}.bru' }, 'GET -pets-{petId}'],
    [{ name: '/pets/{petId}', filename: 'DELETE /pets/{petId}.yml' }, 'DELETE -pets-{petId}'],
    [{ name: 'Find pet by ID', filename: 'Find pet by ID (POST).bru' }, 'Find pet by ID (POST)'],
    [{ name: 'Find pet by ID' }, 'Find pet by ID']
  ])('is named after the file name the converter gives it, else after the request name: %j', (item, fileBase) => {
    expect(requestFileBase(item)).toBe(fileBase);
  });
});

describe.each(['bru', 'yml'])('a request that sync adds next to a %s file with the same name', (format) => {
  const SOURCE_URL = 'https://example.com/pets.json';
  const OK = { 200: { description: 'OK' } };
  const listPets = { summary: 'List pets', responses: OK };
  const previousSpec = { openapi: '3.0.3', info: { title: 'Pets', version: '1' }, paths: { '/pets': { get: listPets } } };
  const newSpec = { openapi: '3.0.3', info: { title: 'Pets', version: '2' }, paths: { '/pets': { post: listPets, get: listPets } } };
  let collectionPath;

  const requestIn = (file) => parseRequest(fs.readFileSync(path.join(collectionPath, file), 'utf8'), { format }).request;

  beforeEach(() => {
    mockUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-user-data-'));
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-collection-'));
    const config = { version: '1', name: 'Pets', type: 'collection', openapi: [{ sourceUrl: SOURCE_URL, groupBy: 'tags' }] };
    if (format === 'yml') {
      fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), stringifyCollection({}, { ...config, opencollection: '1.0.0' }, { format }));
    } else {
      fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify(config));
    }
    const [listPetsRequest] = openApiToBruno(previousSpec).items;
    fs.writeFileSync(path.join(collectionPath, `List pets.${format}`), stringifyRequest(listPetsRequest, { format }));
    registerOpenAPISyncIpc({ webContents: { send: jest.fn() } });
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    fs.rmSync(mockUserData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  const expectBothRequestsKept = () => {
    expect(requestIn(`List pets.${format}`).method).toBe('GET');
    expect(requestIn(`List pets 1.${format}`).method).toBe('POST');
  };

  it('keeps the existing request when the sync adds a new one', async () => {
    await ipcMain._getHandler('renderer:apply-openapi-sync')({}, {
      collectionPath,
      addNewRequests: true,
      removeDeletedRequests: false,
      diff: { newSpec, added: [{ method: 'POST', path: '/pets' }], modified: [], removed: [] },
      mode: 'sync'
    });

    expectBothRequestsKept();
  });

  it('keeps the existing request when a reset to the spec adds a new one', async () => {
    await ipcMain._getHandler('renderer:apply-openapi-sync')({}, { collectionPath, diff: { newSpec }, mode: 'reset' });

    expectBothRequestsKept();
  });

  it('keeps the existing request when a missing endpoint is added', async () => {
    const specsDir = path.join(mockUserData, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'stored.json'), JSON.stringify(newSpec));
    fs.writeFileSync(path.join(specsDir, 'metadata.json'), JSON.stringify({ [collectionPath]: [{ filename: 'stored.json', sourceUrl: SOURCE_URL }] }));

    await ipcMain._getHandler('renderer:add-missing-endpoints')({}, { collectionPath, endpoints: [{ method: 'POST', path: '/pets' }] });

    expectBothRequestsKept();
  });
});

describe.each(['bru', 'yml'])('requests whose files start with folder. or collection. in a %s collection', (format) => {
  const SOURCE_URL = 'https://example.com/folders.json';
  const OK = { 200: { description: 'OK' } };
  const spec = {
    openapi: '3.0.3',
    info: { title: 'Folders', version: '1' },
    paths: {
      '/folders': { post: { operationId: 'folder.create', responses: OK } },
      '/collections': { get: { tags: ['Collections'], operationId: 'collection.list', responses: OK } },
      '/collections/{id}': { get: { tags: ['Collections'], operationId: 'collection', responses: OK } }
    }
  };
  const endpoints = [{ method: 'POST', path: '/folders' }, { method: 'GET', path: '/collections' }, { method: 'GET', path: '/collections/{id}' }];
  const requestFiles = [`folder.create.${format}`, path.join('Collections', `collection.list.${format}`), path.join('Collections', `collection.${format}`)].sort();
  const folderAndCollectionFiles = [path.join('Collections', `folder.${format}`), format === 'yml' ? 'opencollection.yml' : 'collection.bru'].sort();
  const allFiles = [...requestFiles, ...folderAndCollectionFiles].sort();
  let collectionPath;

  const filesOnDisk = () => fs.readdirSync(collectionPath, { recursive: true }).filter((file) => file.endsWith(`.${format}`)).sort();
  const reset = () => ipcMain._getHandler('renderer:apply-openapi-sync')({}, { collectionPath, diff: { newSpec: spec }, mode: 'reset' });
  const sync = (diff, options) => ipcMain._getHandler('renderer:apply-openapi-sync')({}, {
    collectionPath,
    diff: { newSpec: spec, added: [], modified: [], removed: [], ...diff },
    mode: 'sync',
    ...options
  });

  beforeEach(async () => {
    mockUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-user-data-'));
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-collection-'));
    const config = { version: '1', name: 'Folders', type: 'collection', openapi: [{ sourceUrl: SOURCE_URL, groupBy: 'tags' }] };
    if (format === 'yml') {
      fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), stringifyCollection({}, { ...config, opencollection: '1.0.0' }, { format }));
    } else {
      fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify(config));
      fs.writeFileSync(path.join(collectionPath, 'collection.bru'), stringifyCollection({ request: { auth: { mode: 'none' } } }, config, { format }));
    }
    registerOpenAPISyncIpc({ webContents: { send: jest.fn() } });
    await reset();
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    fs.rmSync(mockUserData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('lists them as in sync, not missing, when comparing with the spec', async () => {
    const { missing, inSync } = await ipcMain._getHandler('renderer:get-collection-drift')({}, { collectionPath, compareSpec: spec });

    expect(missing).toEqual([]);
    expect(inSync.map(({ filePath }) => filePath).sort()).toEqual(requestFiles);
  });

  it('resets them in place instead of adding copies', async () => {
    await reset();

    expect(filesOnDisk()).toEqual(allFiles);
  });

  it('updates them in place when the sync lists them as new', async () => {
    await sync({ added: endpoints }, { addNewRequests: true });

    expect(filesOnDisk()).toEqual(allFiles);
  });

  it('removes them when the spec drops them', async () => {
    await sync({ newSpec: { ...spec, paths: {} }, removed: endpoints }, { removeDeletedRequests: true });

    expect(filesOnDisk()).toEqual(folderAndCollectionFiles);
  });
});
