const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');

const mockStoreFiles = {};
let mockUserDataDir;

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: { getPath: () => mockUserDataDir, getVersion: () => '0.0.0', isPackaged: false }
}));

jest.mock('electron-store', () => {
  const { get, has, set } = jest.requireActual('lodash');
  const clone = (value) => JSON.parse(JSON.stringify(value));
  return jest.fn().mockImplementation(({ name }) => {
    mockStoreFiles[name] = mockStoreFiles[name] || {};
    const file = () => mockStoreFiles[name];
    return {
      get: (key, defaultValue) => (has(file(), key) ? clone(get(file(), key)) : defaultValue),
      set: (key, value) => set(file(), key, clone(value))
    };
  });
});

const { _test: { fetchSpecFromSource } } = require('../../src/ipc/openapi-sync');
const {
  getOpenApiSyncSourceState,
  approveOpenApiSyncSource,
  dismissOpenApiSyncSource
} = require('../../src/ipc/openapi-sync-sources');
const { isLocalOrPrivateHost, describeSource } = require('../../src/services/openapi-sync-sources');

const SPEC = JSON.stringify({ openapi: '3.0.0', info: { title: 'spec', version: '1' }, paths: {} });

const writeCollection = (collectionPath, openapi) => {
  fs.mkdirSync(collectionPath, { recursive: true });
  fs.writeFileSync(
    path.join(collectionPath, 'bruno.json'),
    JSON.stringify({ version: '1', name: 'shared', type: 'collection', ...(openapi ? { openapi: [openapi] } : {}) })
  );
};

const writeSyncedSpecMetadata = (collectionPath, sourceUrl) => {
  const specsDir = path.join(mockUserDataDir, 'specs');
  fs.mkdirSync(specsDir, { recursive: true });
  fs.writeFileSync(path.join(specsDir, 'metadata.json'), JSON.stringify({ [collectionPath]: [{ filename: 'spec.json', sourceUrl }] }));
};

