const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  appendMockResponses,
  cloneMockServerResponses,
  deleteMockServer,
  getWorkspaceStorePath,
  listMockResponses,
  listMockServers,
  readWorkspaceStore,
  saveMockResponse,
  saveMockServer
} = require('../src/app/mock-response-store');

describe('mock-response-store', () => {
  let workspacePath;

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mock-workspace-'));
  });

  afterEach(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('stores all mock servers in workspace/mocks/mockserver.yml', () => {
    const location = {
      mockServerUid: 'mock-1',
      sourceType: 'collection',
      collectionPath: path.join(workspacePath, 'collections', 'demo'),
      workspacePath
    };

    const storePath = getWorkspaceStorePath(workspacePath);
    expect(storePath).toBe(path.join(workspacePath, 'mocks', 'mockserver.yml'));

    saveMockResponse(location, {
      uid: 'response-1',
      name: 'Users',
      request: { url: '/users', method: 'GET' },
      response: { status: 200, body: { type: 'json', content: '{}' } },
      rules: { operator: 'AND', conditions: [] }
    });

    expect(fs.existsSync(storePath)).toBe(true);
    expect(listMockResponses(location)).toHaveLength(1);

    const store = readWorkspaceStore(workspacePath);
    expect(store.mockServers['mock-1'].responses).toHaveLength(1);
  });

  it('keeps multiple mock servers in the same workspace file', () => {
    const firstLocation = {
      mockServerUid: 'mock-1',
      sourceType: 'spec',
      workspacePath
    };
    const secondLocation = {
      mockServerUid: 'mock-2',
      sourceType: 'spec',
      workspacePath
    };

    saveMockResponse(firstLocation, {
      uid: 'response-1',
      name: 'Users',
      request: { url: '/users', method: 'GET' },
      response: { status: 200, body: { type: 'json', content: '{}' } },
      rules: { operator: 'AND', conditions: [] }
    });

    saveMockResponse(secondLocation, {
      uid: 'response-2',
      name: 'Pets',
      request: { url: '/pets', method: 'GET' },
      response: { status: 200, body: { type: 'json', content: '{}' } },
      rules: { operator: 'AND', conditions: [] }
    });

    const store = readWorkspaceStore(workspacePath);
    expect(store.mockServers['mock-1'].responses).toHaveLength(1);
    expect(store.mockServers['mock-2'].responses).toHaveLength(1);
  });

  it('removes a mock server block from workspace mockserver.yml on delete', () => {
    const location = {
      mockServerUid: 'mock-1',
      sourceType: 'spec',
      workspacePath
    };

    saveMockResponse(location, {
      uid: 'response-1',
      name: 'Users',
      request: { url: '/users', method: 'GET' },
      response: { status: 200, body: { type: 'json', content: '{}' } },
      rules: { operator: 'AND', conditions: [] }
    });

    deleteMockServer(location);

    const store = readWorkspaceStore(workspacePath);
    expect(store.mockServers['mock-1']).toBeUndefined();
  });

  it('stores mock server metadata in workspace mockserver.yml', () => {
    const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mock-meta-'));
    const instance = {
      uid: 'mock-1',
      name: 'Dog API Mocker',
      port: 4001,
      sourceType: 'collection',
      collectionUid: 'collection-1',
      globalDelay: 0,
      workspaceUid: 'workspace-1'
    };

    saveMockServer(workspacePath, instance);

    const store = readWorkspaceStore(workspacePath);
    expect(store.mockServers['mock-1'].name).toBe('Dog API Mocker');
    expect(store.mockServers['mock-1'].port).toBe(4001);
    expect(store.mockServers['mock-1'].collectionUid).toBe('collection-1');
    expect(store.mockServers['mock-1'].responses).toEqual([]);

    const instances = listMockServers(workspacePath, 'workspace-1');
    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('Dog API Mocker');

    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('preserves mock server metadata when saving responses', () => {
    const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mock-meta-'));
    const location = {
      mockServerUid: 'mock-1',
      sourceType: 'spec',
      workspacePath
    };

    saveMockServer(workspacePath, {
      uid: 'mock-1',
      name: 'Spec Mocker',
      port: 4000,
      sourceType: 'spec',
      specUid: 'spec-1',
      workspaceUid: 'workspace-1'
    });

    saveMockResponse(location, {
      uid: 'response-1',
      name: 'Users',
      request: { url: '/users', method: 'GET' },
      response: { status: 200, body: { type: 'json', content: '{}' } },
      rules: { operator: 'AND', conditions: [] }
    });

    const store = readWorkspaceStore(workspacePath);
    expect(store.mockServers['mock-1'].name).toBe('Spec Mocker');
    expect(store.mockServers['mock-1'].responses).toHaveLength(1);

    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('migrates legacy preference instances into workspace mockserver.yml', () => {
    const instances = listMockServers(workspacePath, 'workspace-1', {
      migrateFrom: [{
        uid: 'mock-1',
        name: 'Legacy Mocker',
        port: 4002,
        sourceType: 'spec',
        specUid: 'spec-legacy',
        globalDelay: 0,
        workspaceUid: 'workspace-1'
      }]
    });

    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('Legacy Mocker');
    expect(readWorkspaceStore(workspacePath).mockServers['mock-1'].name).toBe('Legacy Mocker');
  });

  it('migrates legacy collection mocks yml into workspace mockserver.yml', () => {
    const collectionPath = path.join(workspacePath, 'collections', 'demo');
    const legacyMocksDir = path.join(collectionPath, 'mocks');
    fs.mkdirSync(legacyMocksDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyMocksDir, 'mock-1.yml'),
      'responses:\n  - uid: response-legacy\n    name: Legacy\n    request:\n      url: /legacy\n      method: GET\n    response:\n      status: 200\n      body:\n        type: json\n        content: "{}"\n    rules:\n      operator: AND\n      conditions: []\n',
      'utf8'
    );

    const location = {
      mockServerUid: 'mock-1',
      sourceType: 'collection',
      collectionPath,
      workspacePath
    };

    const responses = listMockResponses(location);
    expect(responses).toHaveLength(1);
    expect(responses[0].name).toBe('Legacy');
    expect(fs.existsSync(getWorkspaceStorePath(workspacePath))).toBe(true);
    expect(fs.existsSync(path.join(legacyMocksDir, 'mock-1.yml'))).toBe(false);
  });

  it('appends generated responses and skips duplicate route and status pairs', () => {
    const location = {
      mockServerUid: 'mock-1',
      sourceType: 'spec',
      workspacePath
    };

    saveMockResponse(location, {
      uid: 'response-1',
      name: 'Users',
      request: { url: '/users', method: 'GET' },
      response: { status: 200, body: { type: 'json', content: '{}' } },
      rules: { operator: 'AND', conditions: [] }
    });

    const created = appendMockResponses(location, [
      {
        uid: 'response-2',
        name: 'Users duplicate',
        request: { url: '/users', method: 'GET' },
        response: { status: 200, body: { type: 'json', content: '{}' } },
        rules: { operator: 'AND', conditions: [] }
      },
      {
        uid: 'response-3',
        name: 'Users error',
        request: { url: '/users', method: 'GET' },
        response: { status: 401, body: { type: 'json', content: '{}' } },
        rules: { operator: 'AND', conditions: [] }
      },
      {
        uid: 'response-4',
        name: 'Pets',
        request: { url: '/pets', method: 'GET' },
        response: { status: 200, body: { type: 'json', content: '{}' } },
        rules: { operator: 'AND', conditions: [] }
      }
    ]);

    expect(created).toHaveLength(2);
    expect(created.map((item) => item.name)).toEqual(['Users error', 'Pets']);
    expect(listMockResponses(location)).toHaveLength(3);
  });

  it('clones mock responses with new uids', () => {
    const sourceLocation = {
      mockServerUid: 'mock-source',
      workspacePath
    };
    const targetLocation = {
      mockServerUid: 'mock-target',
      workspacePath
    };

    saveMockResponse(sourceLocation, {
      uid: 'response-1',
      name: 'Users',
      request: { url: '/users', method: 'GET' },
      response: {
        status: 200,
        headers: [{ uid: 'header-1', name: 'Content-Type', value: 'application/json', enabled: true }],
        body: { type: 'json', content: '{}' }
      },
      rules: {
        operator: 'AND',
        conditions: [{ uid: 'rule-1', type: 'header', key: 'Authorization', operator: 'equals', value: 'token' }]
      }
    });

    const cloned = cloneMockServerResponses(sourceLocation, targetLocation);

    expect(cloned).toHaveLength(1);
    expect(cloned[0].uid).not.toBe('response-1');
    expect(cloned[0].response.headers[0].uid).not.toBe('header-1');
    expect(cloned[0].rules.conditions[0].uid).not.toBe('rule-1');
    expect(listMockResponses(targetLocation)).toHaveLength(1);
  });
});
