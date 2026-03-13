const _ = require('lodash');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { ipcMain, app } = require('electron');
const {
  parseRequest,
  stringifyRequestViaWorker,
  parseCollection,
  stringifyCollection,
  stringifyFolder
} = require('@usebruno/filestore');
const { openApiToBruno } = require('@usebruno/converters');
const { writeFile, sanitizeName, getCollectionFormat } = require('../utils/filesystem');
const { getEnvVars } = require('../utils/collection');
const { getProcessEnvVars } = require('../store/process-env');
const { getCertsAndProxyConfig } = require('./network/cert-utils');
const { makeAxiosInstance } = require('./network/axios-instance');
const jsyaml = require('js-yaml');

/**
 * Detect if a string content is YAML (not JSON).
 * Attempts JSON.parse first for a definitive check rather than relying on heuristics.
 */
const isYamlContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  try {
    JSON.parse(content);
    return false; // Valid JSON — not YAML
  } catch {
    // Not JSON — verify it's actually parseable as YAML and produces an object
    try {
      const result = jsyaml.load(content);
      return result && typeof result === 'object';
    } catch {
      return false;
    }
  }
};

/**
 * Pretty-print JSON content for readable diffs. YAML content is returned as-is.
 */
const prettyPrintSpec = (content) => {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
};

/**
 * Generate an MD5 hash of a parsed OpenAPI spec for quick change detection.
 */
const generateSpecHash = (spec) => {
  if (!spec) return null;
  return crypto.createHash('md5').update(JSON.stringify(spec)).digest('hex');
};

/**
 * Validate that a target path is inside the collection directory.
 * Prevents path traversal attacks via ../../ in user-supplied paths.
 */
const isPathInsideCollection = (targetPath, collectionPath) => {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedCollection = path.resolve(collectionPath);
  return resolvedTarget.startsWith(resolvedCollection + path.sep) || resolvedTarget === resolvedCollection;
};

/**
 * Validate that a URL uses http or https scheme only.
 */
const isValidHttpUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isLocalFilePath = (str) => !isValidHttpUrl(str) && typeof str === 'string' && str.length > 0;

/**
 * Get the directory where OpenAPI spec files are stored in AppData.
 */
const getSpecsDir = () => path.join(app.getPath('userData'), 'specs');

/**
 * Load the spec metadata file from AppData.
 * Returns an object mapping collectionPath → array of { filename, sourceUrl } entries.
 */
const loadSpecMetadata = () => {
  const metadataPath = path.join(getSpecsDir(), 'metadata.json');
  try {
    if (fs.existsSync(metadataPath)) {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }
  } catch {
    // ignore parse errors, return empty
  }
  return {};
};

/**
 * Save the spec metadata file to AppData.
 */
const saveSpecMetadata = (metadata) => {
  const specsDir = getSpecsDir();
  fsExtra.ensureDirSync(specsDir);
  const metadataPath = path.join(specsDir, 'metadata.json');
  const tmpPath = metadataPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(metadata, null, 2), 'utf8');
  fs.renameSync(tmpPath, metadataPath);
};

/**
 * Get all spec entries for a collection.
 */
const getSpecEntriesForCollection = (collectionPath) => {
  return loadSpecMetadata()[collectionPath] || [];
};

/**
 * Get the spec entry for a specific sourceUrl within a collection.
 */
const getSpecEntryForUrl = (collectionPath, sourceUrl) => {
  return getSpecEntriesForCollection(collectionPath).find((e) => e.sourceUrl === sourceUrl) || null;
};

/**
 * Parse a spec string (JSON or YAML) into an object.
 */
const parseSpec = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    return jsyaml.load(content);
  }
};

/**
 * Validate that a parsed spec object is a valid OpenAPI 3.x document.
 * Swagger 2.0 is not supported — the converter only handles OpenAPI 3.x.
 */
const isValidOpenApiSpec = (spec) => {
  if (!spec || typeof spec !== 'object') return false;
  if (spec.swagger) return false;
  if (spec.openapi && typeof spec.openapi === 'string' && spec.openapi.startsWith('3.')) {
    return spec.paths && typeof spec.paths === 'object';
  }
  return false;
};

/**
 * Fetch OpenAPI spec content from a remote URL or local file path.
 * Handles proxy/cert resolution for remote URLs.
 * Returns { content, spec } on success, or { error, errorCode? } on failure.
 */
const fetchSpecFromSource = async ({ collectionUid, collectionPath, sourceUrl, environmentContext = {} }) => {
  const { activeEnvironmentUid, environments = [], runtimeVariables = {}, globalEnvironmentVariables = {} } = environmentContext;

  if (!isValidHttpUrl(sourceUrl) && !isLocalFilePath(sourceUrl)) {
    return { error: 'Invalid source: only http/https URLs and local file paths are allowed' };
  }

  let content;

  if (isLocalFilePath(sourceUrl)) {
    const resolvedPath = collectionPath ? path.resolve(collectionPath, sourceUrl) : sourceUrl;
    if (!fs.existsSync(resolvedPath)) {
      return { error: `Spec file not found at: ${sourceUrl}`, errorCode: 'SOURCE_FILE_NOT_FOUND' };
    }
    content = fs.readFileSync(resolvedPath, 'utf8');
  } else {
    const cacheBustUrl = sourceUrl.includes('?')
      ? `${sourceUrl}&_=${Date.now()}`
      : `${sourceUrl}?_=${Date.now()}`;

    const environment = _.find(environments, (e) => e.uid === activeEnvironmentUid);
    const envVars = getEnvVars(environment);
    const processEnvVars = getProcessEnvVars(collectionUid);
    const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = await getCertsAndProxyConfig({
      collectionUid,
      collection: { promptVariables: {} },
      request: {},
      envVars,
      runtimeVariables,
      processEnvVars,
      collectionPath,
      globalEnvironmentVariables
    });
    const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });

    try {
      const response = await axiosInstance.get(cacheBustUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        timeout: 30000,
        transformResponse: [(data) => data]
      });
      content = response.data;
    } catch (fetchErr) {
      if (fetchErr.response) {
        return { error: `Failed to fetch spec: ${fetchErr.response.status} ${fetchErr.response.statusText}` };
      }
      const reason = fetchErr.code || fetchErr.cause?.code || fetchErr.name || 'unknown';
      return { error: `Could not reach ${sourceUrl} (${reason})` };
    }
  }

  const spec = parseSpec(content);
  return { content, spec };
};

/**
 * Normalize a Bruno request URL down to a comparable path.
 * Strips template variables ({{baseUrl}}), protocol/host, query params,
 * converts {param} to :param, collapses slashes, removes trailing slash.
 */
const normalizeUrlPath = (urlStr) => {
  if (!urlStr) return '';
  return urlStr
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\?.*$/, '')
    .replace(/{([^}]+)}/g, ':$1')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
};

/**
 * Load bruno config from disk. Returns { format, brunoConfig, collectionRoot }.
 * collectionRoot is only set for yml format collections.
 */
const loadBrunoConfig = (collectionPath) => {
  const format = getCollectionFormat(collectionPath);
  let brunoConfig;
  let collectionRoot;

  if (format === 'yml') {
    const configFilePath = path.join(collectionPath, 'opencollection.yml');
    if (!fs.existsSync(configFilePath)) {
      throw new Error('opencollection.yml not found');
    }
    const content = fs.readFileSync(configFilePath, 'utf8');
    const parsed = parseCollection(content, { format });
    brunoConfig = parsed.brunoConfig;
    collectionRoot = parsed.collectionRoot;
  } else {
    const brunoJsonPath = path.join(collectionPath, 'bruno.json');
    if (!fs.existsSync(brunoJsonPath)) {
      throw new Error('bruno.json not found');
    }
    brunoConfig = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));
  }

  return { format, brunoConfig, collectionRoot };
};

/**
 * Save bruno config to disk (bruno.json or opencollection.yml).
 */
const saveBrunoConfig = async (collectionPath, format, brunoConfig, collectionRoot) => {
  if (format === 'yml') {
    const content = await stringifyCollection(collectionRoot, brunoConfig, { format });
    await writeFile(path.join(collectionPath, 'opencollection.yml'), content);
  } else {
    const brunoJsonPath = path.join(collectionPath, 'bruno.json');
    await writeFile(brunoJsonPath, JSON.stringify(brunoConfig, null, 2));
  }
};

