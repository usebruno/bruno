const path = require('path');
const fs = require('fs');
const os = require('os');
const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');

let electronApp = null;

try {
  ({ app: electronApp } = require('electron'));
} catch {
  electronApp = null;
}

const getUserDataPath = () => {
  try {
    return electronApp?.getPath?.('userData') || path.join(os.tmpdir(), 'bruno-user-data');
  } catch {
    return path.join(os.tmpdir(), 'bruno-user-data');
  }
};

const MOCK_SERVER_FILE_NAME = 'mockserver.yml';
const STORE_VERSION = 1;

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const getFallbackWorkspacePath = () => path.join(getUserDataPath(), 'mocks');

const resolveWorkspacePath = (workspacePath) => workspacePath || getFallbackWorkspacePath();

const getWorkspaceStorePath = (workspacePath) => (
  path.join(resolveWorkspacePath(workspacePath), 'mocks', MOCK_SERVER_FILE_NAME)
);

const getLegacyPerServerStorePath = ({ mockServerUid, collectionPath, sourceType }) => {
  if (sourceType === 'collection' && collectionPath) {
    return path.join(collectionPath, 'mocks', `${mockServerUid}.yml`);
  }

  return path.join(getUserDataPath(), 'mock-responses', `${mockServerUid}.yml`);
};

const getLegacyStorePaths = ({ mockServerUid, collectionPath, sourceType }) => {
  const legacyPaths = [];

  if (sourceType === 'collection' && collectionPath) {
    legacyPaths.push(path.join(collectionPath, '.bruno', 'mocks', `${mockServerUid}.json`));
    legacyPaths.push(path.join(collectionPath, 'mocks', `${mockServerUid}.json`));
    legacyPaths.push(path.join(collectionPath, 'mocks', `${mockServerUid}.yml`));
    return legacyPaths;
  }

  legacyPaths.push(path.join(getUserDataPath(), 'mock-responses', `${mockServerUid}.json`));
  legacyPaths.push(path.join(getUserDataPath(), 'mock-responses', `${mockServerUid}.yml`));
  return legacyPaths;
};

const removeDirIfEmpty = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  try {
    if (fs.readdirSync(dirPath).length === 0) {
      fs.rmdirSync(dirPath);
    }
  } catch {
    // Ignore cleanup errors.
  }
};

const cleanupLegacyPerServerStore = (legacyPath, collectionPath) => {
  try {
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
    }
  } catch {
    return;
  }

  if (!collectionPath) {
    return;
  }

  const legacyMocksDir = path.join(collectionPath, '.bruno', 'mocks');
  const collectionMocksDir = path.join(collectionPath, 'mocks');
  const legacyBrunoDir = path.join(collectionPath, '.bruno');
  removeDirIfEmpty(legacyMocksDir);
  removeDirIfEmpty(collectionMocksDir);
  removeDirIfEmpty(legacyBrunoDir);
};

const createEmptyStore = () => ({
  version: STORE_VERSION,
  mockServers: {}
});

const MOCK_SERVER_META_FIELDS = [
  'name',
  'port',
  'sourceType',
  'collectionUid',
  'specUid',
  'specPath',
  'specName',
  'globalDelay'
];

const DEFAULT_MOCK_SERVER_PORT = 4000;
const DEFAULT_MOCK_SERVER_NAME = 'Mock Server';

const pickMockServerMeta = (instance = {}) => {
  const meta = {};

  for (const key of MOCK_SERVER_META_FIELDS) {
    if (instance[key] !== undefined && instance[key] !== null) {
      meta[key] = instance[key];
    }
  }

  return meta;
};

const mockServerBlockToInstance = (uid, block = {}, workspaceUid) => ({
  uid,
  name: block.name || DEFAULT_MOCK_SERVER_NAME,
  port: Number(block.port) || DEFAULT_MOCK_SERVER_PORT,
  sourceType: block.sourceType || 'collection',
  collectionUid: block.collectionUid || null,
  specUid: block.specUid || null,
  specPath: block.specPath || null,
  specName: block.specName || null,
  globalDelay: Number(block.globalDelay) || 0,
  workspaceUid
});

