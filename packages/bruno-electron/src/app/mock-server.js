const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const net = require('net');
const { BrowserWindow } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { preferencesUtil, getPreferences } = require('../store/preferences');
const {
  buildRouteMapFromMockResponses,
  countRouteResponses,
  extractRoutePath,
  routeMapToRouteTable
} = require('./mock-response-routes');
const { buildRequestContext, evaluateResponseCandidates } = require('./mock-rule-matcher');
const {
  DEFAULT_GATEWAY_PORT,
  allocateCollectionSlug,
  stripCollectionPrefix,
  buildBaseUrl
} = require('./mock-server-routing');

const MAX_LOG_ENTRIES = 500;
const LOG_FLUSH_MS = 300;
const MAX_AVAILABLE_ROUTES = 50;

const collections = new Map();
const pendingLogBroadcasts = new Map();
let logFlushTimer = null;
const slugToCollectionUid = new Map();
const isolatedServers = new Map();
let gateway = null;
let _mainWindow = null;

const setMainWindow = (mainWindow) => {
  _mainWindow = mainWindow;
};

const getMockMode = () => getPreferences()?.mockServer?.mode || 'isolated';

const resolveMockServerLocation = (mockServerUid, location = {}) => {
  const running = collections.get(mockServerUid);
  if (running) {
    return {
      mockServerUid,
      sourceType: running.sourceType || 'collection',
      collectionPath: running.collectionPath,
      workspacePath: running.workspacePath
    };
  }

  return {
    mockServerUid,
    sourceType: location.sourceType,
    collectionPath: location.collectionPath,
    workspacePath: location.workspacePath
  };
};

const resolveRouteMap = (mockServerUid, location = {}) => {
  const running = collections.get(mockServerUid);
  if (running?.routeMap) {
    return running.routeMap;
  }

  const resolvedLocation = resolveMockServerLocation(mockServerUid, location);
  if (!resolvedLocation.mockServerUid || !resolvedLocation.workspacePath) {
    return new Map();
  }

  return buildRouteMapFromMockResponses(resolvedLocation);
};

const getRouteCounts = (mockServerUid, location = {}) => {
  const routeMap = resolveRouteMap(mockServerUid, location);
  return {
    routeCount: routeMap.size,
    exampleCount: countRouteResponses(routeMap)
  };
};

const getUsedPorts = () => {
  const ports = new Set();
  if (gateway?.port) ports.add(gateway.port);
  for (const { port } of isolatedServers.values()) {
    if (port) ports.add(port);
  }
  return ports;
};

const isPortUsedByMockServer = (port, mockServerUid = null) => {
  if (gateway?.port === port) {
    return true;
  }

  for (const [uid, isolated] of isolatedServers.entries()) {
    if (isolated.port === port && uid !== mockServerUid) {
      return true;
    }
  }

  return false;
};

const isPortAvailable = (port) => new Promise((resolve) => {
  const tester = net.createServer()
    .once('error', () => resolve(false))
    .once('listening', () => {
      tester.close(() => resolve(true));
    })
    .listen(port, 'localhost');
});

const checkPortAvailable = async (port, { mockServerUid = null, additionalUsedPorts = [] } = {}) => {
  const normalizedPort = Number(port);

  if (!normalizedPort || normalizedPort < 1 || normalizedPort > 65535) {
    return { available: false, reason: 'invalid' };
  }

  if (isPortUsedByMockServer(normalizedPort, mockServerUid)) {
    return { available: false, reason: 'bruno' };
  }

  if (additionalUsedPorts.some((usedPort) => Number(usedPort) === normalizedPort)) {
    return { available: false, reason: 'bruno-config' };
  }

  if (!(await isPortAvailable(normalizedPort))) {
    return { available: false, reason: 'system' };
  }

  return { available: true, reason: null };
};

const assertIsolatedPortAvailable = async (requestedPort, mockServerUid) => {
  const port = Number(requestedPort) || DEFAULT_GATEWAY_PORT;
  const result = await checkPortAvailable(port, { mockServerUid });

  if (!result.available) {
    if (result.reason === 'bruno' || result.reason === 'bruno-config') {
      throw new Error(`Port ${port} is already used by another mock server in Bruno.`);
    }

    if (result.reason === 'system') {
      throw new Error(`Port ${port} is already in use on this system.`);
    }

    throw new Error(`Port ${port} is not available.`);
  }

  return port;
};