/**
 * Find a spec item in a Bruno collection tree by HTTP method and path.
 * Returns { item, folderName } or null.
 */
const findItemInCollection = (items, method, targetPath, currentFolderName = null) => {
  const normalizedTarget = normalizeUrlPath(targetPath);
  for (const item of items) {
    if (item.type === 'folder' && item.items) {
      const found = findItemInCollection(item.items, method, targetPath, item.name);
      if (found) return found;
    }
    if (item.request?.method?.toLowerCase() === method.toLowerCase()) {
      if (normalizeUrlPath(item.request.url) === normalizedTarget) {
        return { item, folderName: currentFolderName };
      }
    }
  }
  return null;
};

/**
 * Find an existing request file on disk by HTTP method and normalized path.
 * Scans .bru/.yml files in the collection directory recursively.
 * Returns { filePath, request, content, fileFormat } or null.
 */
const findRequestFileOnDisk = (dirPath, method, urlPath) => {
  if (!fs.existsSync(dirPath)) return null;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory() && !['node_modules', '.git', 'environments'].includes(file)) {
      const found = findRequestFileOnDisk(filePath, method, urlPath);
      if (found) return found;
    } else if (file.endsWith('.bru') || file.endsWith('.yml') || file.endsWith('.yaml')) {
      if (file.startsWith('folder.') || file.startsWith('collection.')) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileFormat = file.endsWith('.yml') || file.endsWith('.yaml') ? 'yml' : 'bru';
        const request = parseRequest(content, { format: fileFormat });
        if (request?.request) {
          const reqMethod = request.request.method?.toUpperCase();
          const reqPath = normalizeUrlPath(request.request.url);
          if (reqMethod === method && reqPath === urlPath) {
            return { filePath, request, content, fileFormat };
          }
        }
      } catch (err) {
        // Skip files that can't be parsed
      }
    }
  }
  return null;
};

/**
 * Save an OpenAPI spec file to AppData specs directory.
 * - Detects format (JSON/YAML) from the content and uses the correct file extension.
 * - Reuses an existing UUID filename if one exists for this sourceUrl, otherwise creates a new one.
 * - Updates metadata.json with the filename → sourceUrl mapping.
 *
 * @param {Object} params
 * @param {string} params.collectionPath - Path to the collection directory.
 * @param {string} params.content - The spec content string to save (JSON or YAML).
 * @param {string} params.sourceUrl - The source URL identifying which spec entry to update.
 */
const saveOpenApiSpecFile = async ({ collectionPath, content, sourceUrl }) => {
  const specsDir = getSpecsDir();
  await fsExtra.ensureDir(specsDir);

  const meta = loadSpecMetadata();
  const entries = meta[collectionPath] || [];
  const existingEntry = entries.find((e) => e.sourceUrl === sourceUrl);

  let filename;
  if (existingEntry) {
    // Reuse existing UUID filename
    filename = existingEntry.filename;
  } else {
    // Generate a new UUID filename based on content type
    const ext = isYamlContent(content) ? 'yaml' : 'json';
    filename = `${crypto.randomUUID()}.${ext}`;
    meta[collectionPath] = [...entries, { filename, sourceUrl }];
    saveSpecMetadata(meta);
  }

  await writeFile(path.join(specsDir, filename), content);
};

/**
 * Save an OpenAPI spec file and update sync metadata (lastSyncDate, specHash) in brunoConfig.
 * Shared by both the IPC handler (connect flow) and the import flow.
 */
const saveSpecAndUpdateMetadata = async ({ collectionPath, specContent, sourceUrl }) => {
  const { format, brunoConfig, collectionRoot } = loadBrunoConfig(collectionPath);

  await saveOpenApiSpecFile({ collectionPath, content: specContent, sourceUrl });

  let parsedSpec;
  try {
    parsedSpec = JSON.parse(specContent);
  } catch {
    parsedSpec = jsyaml.load(specContent);
  }

  const specHash = generateSpecHash(parsedSpec);
  const lastSyncDate = new Date().toISOString();
  const openapi = brunoConfig.openapi || [];
  const idx = openapi.findIndex((e) => e.sourceUrl === sourceUrl);
  if (idx !== -1) {
    openapi[idx] = { ...openapi[idx], lastSyncDate, specHash };
  } else {
    openapi.push({ sourceUrl, lastSyncDate, specHash });
  }
  brunoConfig.openapi = openapi;

  await saveBrunoConfig(collectionPath, format, brunoConfig, collectionRoot);
};

/**
 * Clean up stored spec files and metadata for a collection (called when a collection is removed).
 */
const cleanupSpecFilesForCollection = (collectionPath) => {
  const meta = loadSpecMetadata();
  const entries = meta[collectionPath] || [];
  for (const entry of entries) {
    const specPath = path.join(getSpecsDir(), entry.filename);
    if (fs.existsSync(specPath)) fs.unlinkSync(specPath);
  }
  if (entries.length > 0) {
    delete meta[collectionPath];
    saveSpecMetadata(meta);
  }
};

/**
 * Merge spec params/headers with existing user values.
 * Matches by name + value to correctly handle enum-expanded params (multiple entries with same name).
 * Only preserves the user's enabled state; values come from the spec.
 */
const mergeWithUserValues = (specItems, existingItems) => {
  return specItems?.map((specItem) => {
    const existing = (existingItems || []).find(
      (e) => e.name === specItem.name && e.value === specItem.value
    );
    return existing ? { ...specItem, enabled: existing.enabled } : specItem;
  });
};

/**
 * Merge a spec item into an existing request, preserving collection-specific data
 * (tests, scripts, assertions) and user values for matching params/headers.
 *
 * fullReset: true = spec replaces entire request section (reset mode)
 *            false = only override url/body/auth from spec (sync mode)
 */
const mergeSpecIntoRequest = (existingRequest, specItem, { fullReset = false } = {}) => {
  const mergedParams = mergeWithUserValues(specItem.request.params, existingRequest.request?.params);
  const mergedHeaders = mergeWithUserValues(specItem.request.headers, existingRequest.request?.headers);

  if (fullReset) {
    return {
      ...existingRequest,
      request: {
        ...specItem.request,
        params: mergedParams || [],
        headers: mergedHeaders || []
      }
    };
  }

  return {
    ...existingRequest,
    request: {
      ...existingRequest.request,
      url: specItem.request.url,
      body: specItem.request.body,
      auth: specItem.request.auth,
      params: mergedParams || existingRequest.request?.params || [],
      headers: mergedHeaders || existingRequest.request?.headers || []
    }
  };
};

/**
 * Ensure a tag-based folder exists in the collection directory.
 * Creates the folder and its folder.bru/folder.yml file if missing.
 * Returns the resolved target folder path (falls back to collectionPath on reserved/traversal names).
 */
const RESERVED_FOLDER_NAMES = ['node_modules', '.git', 'environments'];

const ensureTagFolder = async (collectionPath, folderName, format) => {
  const safeFolderName = sanitizeName(folderName);
  if (RESERVED_FOLDER_NAMES.some((r) => r.toLowerCase() === safeFolderName.toLowerCase())) {
    console.warn(`[OpenAPI Sync] Tag "${folderName}" sanitizes to reserved folder name "${safeFolderName}", placing requests in collection root`);
    return collectionPath;
  }
  const targetFolder = path.join(collectionPath, safeFolderName);
  if (!isPathInsideCollection(targetFolder, collectionPath)) {
    console.error(`[OpenAPI Sync] Path traversal blocked in folder name: ${folderName}`);
    return collectionPath;
  }
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
    const folderBruPath = path.join(targetFolder, `folder.${format}`);
    const folderContent = await stringifyFolder({ meta: { name: safeFolderName } }, { format });
    await writeFile(folderBruPath, folderContent);
  }
  return targetFolder;
};

/**
 * Flatten a Bruno collection's items into a Map keyed by endpoint ID (METHOD:normalizedPath).
 * Each value includes the original item plus the parent folderName.
 */
