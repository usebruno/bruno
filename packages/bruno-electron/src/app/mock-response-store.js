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

const readWorkspaceStore = (workspacePath) => {
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

const writeWorkspaceStore = (workspacePath, store) => {
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

  store.mockServers[location.mockServerUid] = {
    responses: responses || []
  };

  writeWorkspaceStore(location.workspacePath, store);
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
  getStorePath: getWorkspaceStorePath,
  getWorkspaceStorePath,
  listMockResponses,
  readWorkspaceStore,
  saveMockResponse,
  writeWorkspaceStore
};