const resolveIsolatedPort = async (requestedPort, mockServerUid) => (
  assertIsolatedPortAvailable(requestedPort, mockServerUid)
);

const suggestPort = async (startPort = DEFAULT_GATEWAY_PORT, { additionalUsedPorts = [] } = {}) => {
  const used = getUsedPorts();
  for (const port of additionalUsedPorts) {
    const normalizedPort = Number(port);
    if (normalizedPort >= 1 && normalizedPort <= 65535) {
      used.add(normalizedPort);
    }
  }

  let port = Number(startPort) || DEFAULT_GATEWAY_PORT;

  while (used.has(port) || !(await isPortAvailable(port))) {
    port += 1;
    if (port > 65535) {
      throw new Error('No available ports found for the mock server.');
    }
  }

  return port;
};

const emit = (channel, data) => {
  const windows = BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed());
  const targetWindow = windows.find((win) => win === _mainWindow) || windows[0];

  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send(channel, data);
  }
};

const emitStatusChanged = (mockServerUid, status) => {
  emit('main:mock-server-status-changed', { mockServerUid, ...status });
};

const emitRouteTableUpdated = (mockServerUid) => {
  emit('main:mock-server-route-table-updated', {
    mockServerUid,
    routes: getRoutes(mockServerUid)
  });
};

const setCollectionRouteMap = (collection, routeMap) => {
  collection.routeMap = routeMap;
  collection.sortedRouteKeys = Array.from(routeMap.keys()).sort();
};

const getAvailableRoutes = (collection) => (
  collection.sortedRouteKeys?.slice(0, MAX_AVAILABLE_ROUTES)
  || Array.from(collection.routeMap.keys()).sort().slice(0, MAX_AVAILABLE_ROUTES)
);

const flushLogBroadcasts = () => {
  logFlushTimer = null;

  for (const [mockServerUid, entries] of pendingLogBroadcasts) {
    if (!entries.length) {
      continue;
    }

    emit('main:mock-server-request-log-batch', {
      mockServerUid,
      entries: [...entries]
    });
  }

  pendingLogBroadcasts.clear();
};

const scheduleLogFlush = () => {
  if (logFlushTimer) {
    return;
  }

  logFlushTimer = setTimeout(flushLogBroadcasts, LOG_FLUSH_MS);
};

const queueLogBroadcast = (mockServerUid, entry) => {
  const pending = pendingLogBroadcasts.get(mockServerUid) || [];
  pending.push(entry);
  pendingLogBroadcasts.set(mockServerUid, pending);
  scheduleLogFlush();
};

const findParameterizedMatch = (routeMap, method, reqPath) => {
  const reqSegments = reqPath.split('/');

  for (const [routeKey, examples] of routeMap) {
    const [routeMethod, ...pathParts] = routeKey.split(' ');
    if (routeMethod !== method) continue;

    const routeSegments = pathParts.join(' ').split('/');
    if (routeSegments.length !== reqSegments.length) continue;

    const matches = routeSegments.every((seg, i) =>
      seg.startsWith(':') || seg === reqSegments[i]
    );

    if (matches) return examples;
  }

  return null;
};

const normalizePath = (reqPath) => {
  let p = reqPath || '/';
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
};

const resolveSharedCollectionUid = (reqPath) => {
  const normalized = normalizePath(reqPath);
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return null;

  const slug = segments[0].toLowerCase();
  return slugToCollectionUid.get(slug) || null;
};

const logRequest = (collection, mockServerUid, data) => {
  const entry = {
    uid: uuidv4(),
    timestamp: new Date().toISOString(),
    method: data.method,
    path: data.path,
    matched: data.matched,
    matchedMockResponseName: data.matchedMockResponseName || data.matchedExampleName || null,
    matchedSourceFile: data.matchedSourceFile || null,
    matchedResponseUid: data.matchedResponseUid || null,
    matchTrace: data.matchTrace || null,
    statusCode: data.statusCode,
    delay: data.delay || 0,
    duration: data.duration || 0
  };

  collection.requestLog.push(entry);
  if (collection.requestLog.length > MAX_LOG_ENTRIES) {
    collection.requestLog.shift();
  }

  queueLogBroadcast(mockServerUid, entry);
};