describe('OpenAPI sync source approval', () => {
  let server;
  let requests;
  let sourceUrl;
  let workDir;
  let collectionPath;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      requests.push(req.url);
      res.setHeader('content-type', 'application/json');
      res.end(SPEC);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    sourceUrl = `http://127.0.0.1:${server.address().port}/openapi.json`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    requests = [];
    Object.keys(mockStoreFiles).forEach((name) => {
      mockStoreFiles[name] = {};
    });
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-source-approval-'));
    mockUserDataDir = path.join(workDir, 'userData');
    collectionPath = path.join(workDir, 'shared collection');
  });

  afterEach(() => fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 3 }));

  const fetchFromSource = (url = sourceUrl) => fetchSpecFromSource({ collectionUid: 'c1', collectionPath, sourceUrl: url });

  it('does not send any request for a source that came with the collection', async () => {
    writeCollection(collectionPath, { sourceUrl, autoCheck: true, autoCheckInterval: 5 });

    const result = await fetchFromSource();

    expect(result.errorCode).toBe('SOURCE_NOT_APPROVED');
    expect(requests).toEqual([]);
    expect(getOpenApiSyncSourceState({ collectionPath })).toMatchObject({ status: 'pending', autoCheck: false, kind: 'url', isLocalOrPrivate: true });
  });

  it('ignores auto check settings written in the collection file', () => {
    writeCollection(collectionPath, { sourceUrl, autoCheck: true, autoCheckInterval: 15 });

    expect(getOpenApiSyncSourceState({ collectionPath })).toMatchObject({ status: 'pending', autoCheck: false, autoCheckInterval: 5 });
  });

  it('fetches once the user approves the source', async () => {
    writeCollection(collectionPath, { sourceUrl });

    approveOpenApiSyncSource({ collectionPath, autoCheck: true, autoCheckInterval: 30 });
    const result = await fetchFromSource();

    expect(result.error).toBeUndefined();
    expect(requests).toHaveLength(1);
    expect(getOpenApiSyncSourceState({ collectionPath })).toMatchObject({ status: 'approved', autoCheck: true, autoCheckInterval: 30 });
  });

  it('stops fetching when the collection file changes the source after approval', async () => {
    writeCollection(collectionPath, { sourceUrl });
    approveOpenApiSyncSource({ collectionPath });

    const changedUrl = sourceUrl.replace('openapi.json', 'other.json');
    writeCollection(collectionPath, { sourceUrl: changedUrl });

    expect((await fetchFromSource(changedUrl)).errorCode).toBe('SOURCE_NOT_APPROVED');
    expect(requests).toEqual([]);
    expect(getOpenApiSyncSourceState({ collectionPath }).status).toBe('pending');
  });

  it('refuses a request for an approved collection when the renderer asks for a different url', async () => {
    writeCollection(collectionPath, { sourceUrl });
    approveOpenApiSyncSource({ collectionPath });

    const result = await fetchFromSource(sourceUrl.replace('openapi.json', 'elsewhere.json'));

    expect(result.errorCode).toBe('SOURCE_NOT_APPROVED');
    expect(requests).toEqual([]);
  });

  it('keeps syncing a source this user already synced before the upgrade, with its old auto check settings', async () => {
    writeCollection(collectionPath, { sourceUrl, autoCheck: false, autoCheckInterval: 60 });
    writeSyncedSpecMetadata(collectionPath, sourceUrl);

    expect(getOpenApiSyncSourceState({ collectionPath })).toMatchObject({ status: 'approved', autoCheck: false, autoCheckInterval: 60 });
    expect((await fetchFromSource()).error).toBeUndefined();
    expect(requests).toHaveLength(1);
  });

  it('does not migrate when the synced source differs from the one in the collection file', () => {
    writeCollection(collectionPath, { sourceUrl: sourceUrl.replace('openapi.json', 'swapped.json') });
    writeSyncedSpecMetadata(collectionPath, sourceUrl);

    expect(getOpenApiSyncSourceState({ collectionPath }).status).toBe('pending');
  });

  it('remembers a dismissed source without approving it', async () => {
    writeCollection(collectionPath, { sourceUrl });

    expect(dismissOpenApiSyncSource({ collectionPath })).toMatchObject({ status: 'dismissed', autoCheck: false });
    expect((await fetchFromSource()).errorCode).toBe('SOURCE_NOT_APPROVED');
    expect(requests).toEqual([]);
  });

  it('stops fetching when an approved source is dismissed', async () => {
    writeCollection(collectionPath, { sourceUrl });
    approveOpenApiSyncSource({ collectionPath });

    expect(dismissOpenApiSyncSource({ collectionPath })).toMatchObject({ status: 'dismissed', autoCheck: false });
    expect((await fetchFromSource()).errorCode).toBe('SOURCE_NOT_APPROVED');
    expect(requests).toEqual([]);
  });

  it('approves nothing when the collection file changed after the banner showed its source', async () => {
    writeCollection(collectionPath, { sourceUrl });
    const shown = getOpenApiSyncSourceState({ collectionPath }).source;
    const swapped = sourceUrl.replace('openapi.json', 'swapped.json');
    writeCollection(collectionPath, { sourceUrl: swapped });

    expect(() => approveOpenApiSyncSource({ collectionPath, expectedSource: shown })).toThrow(/changed since it was shown/);
    expect(() => dismissOpenApiSyncSource({ collectionPath, expectedSource: shown })).toThrow(/changed since it was shown/);
    expect(getOpenApiSyncSourceState({ collectionPath }).status).toBe('pending');
    expect((await fetchFromSource(swapped)).errorCode).toBe('SOURCE_NOT_APPROVED');
    expect(requests).toEqual([]);
  });

  it('approves the source the banner showed when it has not changed, with the interval limited to the offered options', () => {
    writeCollection(collectionPath, { sourceUrl });
    const shown = getOpenApiSyncSourceState({ collectionPath }).source;

    expect(approveOpenApiSyncSource({ collectionPath, expectedSource: shown, autoCheck: true, autoCheckInterval: 7 }))
      .toMatchObject({ status: 'approved', autoCheck: true, autoCheckInterval: 5 });
  });

  it('treats a relative file source and its absolute form as the same approved source', async () => {
    fs.mkdirSync(collectionPath, { recursive: true });
    fs.writeFileSync(path.join(workDir, 'spec.json'), SPEC);
    writeCollection(collectionPath, { sourceUrl: '../spec.json' });

    approveOpenApiSyncSource({ collectionPath });

    expect(getOpenApiSyncSourceState({ collectionPath })).toMatchObject({ status: 'approved', source: path.join(workDir, 'spec.json') });
    expect((await fetchFromSource('../spec.json')).content).toBe(SPEC);
    expect((await fetchFromSource(path.join(workDir, 'spec.json'))).content).toBe(SPEC);
  });

  it('gates a local file source the same way', async () => {
    const specPath = path.join(workDir, 'spec.json');
    fs.writeFileSync(specPath, SPEC);
    writeCollection(collectionPath, { sourceUrl: specPath });

    expect((await fetchFromSource(specPath)).errorCode).toBe('SOURCE_NOT_APPROVED');
    expect(getOpenApiSyncSourceState({ collectionPath })).toMatchObject({ status: 'pending', kind: 'file' });

    approveOpenApiSyncSource({ collectionPath });
    expect((await fetchFromSource(specPath)).content).toBe(SPEC);
  });

  describe('on Windows', () => {
    const platform = process.platform;
    beforeEach(() => Object.defineProperty(process, 'platform', { value: 'win32' }));
    afterEach(() => Object.defineProperty(process, 'platform', { value: platform }));

    it('keeps a file source approved when only its letter case changes', () => {
      writeCollection(collectionPath, { sourceUrl: path.join(workDir, 'spec.json') });
      approveOpenApiSyncSource({ collectionPath });

      writeCollection(collectionPath, { sourceUrl: path.join(workDir, 'SPEC.json') });
      expect(getOpenApiSyncSourceState({ collectionPath })).toMatchObject({ status: 'approved', source: path.join(workDir, 'SPEC.json') });
    });

    it('still treats a url with a different letter case as a new source', () => {
      writeCollection(collectionPath, { sourceUrl });
      approveOpenApiSyncSource({ collectionPath });

      writeCollection(collectionPath, { sourceUrl: sourceUrl.replace('openapi', 'OpenAPI') });
      expect(getOpenApiSyncSourceState({ collectionPath })).toMatchObject({ status: 'pending' });
    });
  });

  it('reports no source for a collection without sync', () => {
    writeCollection(collectionPath, null);

    expect(getOpenApiSyncSourceState({ collectionPath })).toEqual({ status: 'none' });
    expect(() => approveOpenApiSyncSource({ collectionPath })).toThrow(/no sync source/);
  });

  it('rejects a relative collection path', () => {
    expect(() => getOpenApiSyncSourceState({ collectionPath: 'relative/path' })).toThrow(/collection path is required/);
  });
});

