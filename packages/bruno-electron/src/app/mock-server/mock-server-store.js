const path = require('path');
const fs = require('fs');
const { parseMockServer, stringifyMockServer } = require('@usebruno/filestore');
const { getMockResponseRouteKey } = require('@usebruno/common').utils;
const { generateUidBasedOnHash } = require('../../utils/common');
const { sanitizeName, validateName } = require('../../utils/filesystem');

const DEFAULT_MOCK_SERVER_PORT = 4000;
const DEFAULT_MOCK_SERVER_NAME = 'Mock Server';

const fileCache = new Map();
const routeUidsByFile = new Map();

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const getMocksDirPath = (workspacePath) => {
  if (!workspacePath) {
    throw new Error('Workspace path is required.');
  }

  return path.join(workspacePath, 'mocks');
};

const getMockServerUid = (pathname) => generateUidBasedOnHash(pathname);

const getRouteUidMap = (pathname) => {
  if (!routeUidsByFile.has(pathname)) {
    routeUidsByFile.set(pathname, new Map());
  }

  return routeUidsByFile.get(pathname);
};

const routeNameKey = (name, occurrence) => {
  const normalized = (name || '').trim().toLowerCase();
  return occurrence > 1 ? `${normalized}#${occurrence}` : normalized;
};

const resolveRouteUid = (pathname, nameKey) => {
  const uidMap = getRouteUidMap(pathname);

  if (!uidMap.has(nameKey)) {
    uidMap.set(nameKey, generateUidBasedOnHash(`${pathname}::route::${nameKey}`));
  }

  return uidMap.get(nameKey);
};

// Assigns uids to a routes array, keeping uids passed in by callers and
// disambiguating duplicate names so two routes never share a uid.
const withRouteUids = (pathname, routes) => {
  const occurrences = new Map();

  return routes.map((route) => {
    const normalized = (route.name || '').trim().toLowerCase();
    const occurrence = (occurrences.get(normalized) || 0) + 1;
    occurrences.set(normalized, occurrence);

    if (route.uid) {
      return route;
    }

    return {
      ...route,
      uid: resolveRouteUid(pathname, routeNameKey(route.name, occurrence))
    };
  });
};

const listMockServerFilePaths = (workspacePath) => {
  const mocksDir = getMocksDirPath(workspacePath);

  if (!fs.existsSync(mocksDir)) {
    return [];
  }

  return fs.readdirSync(mocksDir)
    .filter((filename) => filename.toLowerCase().endsWith('.yml'))
    .map((filename) => path.join(mocksDir, filename));
};

const readMockServerFile = (pathname) => {
  if (fileCache.has(pathname)) {
    return fileCache.get(pathname);
  }

  const content = fs.readFileSync(pathname, 'utf8');
  const data = parseMockServer(content, { format: 'yml' });
  data.routes = withRouteUids(pathname, data.routes);

  const entry = { pathname, data };
  fileCache.set(pathname, entry);
  return entry;
};

const invalidateMockServerFile = (pathname) => {
  fileCache.delete(pathname);
};

const removeMockServerFileFromCache = (pathname) => {
  fileCache.delete(pathname);
  routeUidsByFile.delete(pathname);
};

// Writes are synchronous: mutations are user-action-scale and each file is
// small, and a debounce would let a pending in-memory write race an external
// edit (and leave created filenames unreserved on disk).
const writeMockServerFile = (entry) => {
  try {
    ensureDir(path.dirname(entry.pathname));
    fs.writeFileSync(entry.pathname, stringifyMockServer(entry.data, { format: 'yml' }), 'utf8');
  } catch (err) {
    fileCache.delete(entry.pathname);
    throw err;
  }

  fileCache.set(entry.pathname, entry);
  return entry.pathname;
};

const toInstance = (entry, workspaceUid = null) => {
  const { pathname, data } = entry;
  const source = data.source;

  return {
    uid: getMockServerUid(pathname),
    name: data.name || DEFAULT_MOCK_SERVER_NAME,
    port: Number(data.port) || DEFAULT_MOCK_SERVER_PORT,
    sourceType: source?.type || 'manual',
    collectionUid: source?.type === 'collection' ? generateUidBasedOnHash(source.path) : null,
    collectionPathname: source?.type === 'collection' ? source.path : null,
    specPath: source?.type === 'spec' ? source.path : null,
    globalDelay: Number(data.delay) || 0,
    workspaceUid,
    pathname
  };
};