const handleRequest = (mockServerUid, req, res) => {
  const collection = collections.get(mockServerUid);
  if (!collection) {
    res.status(500).json({ error: 'Mock server state not found' });
    return;
  }

  const startTime = Date.now();
  let reqPath = normalizePath(req.path);

  if (collection.mode === 'shared') {
    reqPath = normalizePath(stripCollectionPrefix(reqPath, collection.slug));
  }

  const method = req.method.toUpperCase();
  const routeKey = `${method} ${reqPath}`;

  let examples = collection.routeMap.get(routeKey);
  if (!examples) {
    examples = findParameterizedMatch(collection.routeMap, method, reqPath);
  }

  if (!examples || examples.length === 0) {
    logRequest(collection, mockServerUid, {
      method: req.method,
      path: reqPath,
      matched: false,
      matchedMockResponseName: null,
      matchTrace: {
        routeKey,
        failureReason: 'no_route',
        candidates: [],
        availableRoutes: getAvailableRoutes(collection)
      },
      statusCode: 404,
      duration: Date.now() - startTime
    });

    res.status(404).json({
      error: 'No mock response found',
      method: req.method,
      path: reqPath,
      hint: 'Create a mock response for this route',
      availableRoutes: getAvailableRoutes(collection)
    });
    return;
  }

  const requestContext = buildRequestContext(req);
  const { selected, trace } = evaluateResponseCandidates(examples, requestContext);
  const matchTrace = { ...trace, routeKey };

  if (!selected) {
    logRequest(collection, mockServerUid, {
      method: req.method,
      path: reqPath,
      matched: false,
      matchedMockResponseName: null,
      matchTrace,
      statusCode: 404,
      duration: Date.now() - startTime
    });

    res.status(404).json({
      error: 'No matching mock response',
      method: req.method,
      path: reqPath,
      hint: 'Add or adjust mock response rules for this route',
      availableRoutes: getAvailableRoutes(collection)
    });
    return;
  }

  const delay = collection.globalDelay;

  const sendResponse = () => {
    const statusCode = selected.response.status || 200;

    for (const header of selected.response.headers) {
      if (!header.name || !header.value) continue;

      const name = header.name.toLowerCase();
      if (
        name === 'transfer-encoding'
        || name === 'content-length'
        || name === 'content-encoding'
        || name === 'connection'
      ) continue;

      res.setHeader(header.name, header.value);
    }

    if (!res.getHeader('content-type')) {
      const contentTypeMap = {
        json: 'application/json',
        xml: 'application/xml',
        text: 'text/plain',
        html: 'text/html'
      };
      res.setHeader('content-type', contentTypeMap[selected.response.body.type] || 'text/plain');
    }

    logRequest(collection, mockServerUid, {
      method: req.method,
      path: reqPath,
      matched: true,
      matchedMockResponseName: selected.responseName || selected.exampleName,
      matchedSourceFile: selected.sourceFile,
      matchedResponseUid: selected.responseUid || null,
      matchTrace,
      statusCode,
      delay,
      duration: Date.now() - startTime
    });

    if (statusCode === 204) {
      res.status(204).end();
    } else {
      res.status(statusCode).send(selected.response.body.content || '');
    }
  };

  if (delay > 0) {
    setTimeout(sendResponse, delay);
  } else {
    sendResponse();
  }
};