const parseStoreContent = (content, filePath) => {
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.responses)) {
      return { responses: parsed.responses };
    }

    return createEmptyStore();
  }

  const parsed = yaml.load(content) || {};

  if (Array.isArray(parsed.responses)) {
    return { responses: parsed.responses };
  }

  if (parsed.mockServers && typeof parsed.mockServers === 'object') {
    return {
      version: parsed.version || STORE_VERSION,
      mockServers: parsed.mockServers
    };
  }

  return createEmptyStore();
};

const STORE_WRITE_DEBOUNCE_MS = 250;
const workspaceStoreCache = new Map();
const workspaceWriteTimers = new Map();

const readWorkspaceStoreFromDisk = (workspacePath) => {
  const filePath = getWorkspaceStorePath(workspacePath);

  if (!fs.existsSync(filePath)) {
    return createEmptyStore();
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseStoreContent(content, filePath);

    if (parsed.mockServers) {
      return {
        version: parsed.version || STORE_VERSION,
        mockServers: parsed.mockServers
      };
    }

    return createEmptyStore();
  } catch (err) {
    console.warn(`[MockResponseStore] Failed to read ${filePath}: ${err.message}`);
    return createEmptyStore();
  }
};

const writeWorkspaceStoreToDisk = (workspacePath, store) => {
  const filePath = getWorkspaceStorePath(workspacePath);
  ensureDir(path.dirname(filePath));

  const content = yaml.dump({
    version: STORE_VERSION,
    mockServers: store.mockServers || {}
  }, {
    lineWidth: -1,
    noRefs: true
  });

  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
};

const getWorkspaceCacheKey = (workspacePath) => resolveWorkspacePath(workspacePath);

const readWorkspaceStore = (workspacePath) => {
  const cacheKey = getWorkspaceCacheKey(workspacePath);

  if (workspaceStoreCache.has(cacheKey)) {
    return workspaceStoreCache.get(cacheKey);
  }

  const store = readWorkspaceStoreFromDisk(workspacePath);
  workspaceStoreCache.set(cacheKey, store);
  return store;
};

const flushWorkspaceStore = (workspacePath) => {
  const cacheKey = getWorkspaceCacheKey(workspacePath);
  const pendingTimer = workspaceWriteTimers.get(cacheKey);

  if (pendingTimer) {
    clearTimeout(pendingTimer);
    workspaceWriteTimers.delete(cacheKey);
  }

  const store = workspaceStoreCache.get(cacheKey);
  if (store) {
    writeWorkspaceStoreToDisk(workspacePath, store);
  }
};

const flushAllWorkspaceStores = () => {
  for (const cacheKey of workspaceStoreCache.keys()) {
    flushWorkspaceStore(cacheKey);
  }
};

const writeWorkspaceStore = (workspacePath, store) => {
  const cacheKey = getWorkspaceCacheKey(workspacePath);
  workspaceStoreCache.set(cacheKey, store);

  if (process.env.JEST_WORKER_ID) {
    return writeWorkspaceStoreToDisk(workspacePath, store);
  }

  const pendingTimer = workspaceWriteTimers.get(cacheKey);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
  }

  workspaceWriteTimers.set(cacheKey, setTimeout(() => {
    workspaceWriteTimers.delete(cacheKey);
    writeWorkspaceStoreToDisk(workspacePath, store);
  }, STORE_WRITE_DEBOUNCE_MS));

  return getWorkspaceStorePath(workspacePath);
};