const buildSpecItemsMap = (collectionItems) => {
  const map = new Map();
  const flatten = (items, parentFolder = null) => {
    for (const item of items) {
      if (item.type === 'folder' && item.items) {
        flatten(item.items, item.name);
      } else if (item.request) {
        const method = item.request.method?.toUpperCase() || 'GET';
        const urlPath = normalizeUrlPath(item.request.url);
        const id = `${method}:${urlPath}`;
        map.set(id, { ...item, folderName: parentFolder });
      }
    }
  };
  flatten(collectionItems);
  return map;
};

/**
 * Load the stored spec for a collection and convert it to Bruno collection format.
 * Throws if no stored spec file exists.
 */
const loadStoredSpecCollection = (collectionPath, brunoConfig) => {
  const sourceUrl = brunoConfig?.openapi?.[0]?.sourceUrl;
  const specEntry = sourceUrl ? getSpecEntryForUrl(collectionPath, sourceUrl) : null;
  const specPath = specEntry ? path.join(getSpecsDir(), specEntry.filename) : null;

  if (!specPath || !fs.existsSync(specPath)) {
    throw new Error('No stored spec file found. Please sync with remote spec first.');
  }

  const specRaw = fs.readFileSync(specPath, 'utf8');
  const storedSpec = parseSpec(specRaw);
  const groupBy = brunoConfig?.openapi?.[0]?.groupBy || 'tags';
  return openApiToBruno(storedSpec, { groupBy });
};