describe('isLocalOrPrivateHost', () => {
  it.each([
    'localhost', 'api.localhost', '127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.10', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '[::1]', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', 'intranet', 'printer.local'
  ])('flags %s', (host) => {
    expect(isLocalOrPrivateHost(host)).toBe(true);
  });

  it.each(['example.com', 'api.github.com', '8.8.8.8', '172.32.0.1', '2606:4700::1111'])('does not flag %s', (host) => {
    expect(isLocalOrPrivateHost(host)).toBe(false);
  });

  it('flags hostnames the way URL parsing hands them over', () => {
    expect(isLocalOrPrivateHost(new URL('http://[::ffff:127.0.0.1]/').hostname)).toBe(true);
    expect(isLocalOrPrivateHost(new URL('http://localhost./').hostname)).toBe(true);
    expect(isLocalOrPrivateHost(new URL('http://LOCALHOST/').hostname)).toBe(true);
  });
});

describe('describeSource', () => {
  it('labels a Windows network share as a network share, not a local file', () => {
    expect(describeSource('\\\\attacker\\share\\spec.json')).toEqual({ kind: 'network-share', isLocalOrPrivate: true });
    expect(describeSource('//attacker/share/spec.json')).toEqual({ kind: 'network-share', isLocalOrPrivate: true });
    expect(describeSource('/home/me/spec.json')).toEqual({ kind: 'file', isLocalOrPrivate: true });
  });
});