const resolveMockServerPathname = (workspacePath, mockServerUid) => {
  if (!mockServerUid) {
    throw new Error('Mock server id is required.');
  }

  const pathname = listMockServerFilePaths(workspacePath)
    .find((filePath) => getMockServerUid(filePath) === mockServerUid);

  if (!pathname) {
    // Distinguishes a genuinely missing server from parse/read failures so
    // callers don't treat a corrupt file as "server deleted" (and drop routes).
    const error = new Error('Mock server not found.');
    error.code = 'MOCK_SERVER_NOT_FOUND';
    throw error;
  }

  return pathname;
};

const getEntryByLocation = (location) => {
  if (!location?.workspacePath) {
    throw new Error('Workspace path is required.');
  }

  return readMockServerFile(resolveMockServerPathname(location.workspacePath, location.mockServerUid));
};

const listMockServers = (workspacePath, workspaceUid) => {
  const instances = [];

  for (const pathname of listMockServerFilePaths(workspacePath)) {
    try {
      instances.push(toInstance(readMockServerFile(pathname), workspaceUid));
    } catch (err) {
      console.warn(`[MockServerStore] Skipping unreadable mock server file (${pathname}): ${err.message}`);
    }
  }

  return instances;
};

const getMockServerFromFile = (pathname, workspaceUid) => {
  const entry = readMockServerFile(pathname);

  return {
    instance: toInstance(entry, workspaceUid),
    responses: entry.data.routes
  };
};

// The source block needs a path; a renderer instance links collections by uid, so
// when the pathname is missing keep the file's existing source if it still matches.
const resolveSource = (instance, existingSource) => {
  if (instance.sourceType === 'spec') {
    if (!instance.specPath) {
      throw new Error('API spec path is required.');
    }

    return { type: 'spec', path: instance.specPath };
  }

  if (instance.sourceType === 'collection') {
    if (instance.collectionPathname) {
      return { type: 'collection', path: instance.collectionPathname };
    }

    if (
      existingSource?.type === 'collection'
      && instance.collectionUid
      && generateUidBasedOnHash(existingSource.path) === instance.collectionUid
    ) {
      return existingSource;
    }

    throw new Error('Collection path is required.');
  }

  return null;
};

// The name in the info block allows any characters (same rules as collection
// names); the filename is a sanitized, filesystem-safe derivative and may
// differ from the name. Filename collisions get a numeric suffix.
const createMockServerFilePathname = (workspacePath, name) => {
  const sanitized = sanitizeName(name);
  const base = sanitized && validateName(sanitized) ? sanitized : 'mock-server';
  const mocksDir = getMocksDirPath(workspacePath);

  let filename = `${base}.yml`;
  let counter = 1;
  while (fs.existsSync(path.join(mocksDir, filename))) {
    counter += 1;
    filename = `${base} ${counter}.yml`;
  }

  return path.join(mocksDir, filename);
};

const assertUniqueMockServerName = (workspacePath, name, excludeUid = null) => {
  const normalized = name.trim().toLowerCase();
  const isDuplicate = listMockServers(workspacePath).some((instance) => (
    instance.uid !== excludeUid && instance.name.trim().toLowerCase() === normalized
  ));

  if (isDuplicate) {
    throw new Error('A mock server with this name already exists');
  }
};

const saveMockServer = (workspacePath, instance) => {
  if (!workspacePath) {
    throw new Error('Workspace path is required.');
  }

  if (!instance?.name?.trim()) {
    throw new Error('Mock server name is required.');
  }

  assertUniqueMockServerName(workspacePath, instance.name, instance.uid || null);

  let entry;

  if (instance.uid) {
    entry = readMockServerFile(resolveMockServerPathname(workspacePath, instance.uid));
    entry.data = {
      ...entry.data,
      name: instance.name.trim(),
      port: Number(instance.port) || DEFAULT_MOCK_SERVER_PORT,
      delay: Number(instance.globalDelay) || 0,
      source: resolveSource(instance, entry.data.source)
    };
  } else {
    entry = {
      pathname: createMockServerFilePathname(workspacePath, instance.name),
      data: {
        name: instance.name.trim(),
        port: Number(instance.port) || DEFAULT_MOCK_SERVER_PORT,
        delay: Number(instance.globalDelay) || 0,
        source: resolveSource(instance, null),
        routes: []
      }
    };
  }

  writeMockServerFile(entry);
  return toInstance(entry, instance.workspaceUid);
};