const readLegacyPerServerStore = (location) => {
  const perServerPath = getLegacyPerServerStorePath(location);

  if (fs.existsSync(perServerPath)) {
    try {
      const content = fs.readFileSync(perServerPath, 'utf8');
      const parsed = parseStoreContent(content, perServerPath);
      return Array.isArray(parsed.responses) ? parsed.responses : [];
    } catch (err) {
      console.warn(`[MockResponseStore] Failed to read ${perServerPath}: ${err.message}`);
    }
  }

  for (const legacyPath of getLegacyStorePaths(location)) {
    if (!fs.existsSync(legacyPath)) {
      continue;
    }

    try {
      const content = fs.readFileSync(legacyPath, 'utf8');
      const parsed = parseStoreContent(content, legacyPath);
      return Array.isArray(parsed.responses) ? parsed.responses : [];
    } catch (err) {
      console.warn(`[MockResponseStore] Failed to migrate ${legacyPath}: ${err.message}`);
    }
  }

  return [];
};

const migrateLegacyResponses = (location) => {
  const { mockServerUid, workspacePath } = location;
  const store = readWorkspaceStore(workspacePath);
  const existingResponses = store.mockServers?.[mockServerUid]?.responses || [];

  if (existingResponses.length > 0) {
    return existingResponses;
  }

  const legacyResponses = readLegacyPerServerStore(location);
  if (!legacyResponses.length) {
    return [];
  }

  store.mockServers[mockServerUid] = {
    ...(store.mockServers[mockServerUid] || {}),
    responses: legacyResponses
  };
  writeWorkspaceStore(workspacePath, store);

  const perServerPath = getLegacyPerServerStorePath(location);
  cleanupLegacyPerServerStore(perServerPath, location.collectionPath);

  for (const legacyPath of getLegacyStorePaths(location)) {
    cleanupLegacyPerServerStore(legacyPath, location.collectionPath);
  }

  return legacyResponses;
};

const getMockServerResponses = (location) => {
  if (!location?.mockServerUid) {
    throw new Error('Mock server id is required.');
  }

  if (!location?.workspacePath) {
    throw new Error('Workspace path is required.');
  }

  const store = readWorkspaceStore(location.workspacePath);
  const responses = store.mockServers?.[location.mockServerUid]?.responses;

  if (Array.isArray(responses) && responses.length > 0) {
    return responses;
  }

  return migrateLegacyResponses(location);
};

const setMockServerResponses = (location, responses) => {
  const store = readWorkspaceStore(location.workspacePath);
  const existing = store.mockServers[location.mockServerUid] || {};

  store.mockServers[location.mockServerUid] = {
    ...existing,
    responses: responses || []
  };

  writeWorkspaceStore(location.workspacePath, store);
};

const saveMockServer = (workspacePath, instance) => {
  if (!workspacePath) {
    throw new Error('Workspace path is required.');
  }

  if (!instance?.uid) {
    throw new Error('Mock server id is required.');
  }

  const store = readWorkspaceStore(workspacePath);
  const existing = store.mockServers[instance.uid] || {};

  store.mockServers[instance.uid] = {
    ...pickMockServerMeta(instance),
    responses: Array.isArray(existing.responses) ? existing.responses : []
  };

  writeWorkspaceStore(workspacePath, store);
  return mockServerBlockToInstance(instance.uid, store.mockServers[instance.uid], instance.workspaceUid);
};

const listMockServers = (workspacePath, workspaceUid, { migrateFrom = [] } = {}) => {
  if (!workspacePath) {
    throw new Error('Workspace path is required.');
  }

  const store = readWorkspaceStore(workspacePath);
  let dirty = false;

  for (const instance of migrateFrom) {
    if (!instance?.uid) {
      continue;
    }

    const existing = store.mockServers[instance.uid] || {};
    if (!existing.name) {
      store.mockServers[instance.uid] = {
        ...pickMockServerMeta(instance),
        responses: Array.isArray(existing.responses) ? existing.responses : []
      };
      dirty = true;
    }
  }

  if (dirty) {
    writeWorkspaceStore(workspacePath, store);
  }

  return Object.entries(store.mockServers || {}).map(([uid, block]) => (
    mockServerBlockToInstance(uid, block, workspaceUid)
  ));
};

const createEmptyMockResponse = (name = 'New Mock Response') => ({
  uid: uuidv4(),
  name,
  description: '',
  request: {
    url: '/',
    method: 'GET',
    headers: [],
    params: [],
    body: {
      mode: 'none'
    }
  },
  response: {
    status: 200,
    statusText: 'OK',
    headers: [],
    body: {
      type: 'json',
      content: ''
    }
  },
  rules: {
    operator: 'AND',
    conditions: []
  }
});

