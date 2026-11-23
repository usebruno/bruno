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

const { _test: { specConversionOptions } } = registerOpenAPISyncIpc;

const OK = { 200: { description: 'OK' } };
const PETS = { id: 'GET:/pets', method: 'GET', path: '/pets' };

const petsSpec = ({ summary = 'List pets', description = 'Lists pets.', operationId = 'listPets', header } = {}) => ({
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1' },
  paths: {
    '/pets': {
      get: {
        summary,
        ...(description !== null && { description }),
        operationId,
        responses: OK,
        ...(header && { parameters: [{ name: header, in: 'header', schema: { type: 'string' } }] })
      }
    }
  }
});

describe.each(['bru', 'yml'])('OpenAPI sync of request names and docs in a %s collection', (format) => {
  let collectionPath;
  let specFile;
  let requestFile;
  let syncConfig;

  const handler = (channel) => (args) => ipcMain._getHandler(channel)({}, { collectionPath, ...args });
  const compare = () => handler('renderer:compare-openapi-specs')({ collectionUid: 'pets', sourceUrl: specFile });
  const remote = (newSpec) => handler('renderer:get-collection-drift')({ compareSpec: newSpec });
  const stored = () => handler('renderer:get-collection-drift')({});
  const preview = (newSpec, preserveValues = true) => handler('renderer:get-endpoint-diff-data')({ endpointId: PETS.id, newSpec, preserveValues });
  const apply = (newSpec, { decision = 'accept-incoming', preserveValues = true, added = [], modified = [PETS], driftedToReset = [] } = {}) => handler('renderer:apply-openapi-sync')({
    addNewRequests: true,
    removeDeletedRequests: false,
    diff: { newSpec, added, modified, removed: [] },
    driftedToReset,
    mode: 'sync',
    endpointDecisions: { [PETS.id]: decision },
    preserveValues
  });

  const writeConfig = (extra = {}) => {
    syncConfig = { sourceUrl: specFile, groupBy: 'tags', ...extra };
    const config = { version: '1', name: 'Pets', type: 'collection', openapi: [syncConfig] };
    if (format === 'yml') {
      fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), stringifyCollection({}, { ...config, opencollection: '1.0.0' }, { format }));
    } else {
      fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify(config));
    }
  };

  const importFrom = (spec, { storeSpec = true } = {}) => {
    const [item] = openApiToBruno(spec, specConversionOptions({ openapi: [syncConfig] }, collectionPath)).items;
    requestFile = path.join(collectionPath, `pets.${format}`);
    fs.writeFileSync(requestFile, stringifyRequest(item, { format }));
    if (storeSpec) {
      const specsDir = path.join(mockUserData, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'stored.json'), JSON.stringify(spec));
      fs.writeFileSync(path.join(specsDir, 'metadata.json'), JSON.stringify({ [collectionPath]: [{ filename: 'stored.json', sourceUrl: specFile }] }));
    }
  };

  const publish = (spec) => fs.writeFileSync(specFile, JSON.stringify(spec));
  const readItem = () => parseRequest(fs.readFileSync(requestFile, 'utf8'), { format });
  const editLocal = (edit) => fs.writeFileSync(requestFile, stringifyRequest(edit(readItem()), { format }));
  const renameLocal = (name, docs) => editLocal((item) => ({ ...item, name, ...(docs !== undefined && { request: { ...item.request, docs } }) }));
  const ids = (list) => list.map(({ id }) => id);
  const changesOf = (list) => list.map(({ changes, conflictingFields }) => [changes, conflictingFields]);
  const requestFiles = () => fs.readdirSync(collectionPath).filter((file) => !['bruno.json', 'opencollection.yml'].includes(file));

  beforeEach(() => {
    mockUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-user-data-'));
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-collection-'));
    specFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-spec-')), 'openapi.json');
    writeConfig();
    registerOpenAPISyncIpc({ webContents: { send: jest.fn() } });
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    fs.rmSync(mockUserData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    fs.rmSync(path.dirname(specFile), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('lists a new summary as a name change and renames the request in its existing file', async () => {
    importFrom(petsSpec());
    const newSpec = petsSpec({ summary: 'List all pets' });
    publish(newSpec);

    const specDrift = await compare();
    expect(specDrift.modified.map(({ id, changes }) => [id, changes])).toEqual([[PETS.id, 'name']]);
    expect(specDrift.unchanged).toEqual([]);
    expect(specDrift.hasChanges).toBe(true);
    expect(changesOf((await remote(newSpec)).modified)).toEqual([['name', []]]);
    expect(ids((await stored()).edited)).toEqual([]);

    const { oldData, newData } = await preview(newSpec);
    expect([oldData.name, newData.name]).toEqual(['List pets', 'List all pets']);

    await apply(newSpec);
    expect(readItem().name).toBe('List all pets');
    expect(requestFiles()).toEqual([`pets.${format}`]);
  });

  it('shows the same name in the spec check, the request file and the in-sync list after a rename', async () => {
    importFrom(petsSpec());
    const newSpec = petsSpec({ summary: 'List all pets' });
    publish(newSpec);
    await apply(newSpec);

    expect((await compare()).unchanged.map(({ name }) => name)).toEqual(['List all pets']);
    expect(readItem().name).toBe('List all pets');
    expect((await remote(newSpec)).inSync.map(({ name }) => name)).toEqual(['List all pets']);
  });

  it('lists a new description as a docs change and writes it to the request', async () => {
    importFrom(petsSpec());
    const newSpec = petsSpec({ description: 'Lists every pet.\nSorted by name.' });
    publish(newSpec);

    expect((await compare()).modified.map(({ changes }) => changes)).toEqual(['docs']);
    expect(changesOf((await remote(newSpec)).modified)).toEqual([['docs', []]]);

    const { oldData, newData } = await preview(newSpec);
    expect([oldData.request.docs, newData.request.docs]).toEqual(['Lists pets.', 'Lists every pet.\nSorted by name.']);

    await apply(newSpec);
    expect(readItem().request.docs).toBe('Lists every pet.\nSorted by name.');
  });

  it('clears the docs when the spec removes the description, and is in sync afterwards', async () => {
    importFrom(petsSpec());
    const newSpec = petsSpec({ description: null });
    publish(newSpec);

    expect((await compare()).modified.map(({ changes }) => changes)).toEqual(['docs']);
    await apply(newSpec);

    expect(readItem().request.docs || '').toBe('');
    expect(ids((await compare()).unchanged)).toEqual([PETS.id]);
    expect(ids((await remote(newSpec)).inSync)).toEqual([PETS.id]);
  });

  it('writes a CRLF description from the spec, and is in sync afterwards', async () => {
    importFrom(petsSpec());
    const newSpec = petsSpec({ description: 'Lists every pet.\r\nSorted by name.' });
    publish(newSpec);

    await apply(newSpec);

    expect(readItem().request.docs.replace(/\r\n/g, '\n')).toBe('Lists every pet.\nSorted by name.');
    expect(ids((await compare()).unchanged)).toEqual([PETS.id]);
    expect(ids((await remote(newSpec)).inSync)).toEqual([PETS.id]);
  });

  it('leaves the request file untouched when the user keeps their version', async () => {
    importFrom(petsSpec());
    const newSpec = petsSpec({ summary: 'List all pets', description: 'New docs.' });
    const before = fs.readFileSync(requestFile, 'utf8');

    await apply(newSpec, { decision: 'keep-mine' });

    expect(fs.readFileSync(requestFile, 'utf8')).toBe(before);
  });

  it('does not list a kept name again once the new spec is saved', async () => {
    importFrom(petsSpec());
    const newSpec = petsSpec({ summary: 'List all pets' });
    publish(newSpec);
    await apply(newSpec, { decision: 'keep-mine' });

    expect(ids((await compare()).unchanged)).toEqual([PETS.id]);
    expect(ids((await remote(newSpec)).modified)).toEqual([]);
    expect(readItem().name).toBe('List pets');
  });

  it('keeps a local name and docs when the user accepts an unrelated spec change', async () => {
    importFrom(petsSpec());
    renameLocal('My pets', 'My notes');
    const newSpec = petsSpec({ header: 'X-Trace' });
    publish(newSpec);

    expect(changesOf((await remote(newSpec)).modified)).toEqual([['-1 headers', []]]);
    expect(ids((await stored()).edited)).toEqual([]);
    const { newData } = await preview(newSpec);
    expect([newData.name, newData.request.docs]).toEqual(['My pets', 'My notes']);

    await apply(newSpec);
    const item = readItem();
    expect([item.name, item.request.docs, item.request.headers.map(({ name }) => name)]).toEqual(['My pets', 'My notes', ['X-Trace']]);
  });

  it('reports a conflict when the request and the spec were both renamed, and accepting takes the spec name', async () => {
    importFrom(petsSpec());
    renameLocal('My pets');
    const newSpec = petsSpec({ summary: 'List all pets' });
    publish(newSpec);

    expect(changesOf((await remote(newSpec)).modified)).toEqual([['name', ['name']]]);
    expect(ids((await compare()).modified)).toEqual([PETS.id]);

    await apply(newSpec);
    expect(readItem().name).toBe('List all pets');
  });

  it('reports a conflict when the request docs and the spec description both changed', async () => {
    importFrom(petsSpec());
    renameLocal('List pets', 'My notes');
    const newSpec = petsSpec({ description: 'Lists every pet.' });

    expect(changesOf((await remote(newSpec)).modified)).toEqual([['docs', ['docs']]]);
  });

  it('counts a local request edit plus a spec rename as a local edit of the endpoint', async () => {
    importFrom(petsSpec());
    editLocal((item) => ({ ...item, request: { ...item.request, headers: [{ name: 'X-Debug', value: '1', enabled: true }] } }));
    const newSpec = petsSpec({ summary: 'List all pets' });

    expect(changesOf((await remote(newSpec)).modified)).toEqual([['+1 headers, name', []]]);
    expect(ids((await stored()).edited)).toEqual([PETS.id]);
  });

  it('treats a request already renamed to the new spec name as in sync', async () => {
    importFrom(petsSpec());
    renameLocal('List all pets');
    const remoteDrift = await remote(petsSpec({ summary: 'List all pets' }));

    expect([ids(remoteDrift.modified), ids(remoteDrift.inSync)]).toEqual([[], [PETS.id]]);
  });

  it('keeps a local rename out of the collection changes while the spec is unchanged', async () => {
    importFrom(petsSpec());
    renameLocal('My pets', 'My notes');
    const spec = petsSpec();
    publish(spec);

    expect(ids((await remote(spec)).inSync)).toEqual([PETS.id]);
    const collectionDrift = await stored();
    expect([ids(collectionDrift.modified), ids(collectionDrift.edited)]).toEqual([[], []]);
  });

  it('keeps a name written by an older importer on an unrelated spec change', async () => {
    importFrom(petsSpec());
    renameLocal('List pets.');
    const newSpec = petsSpec({ header: 'X-Trace' });

    expect(changesOf((await remote(newSpec)).modified)).toEqual([['-1 headers', []]]);
    await apply(newSpec);
    expect(readItem().name).toBe('List pets.');
  });

  it('keeps the local name and docs when there is no stored spec, including on Restore Spec File', async () => {
    importFrom(petsSpec(), { storeSpec: false });
    renameLocal('My pets', 'My notes');
    const newSpec = petsSpec({ summary: 'List all pets', description: 'New docs.' });
    publish(newSpec);

    const specDrift = await compare();
    expect([specDrift.storedSpecMissing, ids(specDrift.added)]).toEqual([true, [PETS.id]]);
    const remoteDrift = await remote(newSpec);
    expect([ids(remoteDrift.modified), ids(remoteDrift.inSync)]).toEqual([[], [PETS.id]]);

    await apply(newSpec, { added: specDrift.added, modified: [] });
    const item = readItem();
    expect([item.name, item.request.docs]).toEqual(['My pets', 'My notes']);
  });

  it.each([
    ['no description', null],
    ['a blank description', '   '],
    ['a CRLF description', 'Line one.\r\nLine two.\r\n']
  ])('does not list an imported endpoint with %s as changed', async (_label, description) => {
    const spec = petsSpec({ description });
    importFrom(spec);
    publish(spec);

    expect(ids((await compare()).unchanged)).toEqual([PETS.id]);
    expect(ids((await remote(spec)).inSync)).toEqual([PETS.id]);
    expect(ids((await stored()).edited)).toEqual([]);
  });

  it('names requests from operationId when that is the saved choice', async () => {
    writeConfig({ requestNameSource: 'operationId' });
    importFrom(petsSpec());
    publish(petsSpec({ summary: 'List all pets' }));
    expect(ids((await compare()).unchanged)).toEqual([PETS.id]);

    const renamed = petsSpec({ operationId: 'listAllPets' });
    publish(renamed);
    expect((await compare()).modified.map(({ changes }) => changes)).toEqual(['name']);

    await apply(renamed);
    expect(readItem().name).toBe('listAllPets');
  });

  it('lists a description edit as a name and docs change when requests are named from the description', async () => {
    writeConfig({ requestNameSource: 'description' });
    importFrom(petsSpec());
    publish(petsSpec({ description: 'Lists all pets.' }));

    expect((await compare()).modified.map(({ changes }) => changes)).toEqual(['name, docs']);
  });

  it('never lists a name change when requests are named from the path', async () => {
    writeConfig({ requestNameSource: 'path' });
    importFrom(petsSpec());
    publish(petsSpec({ summary: 'List all pets', operationId: 'listAllPets' }));

    expect(ids((await compare()).unchanged)).toEqual([PETS.id]);
  });

  it('renames on accept with Preserve values off', async () => {
    importFrom(petsSpec());
    const newSpec = petsSpec({ summary: 'List all pets' });

    expect((await preview(newSpec, false)).newData.name).toBe('List all pets');
    await apply(newSpec, { preserveValues: false });
    expect(readItem().name).toBe('List all pets');
  });

  it('takes the spec name and docs in reset mode', async () => {
    importFrom(petsSpec());
    renameLocal('My pets', 'My notes');
    const newSpec = petsSpec({ summary: 'List all pets', description: 'New docs.' });

    await handler('renderer:apply-openapi-sync')({ diff: { newSpec }, mode: 'reset' });

    const item = readItem();
    expect([item.name, item.request.docs]).toEqual(['List all pets', 'New docs.']);
  });

  it('takes the incoming name and docs when the user resets their own changes', async () => {
    importFrom(petsSpec());
    editLocal((item) => ({ ...item, name: 'My pets', request: { ...item.request, docs: 'My notes', tests: 'test("ok", () => {});' } }));
    const newSpec = petsSpec({ summary: 'List all pets', description: 'New docs.' });

    await apply(newSpec, { modified: [], driftedToReset: [{ ...PETS, filePath: path.basename(requestFile) }] });

    const item = readItem();
    expect([item.name, item.request.docs, item.request.tests]).toEqual(['List all pets', 'New docs.', 'test("ok", () => {});']);
  });

  it('previews docs that differ only in line endings as unchanged', async () => {
    const spec = petsSpec({ description: 'Line one.\r\nLine two.' });
    importFrom(spec);

    const { oldData, newData } = await handler('renderer:get-endpoint-diff-data')({ endpointId: PETS.id, newSpec: spec, resetToSpec: true });

    expect([oldData.request.docs, newData.request.docs]).toEqual(['Line one.\nLine two.', 'Line one.\nLine two.']);
  });

  it('previews and writes the stored spec name and docs when an endpoint is reset to the spec', async () => {
    importFrom(petsSpec());
    renameLocal('My pets', 'My notes');

    const { oldData, newData } = await handler('renderer:get-endpoint-diff-data')({ endpointId: PETS.id, newSpec: petsSpec(), resetToSpec: true });
    expect([oldData.name, oldData.request.docs]).toEqual(['My pets', 'My notes']);
    expect([newData.name, newData.request.docs]).toEqual(['List pets', 'Lists pets.']);

    await handler('renderer:reset-endpoints-to-spec')({ endpoints: [{ method: 'GET', path: '/pets', pathname: requestFile }] });

    const item = readItem();
    expect([item.name, item.request.docs]).toEqual(['List pets', 'Lists pets.']);
  });
});