const applyMockMiddleware = (app) => {
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Mock-Example', 'X-Mock-Response-Code']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ type: '*/*', limit: '10mb' }));
};

const createGatewayApp = () => {
  const app = express();
  applyMockMiddleware(app);

  app.all('*', (req, res) => {
    const mockServerUid = resolveSharedCollectionUid(req.path);
    if (!mockServerUid) {
      res.status(404).json({
        error: 'Unknown mock collection',
        hint: 'Use /{collection-slug}/{route-path} when shared gateway mode is enabled'
      });
      return;
    }

    handleRequest(mockServerUid, req, res);
  });

  return app;
};

const tryMockRequest = ({ url, method = 'GET', headers = {}, body = null }) => new Promise((resolve, reject) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch (err) {
    reject(new Error('Invalid try URL'));
    return;
  }

  const transport = parsedUrl.protocol === 'https:' ? https : http;
  const payload = body === null || body === undefined
    ? null
    : (typeof body === 'string' ? body : JSON.stringify(body));
  const requestHeaders = { ...headers };

  if (payload && !requestHeaders['Content-Length'] && !requestHeaders['content-length']) {
    requestHeaders['Content-Length'] = Buffer.byteLength(payload);
  }

  const req = transport.request({
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: `${parsedUrl.pathname}${parsedUrl.search}`,
    method: method.toUpperCase(),
    headers: requestHeaders
  }, (res) => {
    const chunks = [];

    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      resolve({
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
        url
      });
    });
  });

  req.on('error', reject);

  if (payload) {
    req.write(payload);
  }

  req.end();
});

const listenOnPort = (app, port) => new Promise((resolve, reject) => {
  const server = app.listen(port, 'localhost', () => resolve(server));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      reject(new Error(`Port ${port} is already in use. Choose a different port.`));
      return;
    }
    reject(err);
  });
});

const closeHttpServer = (httpServer) => new Promise((resolve) => {
  httpServer.close(resolve);

  const forceCloseTimeout = setTimeout(() => {
    httpServer.closeAllConnections();
  }, 3000);

  httpServer.on('close', () => clearTimeout(forceCloseTimeout));
});

const ensureSharedGateway = async () => {
  if (gateway) return gateway;

  const app = createGatewayApp();
  const port = await suggestPort(DEFAULT_GATEWAY_PORT);
  const httpServer = await listenOnPort(app, port);

  gateway = { app, httpServer, port };
  return gateway;
};

const registerSlug = (mockServerUid, slug) => {
  slugToCollectionUid.set(slug, mockServerUid);
};

const unregisterSlug = (slug) => {
  slugToCollectionUid.delete(slug);
};

const buildRouteMapForSource = async ({
  mockServerUid,
  sourceType,
  collectionPath,
  workspacePath
}) => ({
  routeMap: buildRouteMapFromMockResponses({
    mockServerUid,
    collectionPath,
    sourceType,
    workspacePath
  }),
  examplesGenerated: 0,
  filesUpdated: 0
});

const start = async ({
  mockServerUid,
  serverName,
  sourceType = 'collection',
  collectionPath,
  collectionName,
  brunoConfig,
  specPath,
  workspacePath,
  port = DEFAULT_GATEWAY_PORT,
  globalDelay = 0
}) => {
  if (!preferencesUtil.isBetaFeatureEnabled('mock-server')) {
    throw new Error('Mock server is a beta feature. Enable it in Preferences > Beta.');
  }

  if (!mockServerUid) {
    throw new Error('Mock server id is required.');
  }

  if (collections.has(mockServerUid)) {
    await stop(mockServerUid);
  }

  const mode = getMockMode();
  const { routeMap, examplesGenerated, filesUpdated } = await buildRouteMapForSource({
    mockServerUid,
    sourceType,
    collectionPath,
    workspacePath
  });
  const slug = mode === 'shared'
    ? allocateCollectionSlug(serverName || collectionName, mockServerUid, slugToCollectionUid)
    : null;

  let resolvedPort = Number(port) || DEFAULT_GATEWAY_PORT;

  if (mode === 'shared') {
    const sharedGateway = await ensureSharedGateway();
    resolvedPort = sharedGateway.port;
    registerSlug(mockServerUid, slug);
  } else {
    resolvedPort = await resolveIsolatedPort(resolvedPort, mockServerUid);

    const app = express();
    applyMockMiddleware(app);
    app.all('*', (req, res) => handleRequest(mockServerUid, req, res));

    const httpServer = await listenOnPort(app, resolvedPort);
    isolatedServers.set(mockServerUid, { httpServer, port: resolvedPort });
  }

  const baseUrl = buildBaseUrl({ mode, port: resolvedPort, slug });

  const collectionState = {
    mockServerUid,
    sourceType,
    collectionPath,
    workspacePath,
    collectionName: serverName || collectionName,
    mode,
    slug,
    port: resolvedPort,
    baseUrl,
    routeMap: null,
    sortedRouteKeys: [],
    globalDelay,
    specPath,
    requestLog: []
  };
  setCollectionRouteMap(collectionState, routeMap);
  collections.set(mockServerUid, collectionState);

  const routeCount = routeMap.size;
  const exampleCount = countRouteResponses(routeMap);

  emitStatusChanged(mockServerUid, {
    status: 'running',
    port: resolvedPort,
    baseUrl,
    slug,
    mode,
    routeCount,
    exampleCount,
    globalDelay,
    examplesGenerated,
    filesUpdated
  });

  return {
    port: resolvedPort,
    baseUrl,
    slug,
    mode,
    routeCount,
    exampleCount,
    examplesGenerated,
    filesUpdated,
    requestedPort: Number(port) || DEFAULT_GATEWAY_PORT
  };
};

const stop = async (mockServerUid) => {
  const collection = collections.get(mockServerUid);
  if (!collection) return;

  emitStatusChanged(mockServerUid, {
    status: 'stopping',
    port: collection.port,
    baseUrl: collection.baseUrl,
    slug: collection.slug,
    mode: collection.mode,
    routeCount: 0,
    exampleCount: 0,
    globalDelay: 0
  });

  if (collection.mode === 'shared') {
    unregisterSlug(collection.slug);
  } else {
    const isolated = isolatedServers.get(mockServerUid);
    if (isolated?.httpServer) {
      await closeHttpServer(isolated.httpServer);
    }
    isolatedServers.delete(mockServerUid);
  }

  collections.delete(mockServerUid);

  if (gateway && collections.size === 0 && isolatedServers.size === 0) {
    await closeHttpServer(gateway.httpServer);
    gateway = null;
  }

  emitStatusChanged(mockServerUid, {
    status: 'stopped',
    port: null,
    baseUrl: null,
    slug: null,
    mode: getMockMode(),
    routeCount: 0,
    exampleCount: 0,
    globalDelay: 0
  });
};

const stopAll = async () => {
  const uids = Array.from(collections.keys());
  await Promise.all(uids.map((uid) => stop(uid)));
};

const getStatus = (mockServerUid, location = {}) => {
  const collection = collections.get(mockServerUid);
  if (!collection) {
    const counts = getRouteCounts(mockServerUid, location);
    return {
      status: 'stopped',
      port: null,
      baseUrl: null,
      slug: null,
      mode: getMockMode(),
      routeCount: counts.routeCount,
      exampleCount: counts.exampleCount,
      globalDelay: 0
    };
  }

  return {
    status: 'running',
    port: collection.port,
    baseUrl: collection.baseUrl,
    slug: collection.slug,
    mode: collection.mode,
    routeCount: collection.routeMap.size,
    exampleCount: countRouteResponses(collection.routeMap),
    globalDelay: collection.globalDelay
  };
};

const refreshRoutes = async (mockServerUid, location = {}) => {
  const collection = collections.get(mockServerUid);
  const resolvedLocation = resolveMockServerLocation(mockServerUid, location);
  const routeMap = buildRouteMapFromMockResponses(resolvedLocation);

  if (collection) {
    setCollectionRouteMap(collection, routeMap);
    emitRouteTableUpdated(mockServerUid);
  }

  return {
    routeCount: routeMap.size,
    exampleCount: countRouteResponses(routeMap),
    routes: routeMapToRouteTable(routeMap)
  };
};

const getRoutes = (mockServerUid, location = {}) => (
  routeMapToRouteTable(resolveRouteMap(mockServerUid, location))
);

const getLog = (mockServerUid) => {
  const collection = collections.get(mockServerUid);
  return collection ? collection.requestLog : [];
};

const setDelay = (mockServerUid, delay) => {
  const collection = collections.get(mockServerUid);
  if (!collection) throw new Error('Mock server is not running.');
  collection.globalDelay = Math.max(0, Number(delay) || 0);
};

const clearLog = (mockServerUid) => {
  const collection = collections.get(mockServerUid);
  if (collection) collection.requestLog = [];
};

const getRunningMockServerUids = () => Array.from(collections.keys());

const reloadRoutesFromStore = async (mockServerUid, location = {}) => {
  const collection = collections.get(mockServerUid);
  if (!collection) {
    return refreshRoutes(mockServerUid, location);
  }

  return refreshRoutes(mockServerUid, {
    sourceType: collection.sourceType,
    collectionPath: collection.collectionPath,
    workspacePath: collection.workspacePath
  });
};

module.exports = {
  setMainWindow,
  start,
  stop,
  stopAll,
  getStatus,
  refreshRoutes,
  getRoutes,
  getLog,
  setDelay,
  clearLog,
  suggestPort,
  checkPortAvailable,
  getMockMode,
  getRunningMockServerUids,
  reloadRoutesFromStore,
  tryMockRequest
};