const deleteMockServer = (location) => {
  const entry = getEntryByLocation(location);

  removeMockServerFileFromCache(entry.pathname);
  if (fs.existsSync(entry.pathname)) {
    fs.unlinkSync(entry.pathname);
  }

  return { mockServerUid: location.mockServerUid };
};

const listMockResponses = (location) => getEntryByLocation(location).data.routes;

const setMockServerResponses = (location, responses) => {
  const entry = getEntryByLocation(location);
  entry.data.routes = withRouteUids(entry.pathname, responses || []);
  writeMockServerFile(entry);
  return entry.data.routes;
};

const createEmptyMockResponse = (name = 'New Mock Response') => ({
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
    statusText: '',
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

const saveMockResponse = (location, response) => {
  const entry = getEntryByLocation(location);
  const routes = [...entry.data.routes];

  const index = response?.uid ? routes.findIndex((route) => route.uid === response.uid) : -1;
  const normalizedName = response?.name?.trim().toLowerCase();
  const currentName = index >= 0 ? routes[index].name?.trim().toLowerCase() : null;

  if (normalizedName && normalizedName !== currentName) {
    const isDuplicate = routes.some((route) => (
      route.uid !== response?.uid && route.name?.trim().toLowerCase() === normalizedName
    ));
    if (isDuplicate) {
      throw new Error('A mock response with this name already exists');
    }
  }

  let nextResponse;

  if (index >= 0) {
    // A rename keeps the uid — move the name→uid mapping so re-reads of the file
    // hydrate the renamed route with the same uid this session.
    if (normalizedName && normalizedName !== currentName) {
      const uidMap = getRouteUidMap(entry.pathname);
      uidMap.delete(routeNameKey(routes[index].name, 1));
      uidMap.set(routeNameKey(response.name, 1), response.uid);
    }

    nextResponse = { ...response };
    routes[index] = nextResponse;
  } else {
    nextResponse = {
      ...response,
      uid: response?.uid || resolveRouteUid(entry.pathname, routeNameKey(response?.name, 1))
    };
    routes.push(nextResponse);
  }

  entry.data.routes = routes;
  writeMockServerFile(entry);
  return nextResponse;
};

const deleteMockResponse = (location, responseUid) => {
  const entry = getEntryByLocation(location);
  const nextRoutes = entry.data.routes.filter((route) => route.uid !== responseUid);

  if (nextRoutes.length === entry.data.routes.length) {
    throw new Error('Mock response not found.');
  }

  entry.data.routes = nextRoutes;
  writeMockServerFile(entry);
  return { responseUid };
};

const cloneMockServerResponses = (sourceLocation, targetLocation) => {
  const responses = listMockResponses(sourceLocation);
  const clonedResponses = responses.map(({ uid, ...response }) => JSON.parse(JSON.stringify(response)));
  return setMockServerResponses(targetLocation, clonedResponses);
};

const appendMockResponses = (location, responses = []) => {
  const entry = getEntryByLocation(location);
  const nextRoutes = [...entry.data.routes];
  const existingKeys = new Set(nextRoutes.map((route) => getMockResponseRouteKey(route)));
  const createdIndexes = [];

  for (const response of responses) {
    const routeKey = getMockResponseRouteKey(response);
    if (existingKeys.has(routeKey)) {
      continue;
    }

    createdIndexes.push(nextRoutes.length);
    nextRoutes.push(response);
    existingKeys.add(routeKey);
  }

  // withRouteUids maps routes 1:1 in order, so indexes stay valid.
  entry.data.routes = withRouteUids(entry.pathname, nextRoutes);
  writeMockServerFile(entry);
  return createdIndexes.map((index) => entry.data.routes[index]);
};

module.exports = {
  appendMockResponses,
  cloneMockServerResponses,
  createEmptyMockResponse,
  deleteMockResponse,
  deleteMockServer,
  getMocksDirPath,
  getMockServerFromFile,
  getMockServerUid,
  invalidateMockServerFile,
  listMockResponses,
  listMockServers,
  removeMockServerFileFromCache,
  saveMockResponse,
  saveMockServer,
  setMockServerResponses
};
