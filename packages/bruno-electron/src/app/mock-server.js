const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { BrowserWindow } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { parseRequest } = require('@usebruno/filestore');
const { searchForRequestFiles, getCollectionFormat } = require('../utils/filesystem');
const { preferencesUtil, getPreferences } = require('../store/preferences');
const { ensureMockExamples } = require('./mock-example-generator');
const { loadBrunoConfig, parseSpec } = require('./mock-spec-loader');
const { buildRouteMapFromSpec } = require('./mock-spec-routes');
const {
  DEFAULT_GATEWAY_PORT,
  allocateCollectionSlug,
  stripCollectionPrefix,
  buildBaseUrl
} = require('./mock-server-routing');

const MAX_LOG_ENTRIES = 500;

const collections = new Map();
const slugToCollectionUid = new Map();
const isolatedServers = new Map();
let gateway = null;
let _mainWindow = null;

const setMainWindow = (mainWindow) => {
  _mainWindow = mainWindow;
};

const getMockMode = () => getPreferences()?.mockServer?.mode || 'isolated';

const countExamples = (routeMap) => {
  let count = 0;
  for (const examples of routeMap.values()) {
    count += examples.length;
  }
  return count;
};

const getUsedPorts = () => {
  const ports = new Set();
  if (gateway?.port) ports.add(gateway.port);
  for (const { port } of isolatedServers.values()) {
    if (port) ports.add(port);
  }
  return ports;
};

const isPortAvailable = (port) => new Promise((resolve) => {
  const tester = net.createServer()
    .once('error', () => resolve(false))
    .once('listening', () => {
      tester.close(() => resolve(true));
    })
    .listen(port, '127.0.0.1');
});

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

const resolveIsolatedPort = async (requestedPort, mockServerUid) => {
  let port = Number(requestedPort) || DEFAULT_GATEWAY_PORT;

  if (isPortUsedByMockServer(port, mockServerUid) || !(await isPortAvailable(port))) {
    port = await suggestPort(DEFAULT_GATEWAY_PORT);
  }

  return port;
};

const suggestPort = async (startPort = DEFAULT_GATEWAY_PORT) => {
  const used = getUsedPorts();
  let port = startPort;

  while (used.has(port) || !(await isPortAvailable(port))) {
    port += 1;
    if (port > 65535) {
      throw new Error('No available ports found for the mock server.');
    }
  }

  return port;
};

const extractRoutePath = (rawUrl) => {
  if (!rawUrl) return null;

  let cleaned = rawUrl.replace(/^\{\{[^}]+\}\}/, '');

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      cleaned = new URL(cleaned).pathname;
    } catch {
      const qIndex = cleaned.indexOf('?');
      if (qIndex !== -1) cleaned = cleaned.substring(0, qIndex);
    }
  } else {
    const qIndex = cleaned.indexOf('?');
    if (qIndex !== -1) cleaned = cleaned.substring(0, qIndex);
  }

  cleaned = cleaned.replace(/\{\{([^}]+)\}\}/g, ':$1');

  if (!cleaned.startsWith('/')) cleaned = '/' + cleaned;
  if (cleaned.length > 1 && cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
  cleaned = cleaned.replace(/\/+/g, '/');

  return cleaned || '/';
};

const buildRouteMap = (collectionPath) => {
  const format = getCollectionFormat(collectionPath);
  const routeMap = new Map();

  let files;
  try {
    files = searchForRequestFiles(collectionPath, collectionPath);
  } catch (err) {
    console.warn(`[MockServer] Failed to scan collection: ${err.message}`);
    return routeMap;
  }

  for (const filePath of files) {
    const basename = path.basename(filePath);
    const relativePath = path.relative(collectionPath, filePath);

    if (basename === 'collection.bru' || basename === 'folder.bru') continue;
    if (basename === 'opencollection.yml' || basename === 'folder.yml') continue;

    const relDir = path.dirname(relativePath);
    if (relDir === 'environments' || relDir.startsWith('environments' + path.sep)) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.warn(`[MockServer] Failed to read file ${relativePath}: ${err.message}`);
      continue;
    }

    let parsed;
    try {
      parsed = parseRequest(content, { format });
    } catch (err) {
      console.warn(`[MockServer] Failed to parse file ${relativePath}: ${err.message}`);
      continue;
    }

    if (!parsed?.examples?.length) continue;

    const requestType = parsed.type || 'http-request';
    if (requestType !== 'http-request' && requestType !== 'http') continue;

    const parentMethod = (parsed.request?.method || 'GET').toUpperCase();
    const parentUrl = parsed.request?.url || '';

    for (const example of parsed.examples) {
      const method = (example.request?.method || parentMethod).toUpperCase();
      const rawUrl = example.request?.url || parentUrl;
      const routePath = extractRoutePath(rawUrl);

      if (!routePath) continue;

      const routeKey = `${method} ${routePath}`;

      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, []);
      }

      routeMap.get(routeKey).push({
        exampleName: example.name || 'default',
        sourceFile: relativePath,
        requestItemName: parsed.name || basename,
        response: {
          status: Number(example.response?.status) || 200,
          statusText: example.response?.statusText || '',
          headers: (example.response?.headers || []).map((h) => ({
            name: h.name,
            value: h.value
          })),
          body: {
            type: example.response?.body?.type || 'text',
            content: example.response?.body?.content || ''
          }
        }
      });
    }
  }

  return routeMap;
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
    matchedExampleName: data.matchedExampleName || null,
    matchedSourceFile: data.matchedSourceFile || null,
    statusCode: data.statusCode,
    delay: data.delay || 0,
    duration: data.duration || 0
  };

  collection.requestLog.push(entry);
  if (collection.requestLog.length > MAX_LOG_ENTRIES) {
    collection.requestLog.shift();
  }

  emit('main:mock-server-request-log', { mockServerUid, entry });
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

  let examples = collection.routeMap.get(`${method} ${reqPath}`);
  if (!examples) {
    examples = findParameterizedMatch(collection.routeMap, method, reqPath);
  }

  if (!examples || examples.length === 0) {
    logRequest(collection, mockServerUid, {
      method: req.method,
      path: reqPath,
      matched: false,
      matchedExampleName: null,
      statusCode: 404,
      duration: Date.now() - startTime
    });

    res.status(404).json({
      error: 'No mock example found',
      method: req.method,
      path: reqPath,
      hint: 'Add an example for this route in your Bruno collection',
      availableRoutes: Array.from(collection.routeMap.keys()).sort()
    });
    return;
  }

  let selected = examples[0];

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
      matchedExampleName: selected.exampleName,
      matchedSourceFile: selected.sourceFile,
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

