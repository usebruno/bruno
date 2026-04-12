const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { parseRequest } = require('@usebruno/filestore');
const { searchForRequestFiles, getCollectionFormat } = require('../utils/filesystem');
const { preferencesUtil } = require('../store/preferences');

const MAX_LOG_ENTRIES = 500;

// Module-level state: one server per collection
const servers = new Map();
let _mainWindow = null;

const setMainWindow = (mainWindow) => {
  _mainWindow = mainWindow;
};

const countExamples = (routeMap) => {
  let count = 0;
  for (const examples of routeMap.values()) {
    count += examples.length;
  }
  return count;
};

// --- Route building ---

const extractRoutePath = (rawUrl) => {
  if (!rawUrl) return null;

  // Strip host-level variables (e.g. {{baseUrl}}, {{host}}) that appear before the path
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

  // Convert path-level variables to Express-style params: {{id}} -> :id
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

// --- IPC emission helpers ---

const emit = (channel, data) => {
  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send(channel, data);
  }
};

const emitStatusChanged = (collectionUid, status) => {
  emit('main:mock-server-status-changed', { collectionUid, ...status });
};

const emitRouteTableUpdated = (collectionUid) => {
  emit('main:mock-server-route-table-updated', {
    collectionUid,
    routes: getRoutes(collectionUid)
  });
};

// --- Request handling ---

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

const logRequest = (server, collectionUid, data) => {
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

  server.requestLog.push(entry);
  if (server.requestLog.length > MAX_LOG_ENTRIES) {
    server.requestLog.shift();
  }

  emit('main:mock-server-request-log', { collectionUid, entry });
};

const handleRequest = (collectionUid, req, res) => {
  const server = servers.get(collectionUid);
  if (!server) {
    res.status(500).json({ error: 'Mock server state not found' });
    return;
  }

  const startTime = Date.now();
  const reqPath = normalizePath(req.path);
  const method = req.method.toUpperCase();

  // Try exact match first, then parameterized match
  let examples = server.routeMap.get(`${method} ${reqPath}`);
  if (!examples) {
    examples = findParameterizedMatch(server.routeMap, method, reqPath);
  }

  if (!examples || examples.length === 0) {
    logRequest(server, collectionUid, {
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
      availableRoutes: Array.from(server.routeMap.keys()).sort()
    });
    return;
  }

  let selected = examples[0];

  const exampleNameHeader = req.headers['x-mock-example'];
  const responseCodeHeader = req.headers['x-mock-response-code'];

  if (exampleNameHeader) {
    const match = examples.find((e) => e.exampleName.toLowerCase() === exampleNameHeader.toLowerCase());
    if (match) selected = match;
  } else if (responseCodeHeader) {
    const match = examples.find((e) => String(e.response.status) === String(responseCodeHeader));
    if (match) selected = match;
  }

  const delay = server.globalDelay;

  const sendResponse = () => {
    const statusCode = selected.response.status || 200;

    for (const header of selected.response.headers) {
      if (!header.name || !header.value) continue;

      // Skip transport-level headers -- Express manages these for the mock response.
      // The saved example may have gzip/chunked from the original API, but the mock
      // server sends raw uncompressed bodies, so these would cause client parse errors.
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

    logRequest(server, collectionUid, {
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

// --- Public API ---

const start = async (collectionUid, collectionPath, port = 4000, globalDelay = 0) => {
  if (!preferencesUtil.isBetaFeatureEnabled('mock-server')) {
    throw new Error('Mock server is a beta feature. Enable it in Preferences > Beta.');
  }

  if (servers.has(collectionUid)) {
    await stop(collectionUid);
  }

  const routeMap = buildRouteMap(collectionPath);

  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Mock-Example', 'X-Mock-Response-Code']
  }));

  app.all('*', (req, res) => handleRequest(collectionUid, req, res));

  const httpServer = await new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Choose a different port.`));
      } else {
        reject(err);
      }
    });
  });

  servers.set(collectionUid, {
    collectionUid,
    collectionPath,
    port,
    httpServer,
    routeMap,
    globalDelay,
    requestLog: []
  });

  const routeCount = routeMap.size;
  const exampleCount = countExamples(routeMap);

  emitStatusChanged(collectionUid, { status: 'running', port, routeCount, exampleCount, globalDelay });

  return { port, routeCount, exampleCount };
};

const stop = async (collectionUid) => {
  const server = servers.get(collectionUid);
  if (!server) return;

  emitStatusChanged(collectionUid, { status: 'stopping', port: server.port, routeCount: 0, exampleCount: 0, globalDelay: 0 });

  await new Promise((resolve) => {
    // Stop accepting new connections, wait for in-flight requests to finish
    server.httpServer.close(resolve);

    // Force-close lingering keep-alive connections after 3s
    const forceCloseTimeout = setTimeout(() => {
      server.httpServer.closeAllConnections();
    }, 3000);

    server.httpServer.on('close', () => clearTimeout(forceCloseTimeout));
  });

  servers.delete(collectionUid);

  emitStatusChanged(collectionUid, { status: 'stopped', port: null, routeCount: 0, exampleCount: 0, globalDelay: 0 });
};

const stopAll = async () => {
  const uids = Array.from(servers.keys());
  await Promise.all(uids.map((uid) => stop(uid)));
};

const getStatus = (collectionUid) => {
  const server = servers.get(collectionUid);
  if (!server) {
    return { status: 'stopped', port: null, routeCount: 0, exampleCount: 0, globalDelay: 0 };
  }

  return {
    status: 'running',
    port: server.port,
    routeCount: server.routeMap.size,
    exampleCount: countExamples(server.routeMap),
    globalDelay: server.globalDelay
  };
};

const refreshRoutes = (collectionUid) => {
  const server = servers.get(collectionUid);
  if (!server) throw new Error('Mock server is not running for this collection.');

  server.routeMap = buildRouteMap(server.collectionPath);
  emitRouteTableUpdated(collectionUid);

  return { routeCount: server.routeMap.size, exampleCount: countExamples(server.routeMap) };
};

const getRoutes = (collectionUid) => {
  const server = servers.get(collectionUid);
  if (!server) return [];

  const routes = [];
  for (const [routeKey, examples] of server.routeMap) {
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

const getLog = (collectionUid) => {
  const server = servers.get(collectionUid);
  return server ? server.requestLog : [];
};

const setDelay = (collectionUid, delay) => {
  const server = servers.get(collectionUid);
  if (!server) throw new Error('Mock server is not running for this collection.');
  server.globalDelay = Math.max(0, Number(delay) || 0);
};

const clearLog = (collectionUid) => {
  const server = servers.get(collectionUid);
  if (server) server.requestLog = [];
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
  clearLog
};