const registerOpenAPISyncIpc = (mainWindow) => {
  ipcMain.handle('renderer:check-openapi-updates', async (event, {
    collectionUid, collectionPath, sourceUrl, storedSpecHash, environmentContext
  }) => {
    try {
      const result = await fetchSpecFromSource({ collectionUid, collectionPath, sourceUrl, environmentContext });
      if (result.error) {
        return { hasUpdates: false, error: result.error, errorCode: result.errorCode };
      }
      const remoteSpecHash = generateSpecHash(result.spec);
      return { hasUpdates: storedSpecHash !== remoteSpecHash, remoteSpecHash };
    } catch (error) {
      console.error('[OpenAPI Sync] Lightweight check error:', error.message);
      return { hasUpdates: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:compare-openapi-specs', async (event, {
    collectionUid, collectionPath, sourceUrl, environmentContext
  }) => {
    try {
      // Get the title/name from the spec
      const getSpecTitle = (spec) => {
        return spec?.info?.title || null;
      };

      const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

      const normalizePath = (pathStr) => {
        return pathStr
          .replace(/{([^}]+)}/g, ':$1')
          .replace(/\/+/g, '/')
          .replace(/\/$/, '');
      };

      const extractEndpoints = (spec) => {
        const endpoints = [];
        if (!spec || !spec.paths) return endpoints;

        // Get base URL from servers
        const baseUrl = spec.servers?.[0]?.url || '';

        Object.entries(spec.paths).forEach(([pathStr, methods]) => {
          if (!methods || typeof methods !== 'object') return;

          Object.entries(methods).forEach(([method, operation]) => {
            if (!HTTP_METHODS.includes(method.toLowerCase())) return;

            // Extract parameters
            const parameters = operation?.parameters || [];
            const pathParams = parameters.filter((p) => p.in === 'path');
            const queryParams = parameters.filter((p) => p.in === 'query');
            const headerParams = parameters.filter((p) => p.in === 'header');

            // Extract request body
            const requestBody = operation?.requestBody;
            const bodyContent = requestBody?.content;
            const bodySchema = bodyContent?.['application/json']?.schema
              || bodyContent?.['application/x-www-form-urlencoded']?.schema
              || bodyContent?.['multipart/form-data']?.schema;
            const bodyExample = bodyContent?.['application/json']?.example
              || bodyContent?.['application/json']?.examples;

            // Extract responses
            const responses = operation?.responses || {};

            endpoints.push({
              id: `${method.toUpperCase()}:${normalizePath(pathStr)}`,
              method: method.toUpperCase(),
              path: pathStr,
              normalizedPath: normalizePath(pathStr),
              operationId: operation?.operationId || null,
              summary: operation?.summary || null,
              description: operation?.description || null,
              tags: operation?.tags || [],
              deprecated: operation?.deprecated || false,
              // Detailed info for UI
              details: {
                parameters: {
                  path: pathParams,
                  query: queryParams,
                  header: headerParams
                },
                requestBody: requestBody ? {
                  required: requestBody.required || false,
                  contentType: Object.keys(bodyContent || {})[0] || null,
                  schema: bodySchema,
                  example: bodyExample
                } : null,
                responses: Object.entries(responses).map(([code, resp]) => ({
                  code,
                  description: resp.description,
                  schema: resp.content?.['application/json']?.schema
                }))
              },
              // Hash for comparison (MD5 for quick change detection)
              _hash: crypto.createHash('md5').update(JSON.stringify({
                parameters,
                requestBody: operation?.requestBody,
                responses: operation?.responses
              })).digest('hex')
            });
          });
        });

        return endpoints;
      };

      const compareSpecs = (oldSpec, newSpec) => {
        const oldEndpoints = extractEndpoints(oldSpec);
        const newEndpoints = extractEndpoints(newSpec);

        const oldEndpointMap = new Map(oldEndpoints.map((ep) => [ep.id, ep]));
        const newEndpointMap = new Map(newEndpoints.map((ep) => [ep.id, ep]));

        const added = [];
        const removed = [];
        const modified = [];
        const unchanged = [];

        newEndpoints.forEach((endpoint) => {
          if (!oldEndpointMap.has(endpoint.id)) {
            added.push(endpoint);
          } else {
            const oldEndpoint = oldEndpointMap.get(endpoint.id);
            // Check if endpoint was modified by comparing hashes
            if (oldEndpoint._hash !== endpoint._hash) {
              modified.push({
                ...endpoint,
                oldEndpoint: oldEndpoint
              });
            } else {
              unchanged.push(endpoint);
            }
          }
        });

        oldEndpoints.forEach((endpoint) => {
          if (!newEndpointMap.has(endpoint.id)) {
            removed.push(endpoint);
          }
        });

        // Compare metadata (title, version, description)
        const oldTitle = oldSpec?.info?.title || null;
        const newTitle = newSpec?.info?.title || null;
        const titleChanged = oldTitle !== newTitle;

        const oldVersion = oldSpec?.info?.version || null;
        const newVersion = newSpec?.info?.version || null;
        const versionChanged = oldVersion !== newVersion;

        const oldDescription = oldSpec?.info?.description || null;
        const newDescription = newSpec?.info?.description || null;
        const descriptionChanged = oldDescription !== newDescription;

        const metadataChanged = titleChanged || versionChanged || descriptionChanged;

        return {
          added,
          removed,
          modified,
          unchanged,
          // Metadata changes
          titleChanged,
          storedTitle: oldTitle,
          newTitle,
          versionChanged,
          storedVersion: oldVersion,
          newVersion,
          descriptionChanged,
          storedDescription: oldDescription,
          newDescription,
          metadataChanged,
          hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0 || metadataChanged
        };
      };

      const specEntry = getSpecEntryForUrl(collectionPath, sourceUrl);
      const storedSpecPath = specEntry ? path.join(getSpecsDir(), specEntry.filename) : null;

      let storedSpec = null;
      let storedContent = '';
      const storedSpecMissing = !storedSpecPath || !fs.existsSync(storedSpecPath);
      if (!storedSpecMissing) {
        storedContent = fs.readFileSync(storedSpecPath, 'utf8');
        storedSpec = parseSpec(storedContent);
      }

      const fetchResult = await fetchSpecFromSource({ collectionUid, collectionPath, sourceUrl, environmentContext });
      if (fetchResult.error) {
        return {
          isValid: false,
          error: fetchResult.error,
          errorCode: fetchResult.errorCode,
          storedSpec,
          storedSpecMissing
        };
      }

      const newSpecContent = fetchResult.content;
      const newSpec = fetchResult.spec;

      if (!isValidOpenApiSpec(newSpec)) {
        const error = newSpec?.swagger
          ? 'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.'
          : 'The source does not contain a valid OpenAPI 3.x specification';
        return {
          isValid: false,
          error,
          added: [],
          removed: [],
          unchanged: [],
          hasChanges: false
        };
      }

      // Check for title/name changes
      const storedTitle = getSpecTitle(storedSpec);
      const newTitle = getSpecTitle(newSpec);
      const titleChanged = storedSpec && storedTitle && newTitle && storedTitle !== newTitle;

      // Generate hashes for quick change detection
      const storedSpecHash = generateSpecHash(storedSpec);
      const remoteSpecHash = generateSpecHash(newSpec);
      const hasRemoteChanges = storedSpecHash !== remoteSpecHash;

      const diff = compareSpecs(storedSpec, newSpec);

      // Detect remote spec format and determine correct filename
      const remoteIsYaml = isYamlContent(newSpecContent);
      const correctSpecFilename = remoteIsYaml ? 'openapi.yaml' : 'openapi.json';

      // Generate unified diff for text diff view
      const { createTwoFilesPatch } = require('diff');
      const prettyStored = prettyPrintSpec(storedContent);
      const prettyNew = prettyPrintSpec(newSpecContent);
      const totalLines = Math.max(
        prettyStored.split('\n').length,
        prettyNew.split('\n').length
      );
      const unifiedDiff = createTwoFilesPatch(
        correctSpecFilename, correctSpecFilename,
        prettyStored, prettyNew,
        'Current Spec', 'New Spec',
        { context: totalLines }
      );

      return {
        ...diff,
        isValid: true,
        storedSpec,
        newSpec,
        newSpecContent,
        specFilename: correctSpecFilename,
        // Hash comparison for quick change detection
        hasRemoteChanges,
        storedSpecHash,
        remoteSpecHash,
        storedSpecMissing,
        // Metadata
        titleChanged,
        storedTitle,
        newTitle,
        // Text diff
        unifiedDiff
      };
    } catch (error) {
      console.error('Error comparing OpenAPI specs:', error);
      throw error;
    }
  });

  // Recursively extracts all key paths from a parsed JSON value (dot-notation).
  // Used to compare JSON body structure/schema without comparing values.
  const extractJsonKeys = (obj, prefix = '') => {
    const keys = [];
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        keys.push(...extractJsonKeys(obj[key], fullKey));
      }
    } else if (Array.isArray(obj) && obj.length > 0) {
      // Only inspect first element (spec arrays always have one template item)
      keys.push(...extractJsonKeys(obj[0], `${prefix}[]`));
    }
    return keys;
  };

  // Collection Drift Detection - compare stored spec (converted to bru) vs actual .bru files
  ipcMain.handle('renderer:get-collection-drift', async (event, { collectionPath, brunoConfig: passedBrunoConfig, compareSpec }) => {
    try {
      // Use passed brunoConfig if available, otherwise read from disk
      let brunoConfig;
      if (passedBrunoConfig) {
        brunoConfig = passedBrunoConfig;
      } else {
        try {
          ({ brunoConfig } = loadBrunoConfig(collectionPath));
        } catch (err) {
          return { error: err.message };
        }
      }

      // Load spec to compare against — use compareSpec if provided, otherwise read stored spec from disk
      let specToCompare;
      const groupBy = brunoConfig?.openapi?.[0]?.groupBy || 'tags';

      if (compareSpec) {
        specToCompare = compareSpec;
      } else {
        const driftSourceUrl = brunoConfig?.openapi?.[0]?.sourceUrl;
        const driftSpecEntry = driftSourceUrl ? getSpecEntryForUrl(collectionPath, driftSourceUrl) : null;
        const storedSpecPath = driftSpecEntry ? path.join(getSpecsDir(), driftSpecEntry.filename) : null;

        if (!storedSpecPath || !fs.existsSync(storedSpecPath)) {
          return {
            error: null,
            noStoredSpec: true,
            inSync: [],
            modified: [],
            localOnly: [],
            missing: [],
            specEndpointCount: 0,
            collectionEndpointCount: 0
          };
        }

        const storedContent = fs.readFileSync(storedSpecPath, 'utf8');
        specToCompare = parseSpec(storedContent);
      }

      // Convert spec to Bruno collection format
      const specAsCollection = openApiToBruno(specToCompare, { groupBy });

      // Build map of expected items by endpoint ID (method:path)
      const specItems = buildSpecItemsMap(specAsCollection.items || []);

      // Scan and parse collection endpoints from disk
      const scanCollectionFiles = (dirPath, relativePath = '') => {
        const files = [];
        if (!fs.existsSync(dirPath)) return files;
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry);
          const relPath = relativePath ? path.join(relativePath, entry) : entry;
          if (['node_modules', '.git', 'environments'].includes(entry)) continue;
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            files.push(...scanCollectionFiles(fullPath, relPath));
          } else if ((entry.endsWith('.bru') || entry.endsWith('.yml') || entry.endsWith('.yaml'))
            && !entry.startsWith('folder.') && !entry.startsWith('collection.') && !entry.startsWith('opencollection.')) {
            files.push({ fullPath, relativePath: relPath });
          }
        }
        return files;
      };

      const collectionFiles = scanCollectionFiles(collectionPath);
      const collectionEndpoints = [];
      for (const { fullPath, relativePath } of collectionFiles) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const fileFormat = fullPath.endsWith('.yml') || fullPath.endsWith('.yaml') ? 'yml' : 'bru';
          const parsed = parseRequest(content, { format: fileFormat });
          if (!parsed?.request) continue;
          collectionEndpoints.push({
            fullPath,
            relativePath,
            request: parsed.request,
            name: parsed.meta?.name || parsed.name || path.basename(fullPath)
          });
        } catch (err) {
          console.error(`[Collection Drift] Error parsing ${fullPath}:`, err.message);
        }
      }

      // Compare each collection endpoint against spec
      const result = {
        inSync: [],
        modified: [],
        localOnly: [],
        missing: []
      };

      const foundEndpointIds = new Set();

      for (const { fullPath, relativePath, request: actualRequest, name: itemName } of collectionEndpoints) {
        const method = actualRequest.method?.toUpperCase() || 'GET';
        const urlPath = normalizeUrlPath(actualRequest.url);
        const id = `${method}:${urlPath}`;

        foundEndpointIds.add(id);

        const specItem = specItems.get(id);
        if (!specItem) {
          // Endpoint exists in collection but not in spec
          result.localOnly.push({
            id,
            method,
            path: urlPath,
            filePath: relativePath,
            pathname: fullPath,
            name: itemName
          });
        } else {
          // Compare key fields to detect drift
          const specRequest = specItem.request;

          // Compare parameters by name:type pairs (catches query<->path type changes)
          const specParamKeys = (specRequest.params || []).map((p) => `${p.name}:${p.type || 'query'}`).sort();
          const actualParamKeys = (actualRequest.params || []).map((p) => `${p.name}:${p.type || 'query'}`).sort();

          // Compare headers (by name)
          const specHeaderNames = (specRequest.headers || []).map((h) => h.name).sort();
          const actualHeaderNames = (actualRequest.headers || []).map((h) => h.name).sort();

          // Check for differences
          const paramsDiff = JSON.stringify(specParamKeys) !== JSON.stringify(actualParamKeys);
          const headersDiff = JSON.stringify(specHeaderNames) !== JSON.stringify(actualHeaderNames);

          // Check body mode difference
          const specBodyMode = specRequest.body?.mode || 'none';
          const actualBodyMode = actualRequest.body?.mode || 'none';
          const bodyDiff = specBodyMode !== actualBodyMode;

          // Check auth mode difference
          const specAuthMode = specRequest.auth?.mode || 'none';
          const actualAuthMode = actualRequest.auth?.mode || 'none';
          const authDiff = specAuthMode !== actualAuthMode;

          // Check auth config differences when auth modes match
          let authConfigDiff = false;
          if (!authDiff && specAuthMode !== 'none' && specAuthMode !== 'inherit') {
            if (specAuthMode === 'apikey') {
              const specApikey = specRequest.auth?.apikey || {};
              const actualApikey = actualRequest.auth?.apikey || {};
              authConfigDiff = specApikey.key !== actualApikey.key || specApikey.placement !== actualApikey.placement;
            } else if (specAuthMode === 'oauth2') {
              const specOauth2 = specRequest.auth?.oauth2 || {};
              const actualOauth2 = actualRequest.auth?.oauth2 || {};
              const grantType = specOauth2.grantType || actualOauth2.grantType;
              const commonFields = ['grantType', 'scope'];
              const grantTypeFields = {
                authorization_code: [...commonFields, 'authorizationUrl', 'accessTokenUrl'],
                implicit: [...commonFields, 'authorizationUrl'],
                password: [...commonFields, 'accessTokenUrl'],
                client_credentials: [...commonFields, 'accessTokenUrl']
              };
              const fields = grantTypeFields[grantType] || commonFields;
              authConfigDiff = fields.some((field) => specOauth2[field] !== actualOauth2[field]);
            }
          }

          // Check form field names when body modes match and mode is form-based
          let formFieldsDiff = false;
          let specFormFieldNames = [];
          let actualFormFieldNames = [];
          if (!bodyDiff && (specBodyMode === 'formUrlEncoded' || specBodyMode === 'multipartForm')) {
            if (specBodyMode === 'multipartForm') {
              // For multipartForm, compare name:type pairs to catch text<->file changes
              specFormFieldNames = (specRequest.body?.multipartForm || []).map((f) => `${f.name}:${f.type || 'text'}`).sort();
              actualFormFieldNames = (actualRequest.body?.multipartForm || []).map((f) => `${f.name}:${f.type || 'text'}`).sort();
            } else {
              // For formUrlEncoded, all fields are text — compare by name only
              specFormFieldNames = (specRequest.body?.formUrlEncoded || []).map((f) => f.name).sort();
              actualFormFieldNames = (actualRequest.body?.formUrlEncoded || []).map((f) => f.name).sort();
            }
            formFieldsDiff = JSON.stringify(specFormFieldNames) !== JSON.stringify(actualFormFieldNames);
          }

          // Check JSON body structure when both sides use json mode
          let jsonBodyDiff = false;
          if (!bodyDiff && specBodyMode === 'json') {
            try {
              const specJson = specRequest.body?.json ? JSON.parse(specRequest.body.json) : null;
              const actualJson = actualRequest.body?.json ? JSON.parse(actualRequest.body.json) : null;
              if (specJson !== null && actualJson !== null) {
                const specKeys = extractJsonKeys(specJson).sort();
                const actualKeys = extractJsonKeys(actualJson).sort();
                jsonBodyDiff = JSON.stringify(specKeys) !== JSON.stringify(actualKeys);
              } else if ((specJson === null) !== (actualJson === null)) {
                jsonBodyDiff = true;
              }
            } catch (e) {
              // Malformed JSON — skip structural comparison
            }
          }

          if (paramsDiff || headersDiff || bodyDiff || authDiff || authConfigDiff || formFieldsDiff || jsonBodyDiff) {
            const changes = [];
            if (paramsDiff) {
              const addedParams = actualParamKeys.filter((p) => !specParamKeys.includes(p));
              const removedParams = specParamKeys.filter((p) => !actualParamKeys.includes(p));
              if (addedParams.length) changes.push(`+${addedParams.length} params`);
              if (removedParams.length) changes.push(`-${removedParams.length} params`);
            }
            if (headersDiff) {
              const addedHeaders = actualHeaderNames.filter((h) => !specHeaderNames.includes(h));
              const removedHeaders = specHeaderNames.filter((h) => !actualHeaderNames.includes(h));
              if (addedHeaders.length) changes.push(`+${addedHeaders.length} headers`);
              if (removedHeaders.length) changes.push(`-${removedHeaders.length} headers`);
            }
            if (bodyDiff) changes.push(`body: ${actualBodyMode}`);
            if (authDiff) changes.push(`auth: ${actualAuthMode}`);
            if (authConfigDiff) changes.push('auth config');
            if (formFieldsDiff) {
              const addedFields = actualFormFieldNames.filter((f) => !specFormFieldNames.includes(f));
              const removedFields = specFormFieldNames.filter((f) => !actualFormFieldNames.includes(f));
              if (addedFields.length) changes.push(`+${addedFields.length} form fields`);
              if (removedFields.length) changes.push(`-${removedFields.length} form fields`);
            }
            if (jsonBodyDiff) changes.push('body schema');

            result.modified.push({
              id,
              method,
              path: urlPath,
              filePath: relativePath,
              pathname: fullPath,
              name: itemName,
              changes: changes.join(', '),
              actualRequest: { request: actualRequest },
              specItem
            });
          } else {
            result.inSync.push({
              id,
              method,
              path: urlPath,
              filePath: relativePath,
              pathname: fullPath,
              name: itemName
            });
          }
        }
      }

      // Find endpoints in spec but missing from collection
      for (const [id, specItem] of specItems) {
        if (!foundEndpointIds.has(id)) {
          // Split only on first colon to preserve :param in paths
          const colonIndex = id.indexOf(':');
          const method = id.substring(0, colonIndex);
          const urlPath = id.substring(colonIndex + 1);
          result.missing.push({
            id,
            method,
            path: urlPath,
            name: specItem.name || specItem.request?.url || id
          });
        }
      }

      return {
        error: null,
        noStoredSpec: false,
        ...result,
        specEndpointCount: specItems.size,
        collectionEndpointCount: collectionEndpoints.length
      };
    } catch (error) {
      console.error('Error getting collection drift:', error);
      throw error;
    }
  });

  // Get endpoint diff data for visual comparison (spec vs collection)
  ipcMain.handle('renderer:get-endpoint-diff-data', async (event, { collectionPath, endpointId, newSpec }) => {
    try {
      let brunoConfig;
      try {
        ({ brunoConfig } = loadBrunoConfig(collectionPath));
      } catch (err) {
        return { error: err.message };
      }

      // Parse endpoint ID (format: "METHOD:path")
      const [method, ...pathParts] = endpointId.split(':');
      const endpointPath = pathParts.join(':'); // Rejoin in case path contains ':'

      // Get spec to use (new spec if provided, otherwise stored spec)
      let specToUse = newSpec;
      if (!specToUse) {
        const diffSourceUrl = brunoConfig?.openapi?.[0]?.sourceUrl;
        const diffSpecEntry = diffSourceUrl ? getSpecEntryForUrl(collectionPath, diffSourceUrl) : null;
        const storedSpecPath = diffSpecEntry ? path.join(getSpecsDir(), diffSpecEntry.filename) : null;
        if (storedSpecPath && fs.existsSync(storedSpecPath)) {
          const content = fs.readFileSync(storedSpecPath, 'utf8');
          specToUse = parseSpec(content);
        }
      }

      if (!specToUse) {
        return { error: 'No spec available' };
      }

      // Convert spec to Bruno collection format
      const groupBy = brunoConfig?.openapi?.[0]?.groupBy || 'tags';
      const specAsCollection = openApiToBruno(specToUse, { groupBy });

      // Find the spec item for this endpoint
      const specItem = findItemInCollection(specAsCollection.items || [], method, endpointPath)?.item || null;

      // Find the actual collection file for this endpoint
      const actualFile = findRequestFileOnDisk(collectionPath, method.toUpperCase(), endpointPath);
      const actualRequest = actualFile?.request || null;

      // Transform to visual diff format (matching what VisualDiffViewer rendering components expect)
      // Components like VisualDiffUrlBar, VisualDiffParams, etc. read from data.request.*
      const transformToVisualFormat = (item) => {
        if (!item) return null;
        const req = item.request || item;
        // Strip query string from URL - params are shown in the separate Parameters section
        const urlWithoutQuery = (req.url || '').split('?')[0];

        // Normalize params/headers to only include fields relevant for comparison.
        // Different sources (openApiToBruno vs parseRequest) include different metadata
        // fields (uid, description) which cause false positives in isEqual comparisons.
        const normalizeParams = (params) => (params || []).map((p) => ({
          name: p.name,
          value: p.value,
          enabled: p.enabled !== false,
          type: p.type
        }));
        const normalizeHeaders = (headers) => (headers || []).map((h) => ({
          name: h.name,
          value: h.value,
          enabled: h.enabled !== false
        }));

        return {
          name: item.name || item.meta?.name,
          type: item.type,
          request: {
            method: req.method,
            url: urlWithoutQuery,
            params: normalizeParams(req.params),
            headers: normalizeHeaders(req.headers),
            body: req.body || {},
            auth: req.auth || {},
            vars: item.vars || req.vars || {},
            assertions: item.assertions || req.assertions || [],
            script: item.script || req.script || {},
            tests: item.tests || req.tests || '',
            docs: item.docs || req.docs || ''
          }
        };
      };

      return {
        error: null,
        // oldData = current collection state, newData = expected from spec
        oldData: transformToVisualFormat(actualRequest),
        newData: transformToVisualFormat(specItem)
      };
    } catch (error) {
      console.error('Error getting endpoint diff data:', error);
      return { error: error.message };
    }
  });

  // Sync modes: 'spec-only' | 'reset' | 'sync' (default)
  ipcMain.handle('renderer:apply-openapi-sync', async (event, { collectionPath, sourceUrl, addNewRequests, removeDeletedRequests, diff, localOnlyToRemove = [], driftedToReset = [], mode = 'sync', endpointDecisions = {} }) => {
    try {
      const { format, brunoConfig, collectionRoot } = loadBrunoConfig(collectionPath);

      // Mode: spec-only - Just save the spec, don't touch collection
      if (mode === 'spec-only') {
        if (diff.newSpec && typeof diff.newSpec === 'object') {
          const specContent = diff.newSpecContent || JSON.stringify(diff.newSpec, null, 2);
          await saveOpenApiSpecFile({ collectionPath, content: specContent, sourceUrl });
        }

        // Update sync metadata
        const openapi = brunoConfig.openapi || [];
        const specOnlyIdx = openapi.findIndex((e) => e.sourceUrl === sourceUrl);
        if (specOnlyIdx !== -1) {
          openapi[specOnlyIdx] = {
            ...openapi[specOnlyIdx],
            lastSyncDate: new Date().toISOString(),
            specHash: generateSpecHash(diff.newSpec)
          };
        }
        brunoConfig.openapi = openapi;

        await saveBrunoConfig(collectionPath, format, brunoConfig, collectionRoot);

        return { success: true, mode: 'spec-only' };
      }

      // Mode: reset - Save spec and reset all endpoints to spec (preserve tests/scripts)
      if (mode === 'reset' && diff.newSpec) {
        const openapiEntryReset = (brunoConfig.openapi || []).find((e) => e.sourceUrl === sourceUrl);
        const groupBy = openapiEntryReset?.groupBy || 'tags';
        const newCollection = openApiToBruno(diff.newSpec, { groupBy });

        // Build map of spec items by endpoint ID
        const specItemsMap = buildSpecItemsMap(newCollection.items || []);

        // Find and update existing .bru files
        const findAndResetRequest = async (dirPath) => {
          if (!fs.existsSync(dirPath)) return;

          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory() && !['node_modules', '.git', 'environments'].includes(file)) {
              await findAndResetRequest(filePath);
            } else if ((file.endsWith('.bru') || file.endsWith('.yml') || file.endsWith('.yaml'))
              && !file.startsWith('folder.') && !file.startsWith('collection.')) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const fileFormat = file.endsWith('.yml') || file.endsWith('.yaml') ? 'yml' : 'bru';
                const existingRequest = parseRequest(content, { format: fileFormat });

                if (existingRequest?.request) {
                  const method = existingRequest.request.method?.toUpperCase() || 'GET';
                  const urlPath = normalizeUrlPath(existingRequest.request.url);
                  const id = `${method}:${urlPath}`;

                  const specItem = specItemsMap.get(id);
                  if (specItem) {
                    const mergedRequest = mergeSpecIntoRequest(existingRequest, specItem, { fullReset: true });
                    const newContent = await stringifyRequestViaWorker(mergedRequest, { format: fileFormat });
                    await writeFile(filePath, newContent);

                    // Mark as processed
                    specItemsMap.delete(id);
                  }
                }
              } catch (err) {
                console.error(`Error resetting file ${filePath}:`, err);
              }
            }
          }
        };

        await findAndResetRequest(collectionPath);

        // Create missing endpoints from spec
        for (const [, specItem] of specItemsMap) {
          let targetFolder = collectionPath;
          if (specItem.folderName && groupBy === 'tags') {
            targetFolder = await ensureTagFolder(collectionPath, specItem.folderName, format);
          }

          const requestContent = await stringifyRequestViaWorker(specItem, { format });
          const sanitizedFilename = `${sanitizeName(specItem.name || path.basename(specItem.filename || '', `.${format}`))}.${format}`;
          await writeFile(path.join(targetFolder, sanitizedFilename), requestContent);
        }

        // Save spec in original format
        const specContent = diff.newSpecContent || JSON.stringify(diff.newSpec, null, 2);
        await saveOpenApiSpecFile({ collectionPath, content: specContent, sourceUrl });

        // Update sync metadata
        const openapiReset = brunoConfig.openapi || [];
        const resetIdx = openapiReset.findIndex((e) => e.sourceUrl === sourceUrl);
        if (resetIdx !== -1) {
          openapiReset[resetIdx] = {
            ...openapiReset[resetIdx],
            lastSyncDate: new Date().toISOString(),
            specHash: generateSpecHash(diff.newSpec)
          };
        }
        brunoConfig.openapi = openapiReset;

        await saveBrunoConfig(collectionPath, format, brunoConfig, collectionRoot);

        return { success: true, mode: 'reset' };
      }

      // Mode: sync (default) — compute shared values once
      const syncEntry = (brunoConfig.openapi || []).find((e) => e.sourceUrl === sourceUrl);
      const groupBy = syncEntry?.groupBy || 'tags';
      let newCollection;
      if (diff.newSpec) {
        try {
          newCollection = openApiToBruno(diff.newSpec, { groupBy });
        } catch (err) {
          console.error('[OpenAPI Sync] Error converting spec:', err);
        }
      }

      // Remove endpoints before adding new ones to avoid filename collisions
      // (e.g., when a path is renamed but the summary stays the same, both generate the same filename)
      if (removeDeletedRequests && diff.removed?.length > 0) {
        const findAndRemoveRequest = (dirPath) => {
          if (!fs.existsSync(dirPath)) return;

          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory() && !['node_modules', '.git', 'environments'].includes(file)) {
              findAndRemoveRequest(filePath);
            } else if ((file.endsWith('.bru') || file.endsWith('.yml') || file.endsWith('.yaml'))
              && !file.startsWith('folder.') && !file.startsWith('collection.')) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const request = parseRequest(content, { format: file.endsWith('.yml') || file.endsWith('.yaml') ? 'yml' : 'bru' });

                if (request?.request) {
                  const method = request.request.method?.toUpperCase();
                  const url = normalizeUrlPath(request.request.url);

                  if (!isPathInsideCollection(filePath, collectionPath)) {
                    console.error(`[OpenAPI Sync] Path traversal blocked: ${filePath}`);
                  } else {
                    for (const removed of diff.removed) {
                      const removedPath = normalizeUrlPath(removed.path);
                      if (method === removed.method.toUpperCase() && url === removedPath) {
                        fs.unlinkSync(filePath);
                        break;
                      }
                    }
                  }
                }
              } catch (err) {
                console.error(`Error parsing file ${filePath}:`, err);
              }
            }
          }
        };

        findAndRemoveRequest(collectionPath);
      }

      // Remove local-only endpoints (endpoints in collection but not in spec)
      // Verify file content before deleting — the file may have been modified by the user
      // between the drift scan and sync execution, making the pre-computed filePath stale.
      if (localOnlyToRemove?.length > 0) {
        for (const endpoint of localOnlyToRemove) {
          if (endpoint.filePath) {
            const fullPath = path.resolve(collectionPath, endpoint.filePath);
            if (!isPathInsideCollection(fullPath, collectionPath)) {
              console.error(`[OpenAPI Sync] Path traversal blocked in localOnlyToRemove: ${endpoint.filePath}`);
              continue;
            }
            if (fs.existsSync(fullPath)) {
              try {
                const fileFormat = fullPath.endsWith('.yml') || fullPath.endsWith('.yaml') ? 'yml' : 'bru';
                const content = fs.readFileSync(fullPath, 'utf8');
                const parsed = parseRequest(content, { format: fileFormat });
                if (parsed?.request) {
                  const fileMethod = parsed.request.method?.toUpperCase();
                  const fileUrlPath = normalizeUrlPath(parsed.request.url);
                  if (fileMethod === endpoint.method && fileUrlPath === endpoint.path) {
                    fs.unlinkSync(fullPath);
                  }
                }
              } catch (err) {
                console.error(`[OpenAPI Sync] Error verifying file before removal ${endpoint.filePath}:`, err);
              }
            }
          }
        }
      }

      if (addNewRequests && diff.added?.length > 0 && newCollection) {
        for (const endpoint of diff.added) {
          const normalizedPath = normalizeUrlPath(endpoint.path);
          const result = findItemInCollection(newCollection.items, endpoint.method, endpoint.path);
          const newItem = result?.item;

          if (newItem) {
            // Check if endpoint already exists in collection (prevents overwriting user customizations)
            const existingFile = findRequestFileOnDisk(collectionPath, endpoint.method.toUpperCase(), normalizedPath);

            if (existingFile) {
              const mergedRequest = mergeSpecIntoRequest(existingFile.request, newItem);
              const content = await stringifyRequestViaWorker(mergedRequest, { format: existingFile.fileFormat });
              await writeFile(existingFile.filePath, content);
            } else {
              // Truly new — create file in the appropriate folder
              let targetFolder = collectionPath;
              if (result.folderName && groupBy === 'tags') {
                targetFolder = await ensureTagFolder(collectionPath, result.folderName, format);
              }

              const requestContent = await stringifyRequestViaWorker(newItem, { format });
              const sanitizedFilename = `${sanitizeName(newItem.name || path.basename(newItem.filename || '', `.${format}`))}.${format}`;
              await writeFile(path.join(targetFolder, sanitizedFilename), requestContent);
            }
          }
        }
      }

      // Handle modified endpoints with conflict resolutions
      // endpointDecisions: { endpointId: 'keep-mine' | 'accept-incoming' }
      // Only apply changes for endpoints marked as 'accept-incoming' or not in decisions (default: apply)
      if (diff.modified?.length > 0 && newCollection) {
        for (const endpoint of diff.modified) {
          // Check if user chose to keep their version
          const endpointId = endpoint.id || `${endpoint.method.toUpperCase()}:${normalizeUrlPath(endpoint.path)}`;
          const decision = endpointDecisions[endpointId];
          if (decision === 'keep-mine') {
            continue;
          }

          // Apply incoming changes for this endpoint
          const normalizedPath = normalizeUrlPath(endpoint.path);
          const result = findItemInCollection(newCollection.items, endpoint.method, endpoint.path);
          const newItem = result?.item;
          const existingFile = findRequestFileOnDisk(collectionPath, endpoint.method.toUpperCase(), normalizedPath);

          if (newItem && existingFile) {
            const mergedRequest = mergeSpecIntoRequest(existingFile.request, newItem);
            const content = await stringifyRequestViaWorker(mergedRequest, { format: existingFile.fileFormat });
            await writeFile(existingFile.filePath, content);
          }
        }
      }

      // Handle drifted endpoints to reset (collection differs from stored spec)
      // These are endpoints where user chose 'accept-incoming' to reset to spec
      if (driftedToReset?.length > 0) {
        // Reuse newCollection if available, otherwise fall back to stored spec
        let driftCollection = newCollection;
        if (!driftCollection) {
          const applySpecEntry = getSpecEntryForUrl(collectionPath, sourceUrl);
          const storedSpecPath = applySpecEntry ? path.join(getSpecsDir(), applySpecEntry.filename) : null;
          if (storedSpecPath && fs.existsSync(storedSpecPath)) {
            try {
              driftCollection = openApiToBruno(parseSpec(fs.readFileSync(storedSpecPath, 'utf8')), { groupBy });
            } catch (err) {
              console.error('[OpenAPI Sync] Error converting stored spec for drift reset:', err);
            }
          }
        }

        if (driftCollection) {
          const specItemsMap = buildSpecItemsMap(driftCollection.items || []);

          for (const endpoint of driftedToReset) {
            const specItem = specItemsMap.get(endpoint.id);
            if (!specItem) {
              continue;
            }

            if (endpoint.filePath) {
              const fullPath = path.resolve(collectionPath, endpoint.filePath);
              if (!isPathInsideCollection(fullPath, collectionPath)) {
                console.error(`[OpenAPI Sync] Path traversal blocked in driftedToReset: ${endpoint.filePath}`);
                continue;
              }
              if (fs.existsSync(fullPath)) {
                try {
                  const fileFormat = fullPath.endsWith('.yml') || fullPath.endsWith('.yaml') ? 'yml' : 'bru';
                  const existingContent = fs.readFileSync(fullPath, 'utf8');
                  const existingRequest = parseRequest(existingContent, { format: fileFormat });
                  const mergedRequest = mergeSpecIntoRequest(existingRequest, specItem, { fullReset: true });
                  const content = await stringifyRequestViaWorker(mergedRequest, { format: fileFormat });
                  await writeFile(fullPath, content);
                } catch (err) {
                  console.error(`[OpenAPI Sync] Error resetting drifted endpoint ${endpoint.id}:`, err);
                }
              }
            }
          }
        }
      }

      // Save spec only if we have a valid spec
      if (diff.newSpec && typeof diff.newSpec === 'object') {
        const specContent = diff.newSpecContent || JSON.stringify(diff.newSpec, null, 2);
        await saveOpenApiSpecFile({ collectionPath, content: specContent, sourceUrl });
      }

      const openapiSync = brunoConfig.openapi || [];
      const syncIdx = openapiSync.findIndex((e) => e.sourceUrl === sourceUrl);
      if (syncIdx !== -1) {
        const updated = {
          ...openapiSync[syncIdx],
          lastSyncDate: new Date().toISOString()
        };
        // Only update specHash when we have a valid newSpec, otherwise preserve existing hash
        if (diff.newSpec) {
          updated.specHash = generateSpecHash(diff.newSpec);
        }
        openapiSync[syncIdx] = updated;
      }
      brunoConfig.openapi = openapiSync;

      await saveBrunoConfig(collectionPath, format, brunoConfig, collectionRoot);

      return { success: true };
    } catch (error) {
      console.error('Error applying OpenAPI sync:', error);
      throw error;
    }
  });

  // Update OpenAPI sync configuration (e.g., source URL)
  ipcMain.handle('renderer:update-openapi-sync-config', async (event, { collectionPath, oldSourceUrl, config }) => {
    try {
      const { format, brunoConfig, collectionRoot } = loadBrunoConfig(collectionPath);

      // Merge new config into existing entry (allowlist keys only)
      const allowedKeys = ['sourceUrl', 'groupBy', 'lastSyncDate', 'specHash', 'autoCheck', 'autoCheckInterval'];
      const sanitizedConfig = {};
      for (const key of allowedKeys) {
        if (key in config) {
          sanitizedConfig[key] = config[key];
        }
      }

      // sourceUrl is required — it identifies which entry to create/update
      if (!sanitizedConfig.sourceUrl) {
        throw new Error('sourceUrl is required to update openapi sync config');
      }

      // Validate sourceUrl — reject protocol-based non-http(s) URLs (e.g. ftp://, file://)
      if (sanitizedConfig.sourceUrl.includes('://') && !isValidHttpUrl(sanitizedConfig.sourceUrl)) {
        throw new Error('Invalid URL: only http and https URLs are allowed');
      }

      // Convert absolute local file paths to collection-relative (git-shareable)
      if (path.isAbsolute(sanitizedConfig.sourceUrl)) {
        sanitizedConfig.sourceUrl = path.relative(collectionPath, sanitizedConfig.sourceUrl);
      }

      // If sourceUrl is changing, remove the old entry and its metadata
      const openapi = brunoConfig.openapi || [];
      if (oldSourceUrl && oldSourceUrl !== sanitizedConfig.sourceUrl) {
        const filteredOpenapi = openapi.filter((e) => e.sourceUrl !== oldSourceUrl);
        brunoConfig.openapi = filteredOpenapi;
        // Clean up metadata entry for old sourceUrl (keep spec file for potential re-use)
        const meta = loadSpecMetadata();
        if (meta[collectionPath]) {
          meta[collectionPath] = meta[collectionPath].filter((e) => e.sourceUrl !== oldSourceUrl);
          if (meta[collectionPath].length === 0) delete meta[collectionPath];
          saveSpecMetadata(meta);
        }
      }

      // Apply defaults for new entries
      const updatedOpenapi = brunoConfig.openapi || [];
      const idx = updatedOpenapi.findIndex((e) => e.sourceUrl === sanitizedConfig.sourceUrl);
      const isNewEntry = idx === -1;
      if (isNewEntry) {
        if (!('autoCheck' in sanitizedConfig)) sanitizedConfig.autoCheck = true;
        if (!('autoCheckInterval' in sanitizedConfig)) sanitizedConfig.autoCheckInterval = 5;
        updatedOpenapi.push(sanitizedConfig);
      } else {
        updatedOpenapi[idx] = { ...updatedOpenapi[idx], ...sanitizedConfig };
      }
      brunoConfig.openapi = updatedOpenapi;

      // Save updated config
      await saveBrunoConfig(collectionPath, format, brunoConfig, collectionRoot);

      return { success: true };
    } catch (error) {
      console.error('Error updating OpenAPI sync config:', error);
      throw error;
    }
  });

  // Save OpenAPI spec file and update sync metadata (used by both connect and import flows)
  ipcMain.handle('renderer:save-openapi-spec', async (event, { collectionPath, specContent, sourceUrl }) => {
    try {
      await saveSpecAndUpdateMetadata({ collectionPath, specContent, sourceUrl });
      return { success: true };
    } catch (error) {
      console.error('Error saving OpenAPI spec file:', error);
      throw error;
    }
  });

  // Fetch OpenAPI spec content from a remote URL or local file path
  ipcMain.handle('renderer:fetch-openapi-spec', async (event, {
    collectionUid, collectionPath, sourceUrl, environmentContext
  }) => {
    try {
      const result = await fetchSpecFromSource({ collectionUid, collectionPath, sourceUrl, environmentContext });
      if (result.error) return { error: result.error, errorCode: result.errorCode };
      if (!isValidOpenApiSpec(result.spec)) {
        const error = result.spec?.swagger
          ? 'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.'
          : 'The source does not contain a valid OpenAPI 3.x specification';
        return { error };
      }
      return { content: result.content };
    } catch (error) {
      return { error: error.message || 'Failed to fetch spec' };
    }
  });

  // Read stored OpenAPI spec file from AppData
  ipcMain.handle('renderer:read-openapi-spec', async (event, { collectionPath, sourceUrl }) => {
    try {
      const entry = getSpecEntryForUrl(collectionPath, sourceUrl);
      if (!entry) return { error: 'Spec file not found' };
      const specPath = path.join(getSpecsDir(), entry.filename);
      if (!fs.existsSync(specPath)) return { error: 'Spec file not found' };
      return { content: fs.readFileSync(specPath, 'utf8') };
    } catch (error) {
      return { error: error.message || 'Failed to read spec file' };
    }
  });

  // Remove OpenAPI sync configuration (disconnect sync)
  ipcMain.handle('renderer:remove-openapi-sync-config', async (event, { collectionPath, sourceUrl, deleteSpecFile = false }) => {
    try {
      const { format, brunoConfig, collectionRoot } = loadBrunoConfig(collectionPath);

      // Remove matching openapi entry from config array
      if (brunoConfig.openapi?.length) {
        brunoConfig.openapi = brunoConfig.openapi.filter((e) => e.sourceUrl !== sourceUrl);
        if (brunoConfig.openapi.length === 0) {
          delete brunoConfig.openapi;
        }
      }

      // Save updated config
      await saveBrunoConfig(collectionPath, format, brunoConfig, collectionRoot);

      // Remove spec file from AppData if user opted in
      const meta = loadSpecMetadata();
      const entries = meta[collectionPath] || [];
      const entry = entries.find((e) => e.sourceUrl === sourceUrl);
      if (entry && deleteSpecFile) {
        const specPath = path.join(getSpecsDir(), entry.filename);
        if (fs.existsSync(specPath)) fs.unlinkSync(specPath);
      }
      meta[collectionPath] = entries.filter((e) => e.sourceUrl !== sourceUrl);
      if (meta[collectionPath].length === 0) delete meta[collectionPath];
      saveSpecMetadata(meta);

      return { success: true };
    } catch (error) {
      console.error('Error removing OpenAPI sync config:', error);
      throw error;
    }
  });

  // Add missing endpoints to collection (from stored spec)
  ipcMain.handle('renderer:add-missing-endpoints', async (event, { collectionPath, endpoints }) => {
    try {
      const { format, brunoConfig } = loadBrunoConfig(collectionPath);
      const groupBy = brunoConfig?.openapi?.[0]?.groupBy || 'tags';
      const specCollection = loadStoredSpecCollection(collectionPath, brunoConfig);

      let addedCount = 0;
      for (const endpoint of endpoints) {
        const result = findItemInCollection(specCollection.items, endpoint.method, endpoint.path);

        if (result) {
          const { item: specItem, folderName } = result;
          let targetFolder = collectionPath;

          // Use folder name from spec collection structure
          if (folderName && groupBy === 'tags') {
            targetFolder = await ensureTagFolder(collectionPath, folderName, format);
          }

          const requestContent = await stringifyRequestViaWorker(specItem, { format });
          const sanitizedFilename = `${sanitizeName(specItem.name || path.basename(specItem.filename || '', `.${format}`))}.${format}`;
          await writeFile(path.join(targetFolder, sanitizedFilename), requestContent);
          addedCount++;
        }
      }

      return { success: true, addedCount };
    } catch (error) {
      console.error('Error adding missing endpoints:', error);
      throw error;
    }
  });

  // Reset modified endpoints to match the spec
  ipcMain.handle('renderer:reset-endpoints-to-spec', async (event, { collectionPath, endpoints }) => {
    try {
      const { brunoConfig } = loadBrunoConfig(collectionPath);
      const specCollection = loadStoredSpecCollection(collectionPath, brunoConfig);

      let resetCount = 0;
      for (const endpoint of endpoints) {
        // Find the spec version of this endpoint
        const specItem = findItemInCollection(specCollection.items, endpoint.method, endpoint.path)?.item;

        if (specItem && endpoint.pathname) {
          if (!isPathInsideCollection(endpoint.pathname, collectionPath)) {
            console.error(`[OpenAPI Sync] Path traversal blocked in reset-endpoints: ${endpoint.pathname}`);
            continue;
          }

          try {
            const fileFormat = endpoint.pathname.endsWith('.yml') || endpoint.pathname.endsWith('.yaml') ? 'yml' : 'bru';
            const existingContent = fs.readFileSync(endpoint.pathname, 'utf8');
            const existingRequest = parseRequest(existingContent, { format: fileFormat });
            const mergedRequest = mergeSpecIntoRequest(existingRequest, specItem, { fullReset: true });
            const requestContent = await stringifyRequestViaWorker(mergedRequest, { format: fileFormat });
            await writeFile(endpoint.pathname, requestContent);
            resetCount++;
          } catch (err) {
            console.error(`[OpenAPI Sync] Error resetting endpoint ${endpoint.pathname}:`, err);
          }
        }
      }

      return { success: true, resetCount };
    } catch (error) {
      console.error('Error resetting endpoints to spec:', error);
      throw error;
    }
  });

  // Delete endpoints from collection
  ipcMain.handle('renderer:delete-endpoints', async (event, { collectionPath, endpoints }) => {
    try {
      let deletedCount = 0;

      for (const endpoint of endpoints) {
        if (endpoint.pathname && fs.existsSync(endpoint.pathname)) {
          if (!isPathInsideCollection(endpoint.pathname, collectionPath)) {
            console.error(`[OpenAPI Sync] Path traversal blocked in delete-endpoints: ${endpoint.pathname}`);
            continue;
          }
          fs.unlinkSync(endpoint.pathname);
          deletedCount++;
        }
      }

      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error deleting endpoints:', error);
      throw error;
    }
  });
};

module.exports = registerOpenAPISyncIpc;
module.exports.saveSpecAndUpdateMetadata = saveSpecAndUpdateMetadata;
module.exports.cleanupSpecFilesForCollection = cleanupSpecFilesForCollection;