const createGatewayApp = () => {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

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

const listenOnPort = (app, port) => new Promise((resolve, reject) => {
  const server = app.listen(port, '127.0.0.1', () => resolve(server));
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
  sourceType,
  collectionPath,
  brunoConfig,
  specPath
}) => {
  if (sourceType === 'spec') {
    if (!specPath || !fs.existsSync(specPath)) {
      throw new Error('API spec file not found.');
    }

    const content = fs.readFileSync(specPath, 'utf8');
    const spec = parseSpec(content);
    return {
      routeMap: buildRouteMapFromSpec(spec),
      examplesGenerated: 0,
      filesUpdated: 0
    };
  }

  const resolvedBrunoConfig = brunoConfig || loadBrunoConfig(collectionPath);
  const generationResult = await ensureMockExamples(collectionPath, resolvedBrunoConfig);

  return {
    routeMap: buildRouteMap(collectionPath),
    examplesGenerated: generationResult.examplesGenerated,
    filesUpdated: generationResult.filesUpdated
  };
};

const start = async ({
  mockServerUid,
  serverName,
  sourceType = 'collection',
  collectionPath,
  collectionName,
  brunoConfig,
  specPath,
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
    sourceType,
    collectionPath,
    brunoConfig,
    specPath
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
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.all('*', (req, res) => handleRequest(mockServerUid, req, res));

    const httpServer = await listenOnPort(app, resolvedPort);
    isolatedServers.set(mockServerUid, { httpServer, port: resolvedPort });
  }

  const baseUrl = buildBaseUrl({ mode, port: resolvedPort, slug });

  collections.set(mockServerUid, {
    mockServerUid,
    sourceType,
    collectionPath,
    collectionName: serverName || collectionName,
    mode,
    slug,
    port: resolvedPort,
    baseUrl,
    routeMap,
    globalDelay,
    specPath,
    requestLog: []
  });

  const routeCount = routeMap.size;
  const exampleCount = countExamples(routeMap);

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

const getStatus = (mockServerUid) => {
  const collection = collections.get(mockServerUid);
  if (!collection) {
    return {
      status: 'stopped',
      port: null,
      baseUrl: null,
      slug: null,
      mode: getMockMode(),
      routeCount: 0,
      exampleCount: 0,
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
    exampleCount: countExamples(collection.routeMap),
    globalDelay: collection.globalDelay
  };
};

const refreshRoutes = async (mockServerUid) => {
  const collection = collections.get(mockServerUid);
  if (!collection) throw new Error('Mock server is not running.');

  const { routeMap } = await buildRouteMapForSource({
    sourceType: collection.sourceType || 'collection',
    collectionPath: collection.collectionPath,
    specPath: collection.specPath
  });
  collection.routeMap = routeMap;
  emitRouteTableUpdated(mockServerUid);

  return { routeCount: collection.routeMap.size, exampleCount: countExamples(collection.routeMap) };
};

const getRoutes = (mockServerUid) => {
  const collection = collections.get(mockServerUid);
  if (!collection) return [];

  const routes = [];
  for (const [routeKey, examples] of collection.routeMap) {
    const [method, ...pathParts] = routeKey.split(' ');
    routes.push({
      method,
      path: pathParts.join(' '),
      exampleCount: examples.length,
      examples: examples.map((ex) => ({
        name: ex.exampleName,
        status: ex.response.status,
        sourceFile: ex.sourceFile
      })),
      defaultExample: examples[0]?.exampleName || null
    });
  }
  return routes;
};

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
  getMockMode,
  getRunningMockServerUids
};