const listMockResponses = (location) => getMockServerResponses(location);

const saveMockResponse = (location, response) => {
  const nextResponse = {
    ...response,
    uid: response?.uid || uuidv4()
  };

  const responses = [...getMockServerResponses(location)];
  const index = responses.findIndex((item) => item.uid === nextResponse.uid);

  if (index >= 0) {
    responses[index] = nextResponse;
  } else {
    responses.push(nextResponse);
  }

  setMockServerResponses(location, responses);
  return nextResponse;
};

const deleteMockResponse = (location, responseUid) => {
  const responses = getMockServerResponses(location);
  const nextResponses = responses.filter((item) => item.uid !== responseUid);

  if (nextResponses.length === responses.length) {
    throw new Error('Mock response not found.');
  }

  setMockServerResponses(location, nextResponses);
  return { responseUid };
};

const deleteMockServer = (location) => {
  if (!location?.mockServerUid) {
    throw new Error('Mock server id is required.');
  }

  if (!location?.workspacePath) {
    throw new Error('Workspace path is required.');
  }

  const store = readWorkspaceStore(location.workspacePath);
  delete store.mockServers[location.mockServerUid];
  writeWorkspaceStore(location.workspacePath, store);
  return { mockServerUid: location.mockServerUid };
};

const cloneMockResponseRecord = (response) => {
  const cloned = JSON.parse(JSON.stringify(response));
  cloned.uid = uuidv4();

  if (Array.isArray(cloned.response?.headers)) {
    cloned.response.headers = cloned.response.headers.map((header) => ({
      ...header,
      uid: uuidv4()
    }));
  }

  if (Array.isArray(cloned.rules?.conditions)) {
    cloned.rules.conditions = cloned.rules.conditions.map((condition) => ({
      ...condition,
      uid: condition?.uid ? uuidv4() : condition?.uid
    }));
  }

  return cloned;
};

const cloneMockServerResponses = (sourceLocation, targetLocation) => {
  if (!sourceLocation?.mockServerUid || !targetLocation?.mockServerUid) {
    throw new Error('Mock server id is required.');
  }

  if (!targetLocation?.workspacePath || !sourceLocation?.workspacePath) {
    throw new Error('Workspace path is required.');
  }

  const responses = getMockServerResponses(sourceLocation);
  const clonedResponses = responses.map(cloneMockResponseRecord);
  setMockServerResponses(targetLocation, clonedResponses);
  return clonedResponses;
};

const getResponseRouteKey = (response) => {
  const method = (response?.request?.method || 'GET').toUpperCase();
  const url = response?.request?.url || '/';
  const status = Number(response?.response?.status) || 200;
  return `${method} ${url}::${status}`;
};

const appendMockResponses = (location, responses = []) => {
  const existingResponses = [...getMockServerResponses(location)];
  const existingKeys = new Set(existingResponses.map((item) => getResponseRouteKey(item)));
  const created = [];

  for (const response of responses) {
    const routeKey = getResponseRouteKey(response);
    if (existingKeys.has(routeKey)) {
      continue;
    }

    const nextResponse = {
      ...response,
      uid: response?.uid || uuidv4()
    };

    existingResponses.push(nextResponse);
    existingKeys.add(routeKey);
    created.push(nextResponse);
  }

  setMockServerResponses(location, existingResponses);
  return created;
};

module.exports = {
  appendMockResponses,
  cloneMockServerResponses,
  createEmptyMockResponse,
  deleteMockResponse,
  deleteMockServer,
  flushAllWorkspaceStores,
  flushWorkspaceStore,
  getStorePath: getWorkspaceStorePath,
  getWorkspaceStorePath,
  listMockResponses,
  listMockServers,
  readWorkspaceStore,
  saveMockResponse,
  saveMockServer,
  setMockServerResponses,
  writeWorkspaceStore
};
