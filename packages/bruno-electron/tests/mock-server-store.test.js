const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  appendMockResponses,
  cloneMockServerResponses,
  createEmptyMockResponse,
  deleteMockResponse,
  deleteMockServer,
  getMockServerFromFile,
  getMockServerUid,
  invalidateMockServerFile,
  listMockResponses,
  listMockServers,
  saveMockResponse,
  saveMockServer
} = require('../src/app/mock-server/mock-server-store');

describe('mock-server-store', () => {
  let workspacePath;

  const createServer = (overrides = {}) => saveMockServer(workspacePath, {
    name: 'Dog API Mock',
    port: 4001,
    sourceType: 'manual',
    globalDelay: 0,
    workspaceUid: 'workspace-1',
    ...overrides
  });

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mock-store-'));
  });

  afterEach(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  describe('mock server files', () => {
    it('creates one yml file per mock server named after the server', () => {
      createServer({ name: 'Dog API Mock' });
      createServer({ name: 'Cat API Mock', port: 4002 });

      const files = fs.readdirSync(path.join(workspacePath, 'mocks')).sort();
      expect(files).toEqual(['Cat API Mock.yml', 'Dog API Mock.yml']);
    });

    it('writes an opencollection-style file without uids', () => {
      const instance = createServer({
        name: 'Dog API Mock',
        sourceType: 'spec',
        specPath: '/specs/dogs.yml',
        globalDelay: 250
      });

      const content = fs.readFileSync(instance.pathname, 'utf8');
      expect(content).toContain('info:');
      expect(content).toContain('name: Dog API Mock');
      expect(content).toContain('type: mock');
      expect(content).toContain('port: 4001');
      expect(content).toContain('delay: 250');
      expect(content).toContain('type: spec');
      expect(content).toContain('path: /specs/dogs.yml');
      expect(content).not.toContain('uid');
    });

    it('derives the server uid from the file path, stable across reads', () => {
      const instance = createServer();
      expect(instance.uid).toBe(getMockServerUid(instance.pathname));

      invalidateMockServerFile(instance.pathname);
      const listed = listMockServers(workspacePath, 'workspace-1');
      expect(listed).toHaveLength(1);
      expect(listed[0].uid).toBe(instance.uid);
    });

    it('hydrates a collection-sourced server with a derived collectionUid', () => {
      const collectionPath = '/Users/x/collections/dog-api';
      const instance = createServer({
        sourceType: 'collection',
        collectionPathname: collectionPath
      });

      expect(instance.sourceType).toBe('collection');
      expect(instance.collectionPathname).toBe(collectionPath);
      expect(instance.collectionUid).toBeTruthy();
      expect(instance.specPath).toBeNull();
    });

    it('updates settings in place on save without renaming the file', () => {
      const instance = createServer();
      const renamed = saveMockServer(workspacePath, {
        ...instance,
        name: 'Renamed Mock',
        port: 4005
      });

      expect(renamed.uid).toBe(instance.uid);
      expect(renamed.pathname).toBe(instance.pathname);
      expect(renamed.name).toBe('Renamed Mock');
      expect(renamed.port).toBe(4005);
      expect(fs.readFileSync(instance.pathname, 'utf8')).toContain('name: Renamed Mock');
    });

    it('keeps the existing collection source when only the uid is provided', () => {
      const collectionPath = '/Users/x/collections/dog-api';
      const instance = createServer({
        sourceType: 'collection',
        collectionPathname: collectionPath
      });

      const saved = saveMockServer(workspacePath, {
        uid: instance.uid,
        name: instance.name,
        port: instance.port,
        sourceType: 'collection',
        collectionUid: instance.collectionUid,
        globalDelay: 0,
        workspaceUid: 'workspace-1'
      });

      expect(saved.collectionPathname).toBe(collectionPath);
    });

    it('rejects duplicate names case-insensitively, on create and rename', () => {
      createServer({ name: 'Dog API Mock' });
      expect(() => createServer({ name: 'dog api mock' })).toThrow(/already exists/);

      const other = createServer({ name: 'Cat API Mock', port: 4002 });
      expect(() => saveMockServer(workspacePath, { ...other, name: 'Dog API Mock' })).toThrow(/already exists/);
    });

    it('keeps special characters in the name and sanitizes only the filename', () => {
      const instance = createServer({ name: 'Dog / Cat: API? *v2*' });

      expect(instance.name).toBe('Dog / Cat: API? *v2*');
      expect(path.basename(instance.pathname)).toBe('Dog - Cat- API- -v2-.yml');

      invalidateMockServerFile(instance.pathname);
      expect(listMockServers(workspacePath, 'workspace-1')[0].name).toBe('Dog / Cat: API? *v2*');
    });

    it('suffixes the filename when two names sanitize to the same file', () => {
      const first = createServer({ name: 'Dog/API' });
      const second = createServer({ name: 'Dog:API', port: 4002 });

      expect(path.basename(first.pathname)).toBe('Dog-API.yml');
      expect(path.basename(second.pathname)).toBe('Dog-API 2.yml');
      expect(second.name).toBe('Dog:API');
    });

    it('falls back to a default filename when the name sanitizes to nothing', () => {
      const instance = createServer({ name: '///' });

      expect(instance.name).toBe('///');
      expect(path.basename(instance.pathname)).toBe('mock-server.yml');
    });

    it('deletes the file when the server is deleted', () => {
      const instance = createServer();
      deleteMockServer({ mockServerUid: instance.uid, workspacePath });

      expect(fs.existsSync(instance.pathname)).toBe(false);
      expect(listMockServers(workspacePath, 'workspace-1')).toEqual([]);
    });

    it('does not cache data that failed to reach disk', () => {
      const instance = createServer();
      const location = { mockServerUid: instance.uid, workspacePath };
      saveMockResponse(location, createEmptyMockResponse('Persisted response'));

      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('disk full');
      });
      expect(() => saveMockResponse(location, createEmptyMockResponse('Lost response'))).toThrow('disk full');
      writeSpy.mockRestore();

      const names = listMockResponses(location).map((response) => response.name);
      expect(names).toEqual(['Persisted response']);
    });

    it('writes synchronously so an external edit after invalidation wins', () => {
      const instance = createServer();

      const externalContent = fs.readFileSync(instance.pathname, 'utf8').replace('Dog API Mock', 'Externally Renamed');
      fs.writeFileSync(instance.pathname, externalContent, 'utf8');

      invalidateMockServerFile(instance.pathname);
      const listed = listMockServers(workspacePath, 'workspace-1');
      expect(listed[0].name).toBe('Externally Renamed');
      expect(fs.readFileSync(instance.pathname, 'utf8')).toContain('Externally Renamed');
    });

    it('skips unreadable files but lists the rest', () => {
      const instance = createServer();
      fs.writeFileSync(path.join(workspacePath, 'mocks', 'broken.yml'), '- not\n- a mock server\n');

      const listed = listMockServers(workspacePath, 'workspace-1');
      expect(listed.map((item) => item.uid)).toEqual([instance.uid]);
    });
  });

  describe('mock responses', () => {
    let instance;
    let location;

    const buildResponse = (name, overrides = {}) => ({
      ...createEmptyMockResponse(name),
      ...overrides
    });

    beforeEach(() => {
      instance = createServer();
      location = { mockServerUid: instance.uid, workspacePath };
    });

    it('saves a response and assigns a deterministic uid', () => {
      const saved = saveMockResponse(location, buildResponse('Get dogs'));

      expect(saved.uid).toBeTruthy();
      expect(listMockResponses(location)).toEqual([saved]);

      invalidateMockServerFile(instance.pathname);
      const reloaded = listMockResponses(location);
      expect(reloaded).toHaveLength(1);
      expect(reloaded[0].uid).toBe(saved.uid);
      expect(reloaded[0].name).toBe('Get dogs');
    });

    it('persists responses as routes in the server file', () => {
      saveMockResponse(location, buildResponse('Get dogs', {
        request: { url: '/dogs', method: 'GET', headers: [], params: [], body: { mode: 'none' } },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'application/json', enabled: true }],
          body: { type: 'json', content: '{"dogs": []}' }
        },
        rules: {
          operator: 'AND',
          conditions: [{ target: 'query', key: 'limit', operator: 'equals', value: '10' }]
        }
      }));

      const content = fs.readFileSync(instance.pathname, 'utf8');
      expect(content).toContain('routes:');
      expect(content).toContain('name: Get dogs');
      expect(content).toContain('url: /dogs');
      expect(content).toContain('status: 200');
      expect(content).toContain('Content-Type');
      expect(content).toContain('rules:');
      expect(content).not.toContain('uid');
    });

    it('keeps the uid when a response is renamed', () => {
      const saved = saveMockResponse(location, buildResponse('Get dogs'));
      const renamed = saveMockResponse(location, { ...saved, name: 'List dogs' });

      expect(renamed.uid).toBe(saved.uid);

      invalidateMockServerFile(instance.pathname);
      const reloaded = listMockResponses(location);
      expect(reloaded[0].uid).toBe(saved.uid);
      expect(reloaded[0].name).toBe('List dogs');
    });

    it('rejects duplicate response names', () => {
      saveMockResponse(location, buildResponse('Get dogs'));
      expect(() => saveMockResponse(location, buildResponse('get dogs'))).toThrow(/already exists/);
    });

    it('deletes a response by uid', () => {
      const saved = saveMockResponse(location, buildResponse('Get dogs'));
      const kept = saveMockResponse(location, buildResponse('Get cats'));

      deleteMockResponse(location, saved.uid);
      expect(listMockResponses(location).map((item) => item.uid)).toEqual([kept.uid]);

      expect(() => deleteMockResponse(location, 'missing-uid')).toThrow('Mock response not found.');
    });

    it('appends responses while deduping by route key', () => {
      saveMockResponse(location, buildResponse('Get dogs', {
        request: { url: '/dogs', method: 'GET', headers: [], params: [], body: { mode: 'none' } }
      }));

      const created = appendMockResponses(location, [
        buildResponse('Get dogs again', {
          request: { url: '/dogs', method: 'GET', headers: [], params: [], body: { mode: 'none' } }
        }),
        buildResponse('Get cats', {
          request: { url: '/cats', method: 'GET', headers: [], params: [], body: { mode: 'none' } }
        })
      ]);

      expect(created).toHaveLength(1);
      expect(created[0].name).toBe('Get cats');
      expect(created[0].uid).toBeTruthy();
      expect(listMockResponses(location)).toHaveLength(2);
    });

    it('clones responses into another server with fresh uids', () => {
      const saved = saveMockResponse(location, buildResponse('Get dogs'));

      const target = createServer({ name: 'Clone Target', port: 4002 });
      const targetLocation = { mockServerUid: target.uid, workspacePath };
      const cloned = cloneMockServerResponses(location, targetLocation);

      expect(cloned).toHaveLength(1);
      expect(cloned[0].name).toBe('Get dogs');
      expect(cloned[0].uid).not.toBe(saved.uid);
      expect(listMockResponses(targetLocation)).toEqual(cloned);
    });

    it('serves watcher reads with instance and responses from one file', () => {
      const saved = saveMockResponse(location, buildResponse('Get dogs'));

      invalidateMockServerFile(instance.pathname);
      const fromFile = getMockServerFromFile(instance.pathname, 'workspace-1');

      expect(fromFile.instance.uid).toBe(instance.uid);
      expect(fromFile.instance.workspaceUid).toBe('workspace-1');
      expect(fromFile.responses).toHaveLength(1);
      expect(fromFile.responses[0].uid).toBe(saved.uid);
    });
  });
});
