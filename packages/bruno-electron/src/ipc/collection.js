const _ = require('lodash');
const fs = require('fs');
const fsExtra = require('fs-extra');
const os = require('os');
const path = require('path');
const archiver = require('archiver');
const extractZip = require('extract-zip');
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const { ipcMain, shell, dialog, app } = require('electron');
const {
  parseRequest,
  stringifyRequest,
  parseRequestViaWorker,
  stringifyRequestViaWorker,
  parseCollection,
  stringifyCollection,
  parseFolder,
  stringifyFolder,
  stringifyEnvironment,
  parseEnvironment,
  DEFAULT_COLLECTION_FORMAT
} = require('@usebruno/filestore');
const { dotenvToJson } = require('@usebruno/lang');
const brunoConverters = require('@usebruno/converters');
const { postmanToBruno, diffSpecs, openApiToBruno } = brunoConverters;
const { cookiesStore } = require('../store/cookies');
const { parseLargeRequestWithRedaction } = require('../utils/parse');
const { wsClient } = require('../ipc/network/ws-event-handlers');
const { hasSubDirectories } = require('../utils/filesystem');

const {
  DEFAULT_GITIGNORE,
  writeFile,
  hasBruExtension,
  isDirectory,
  createDirectory,
  sanitizeName,
  isWSLPath,
  safeToRename,
  isWindowsOS,
  hasRequestExtension,
  getCollectionFormat,
  searchForRequestFiles,
  validateName,
  getCollectionStats,
  sizeInMB,
  safeWriteFileSync,
  copyPath,
  removePath,
  getPaths,
  generateUniqueName,
  isDotEnvFile,
  isValidDotEnvFilename,
  isBrunoConfigFile,
  isBruEnvironmentConfig,
  isCollectionRootBruFile,
  scanForBrunoFiles
} = require('../utils/filesystem');
const { openCollectionDialog, openCollectionsByPathname, registerScratchCollectionPath } = require('../app/collections');
const { generateUidBasedOnHash, stringifyJson, safeStringifyJSON, safeParseJSON } = require('../utils/common');
const { moveRequestUid, deleteRequestUid, syncExampleUidsCache } = require('../cache/requestUids');
const { deleteCookiesForDomain, getDomainsWithCookies, addCookieForDomain, modifyCookieForDomain, parseCookieString, createCookieString, deleteCookie } = require('../utils/cookies');
const EnvironmentSecretsStore = require('../store/env-secrets');
const CollectionSecurityStore = require('../store/collection-security');
const UiStateSnapshotStore = require('../store/ui-state-snapshot');
const interpolateVars = require('./network/interpolate-vars');
const { interpolateString } = require('./network/interpolate-string');
const { getEnvVars, getTreePathFromCollectionToItem, mergeVars, parseBruFileMeta, hydrateRequestWithUuid, transformRequestToSaveToFilesystem } = require('../utils/collection');
const { getProcessEnvVars } = require('../store/process-env');
const { getOAuth2TokenUsingAuthorizationCode, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingImplicitGrant, refreshOauth2Token } = require('../utils/oauth2');
const { getCertsAndProxyConfig } = require('./network/cert-utils');
const collectionWatcher = require('../app/collection-watcher');
const { transformBrunoConfigBeforeSave } = require('../utils/transformBrunoConfig');
const { REQUEST_TYPES } = require('../utils/constants');
const { cancelOAuth2AuthorizationRequest, isOauth2AuthorizationRequestInProgress } = require('../utils/oauth2-protocol-handler');
const { findUniqueFolderName } = require('../utils/collection-import');
const jsyaml = require('js-yaml');

const environmentSecretsStore = new EnvironmentSecretsStore();
const collectionSecurityStore = new CollectionSecurityStore();
const uiStateSnapshotStore = new UiStateSnapshotStore();

// size and file count limits to determine whether the bru files in the collection should be loaded asynchronously or not.
const MAX_COLLECTION_SIZE_IN_MB = 20;
const MAX_SINGLE_FILE_SIZE_IN_COLLECTION_IN_MB = 5;
const MAX_COLLECTION_FILES_COUNT = 2000;

// Get the base directory for transient request files (stored in app data directory)
const getTransientDirectoryBase = () => {
  return path.join(app.getPath('userData'), 'tmp', 'transient');
};

// Get the prefix used for transient collection directories
const getTransientCollectionPrefix = () => {
  return path.join(getTransientDirectoryBase(), 'bruno-');
};

// Get the prefix used for scratch collection directories
const getTransientScratchPrefix = () => {
  return path.join(getTransientDirectoryBase(), 'bruno-scratch-');
};

// Check if a path is within the transient directory
const isTransientPath = (filePath) => {
  const transientBase = getTransientDirectoryBase();
  return filePath.startsWith(transientBase + path.sep) || filePath.startsWith(transientBase);
};

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
 * Prevents SSRF via file://, ftp://, or other schemes.
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
  fs.writeFileSync(path.join(specsDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
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
    if (stats.isDirectory() && !['node_modules', '.git', 'resources', 'environments'].includes(file)) {
      const found = findRequestFileOnDisk(filePath, method, urlPath);
      if (found) return found;
    } else if (file.endsWith('.bru') || file.endsWith('.yml')) {
      if (file.startsWith('folder.') || file.startsWith('collection.')) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileFormat = file.endsWith('.yml') ? 'yml' : 'bru';
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
  }
  brunoConfig.openapi = openapi;

  await saveBrunoConfig(collectionPath, format, brunoConfig, collectionRoot);
};

const envHasSecrets = (environment = {}) => {
  const secrets = _.filter(environment.variables, (v) => v.secret);

  return secrets && secrets.length > 0;
};

const findCollectionPathByItemPath = (filePath) => {
  const parts = filePath.split(path.sep);
  const index = parts.findIndex((part) => part.startsWith('bruno-'));

  if (isTransientPath(filePath) && index !== -1) {
    const transientDirPath = parts.slice(0, index + 1).join(path.sep);
    const metadataPath = path.join(transientDirPath, 'metadata.json');
    try {
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      if (metadata.type === 'scratch') {
        return transientDirPath;
      }

      if (metadata.collectionPath) {
        return metadata.collectionPath;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  const allCollectionPaths = collectionWatcher.getAllWatcherPaths();

  // Find the collection path that contains this file
  // Sort by length descending to find the most specific (deepest) match first
  const sortedPaths = allCollectionPaths.sort((a, b) => b.length - a.length);

  // Normalize the file path for comparison
  const normalizedFilePath = path.normalize(filePath);

  for (const collectionPath of sortedPaths) {
    const normalizedCollectionPath = path.normalize(collectionPath);
    if (normalizedFilePath.startsWith(normalizedCollectionPath + path.sep) || normalizedFilePath === normalizedCollectionPath) {
      return collectionPath;
    }
  }

  return null;
};

const validatePathIsInsideCollection = (filePath) => {
  const collectionPath = findCollectionPathByItemPath(filePath);

  if (!collectionPath) {
    throw new Error(`Path: ${filePath} should be inside a collection`);
  }
};

const registerRendererEventHandlers = (mainWindow, watcher) => {
  // create collection
  ipcMain.handle(
    'renderer:create-collection',
    async (event, collectionName, collectionFolderName, collectionLocation, options = {}) => {
      try {
        const format = options.format || DEFAULT_COLLECTION_FORMAT;
        collectionFolderName = sanitizeName(collectionFolderName);
        const dirPath = path.join(collectionLocation, collectionFolderName);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);

          if (files.length > 0) {
            throw new Error(`collection: ${dirPath} already exists and is not empty`);
          }
        }

        if (!validateName(path.basename(dirPath))) {
          throw new Error(`collection: invalid pathname - ${dirPath}`);
        }

        if (!fs.existsSync(dirPath)) {
          await createDirectory(dirPath);
        }

        const uid = generateUidBasedOnHash(dirPath);
        let brunoConfig = {
          version: '1',
          name: collectionName,
          type: 'collection',
          ignore: ['node_modules', '.git']
        };

        if (format === 'yml') {
          const collectionRoot = {
            meta: {
              name: collectionName
            }
          };
          // For YAML collections, set opencollection instead of version
          brunoConfig = {
            opencollection: '1.0.0',
            name: collectionName,
            type: 'collection',
            ignore: ['node_modules', '.git']
          };
          const content = stringifyCollection(collectionRoot, brunoConfig, { format });
          await writeFile(path.join(dirPath, 'opencollection.yml'), content);
        } else if (format === 'bru') {
          const content = await stringifyJson(brunoConfig);
          await writeFile(path.join(dirPath, 'bruno.json'), content);
        } else {
          throw new Error(`Invalid format: ${format}`);
        }

        await writeFile(path.join(dirPath, '.gitignore'), DEFAULT_GITIGNORE);

        const { size, filesCount } = await getCollectionStats(dirPath);
        brunoConfig.size = size;
        brunoConfig.filesCount = filesCount;

        mainWindow.webContents.send('main:collection-opened', dirPath, uid, brunoConfig);
        ipcMain.emit('main:collection-opened', mainWindow, dirPath, uid, brunoConfig);
      } catch (error) {
        return Promise.reject(error);
      }
    }
  );
  // clone collection
  ipcMain.handle(
    'renderer:clone-collection',
    async (event, collectionName, collectionFolderName, collectionLocation, previousPath) => {
      collectionFolderName = sanitizeName(collectionFolderName);
      const dirPath = path.join(collectionLocation, collectionFolderName);
      if (fs.existsSync(dirPath)) {
        throw new Error(`collection: ${dirPath} already exists`);
      }

      if (!validateName(path.basename(dirPath))) {
        throw new Error(`collection: invalid pathname - ${dirPath}`);
      }

      // create dir
      await createDirectory(dirPath);
      const uid = generateUidBasedOnHash(dirPath);
      const format = getCollectionFormat(previousPath);
      let brunoConfig;

      if (format === 'yml') {
        const configFilePath = path.join(previousPath, 'opencollection.yml');
        const content = fs.readFileSync(configFilePath, 'utf8');
        const {
          brunoConfig: parsedBrunoConfig,
          collectionRoot
        } = parseCollection(content, { format });

        brunoConfig = parsedBrunoConfig;
        brunoConfig.name = collectionName;

        const newContent = stringifyCollection(collectionRoot, brunoConfig, { format });
        await writeFile(path.join(dirPath, 'opencollection.yml'), newContent);
      } else if (format === 'bru') {
        const configFilePath = path.join(previousPath, 'bruno.json');
        const content = fs.readFileSync(configFilePath, 'utf8');
        brunoConfig = JSON.parse(content);
        brunoConfig.name = collectionName;
        const newContent = await stringifyJson(brunoConfig);
        await writeFile(path.join(dirPath, 'bruno.json'), newContent);
      } else {
        throw new Error(`Invalid collectionformat: ${format}`);
      }

      // Now copy all the files matching the collection's filetype along with the dir
      const files = searchForRequestFiles(previousPath);

      for (const sourceFilePath of files) {
        const relativePath = path.relative(previousPath, sourceFilePath);
        const newFilePath = path.join(dirPath, relativePath);

        // skip if the file is opencollection.yml or bruno.json at the root of the collection
        const isRootConfigFile = (path.basename(sourceFilePath) === 'opencollection.yml' || path.basename(sourceFilePath) === 'bruno.json')
          && path.dirname(sourceFilePath) === previousPath;

        if (isRootConfigFile) {
          continue;
        }

        // handle dir of files
        fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
        // copy each files
        fs.copyFileSync(sourceFilePath, newFilePath);
      }

      const { size, filesCount } = await getCollectionStats(dirPath);
      brunoConfig.size = size;
      brunoConfig.filesCount = filesCount;

      mainWindow.webContents.send('main:collection-opened', dirPath, uid, brunoConfig);
      ipcMain.emit('main:collection-opened', mainWindow, dirPath, uid);
    }
  );
  // rename collection
  ipcMain.handle('renderer:rename-collection', async (event, newName, collectionPathname) => {
    try {
      const format = getCollectionFormat(collectionPathname);

      if (format === 'yml') {
        const configFilePath = path.join(collectionPathname, 'opencollection.yml');
        const content = fs.readFileSync(configFilePath, 'utf8');
        const {
          brunoConfig,
          collectionRoot
        } = parseCollection(content, { format: 'yml' });

        brunoConfig.name = newName;

        const newContent = stringifyCollection(collectionRoot, brunoConfig, { format: 'yml' });
        await writeFile(path.join(collectionPathname, 'opencollection.yml'), newContent);
      } else if (format === 'bru') {
        const configFilePath = path.join(collectionPathname, 'bruno.json');
        const content = fs.readFileSync(configFilePath, 'utf8');
        const brunoConfig = JSON.parse(content);
        brunoConfig.name = newName;
        const newContent = await stringifyJson(brunoConfig);
        await writeFile(path.join(collectionPathname, 'bruno.json'), newContent);
      } else {
        throw new Error(`Invalid format: ${format}`);
      }

      mainWindow.webContents.send('main:collection-renamed', {
        collectionPathname,
        newName
      });
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:save-folder-root', async (event, folder) => {
    try {
      const { name: folderName, root: folderRoot = {}, folderPathname, collectionPathname } = folder;

      const format = getCollectionFormat(collectionPathname);
      const folderFilePath = path.join(folderPathname, `folder.${format}`);

      if (!folderRoot.meta) {
        folderRoot.meta = {
          name: folderName
        };
      }

      const content = await stringifyFolder(folderRoot, { format });
      await writeFile(folderFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save collection root
  ipcMain.handle('renderer:save-collection-root', async (event, collectionPathname, collectionRoot, brunoConfig) => {
    try {
      const format = getCollectionFormat(collectionPathname);
      const filename = format === 'yml' ? 'opencollection.yml' : 'collection.bru';
      const content = await stringifyCollection(collectionRoot, brunoConfig, { format });

      await writeFile(path.join(collectionPathname, filename), content);
    } catch (error) {
      console.error('Error in save-collection-root:', error);
      return Promise.reject(error);
    }
  });

  // new request
  ipcMain.handle('renderer:new-request', async (event, pathname, request) => {
    try {
      if (fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} already exists`);
      }

      const collectionPath = findCollectionPathByItemPath(pathname);
      if (!collectionPath) {
        throw new Error('Collection not found for the given pathname');
      }
      const format = getCollectionFormat(collectionPath);

      // For the actual filename part, we want to be strict
      const baseFilename = request?.filename?.replace(`.${format}`, '');
      if (!validateName(baseFilename)) {
        throw new Error(`${request.filename} is not a valid filename`);
      }
      validatePathIsInsideCollection(pathname);

      const content = await stringifyRequestViaWorker(request, { format });
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save request
  ipcMain.handle('renderer:save-request', async (event, pathname, request, format) => {
    try {
      if (!fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} does not exist`);
      }

      // Sync example UIDs cache to maintain consistency when examples are added/deleted/reordered
      syncExampleUidsCache(pathname, request.examples);

      const content = await stringifyRequestViaWorker(request, { format });
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:save-transient-request', async (event, { sourcePathname, targetDirname, targetFilename, request, format, sourceFormat }) => {
    try {
      if (!fs.existsSync(sourcePathname)) {
        throw new Error(`Source path: ${sourcePathname} does not exist`);
      }

      if (!fs.existsSync(targetDirname)) {
        throw new Error(`Target directory: ${targetDirname} does not exist`);
      }

      validatePathIsInsideCollection(targetDirname);

      const collectionPath = findCollectionPathByItemPath(targetDirname);
      if (!collectionPath) {
        throw new Error('Could not determine collection for target directory');
      }
      const targetFormat = getCollectionFormat(collectionPath);

      const filename = targetFilename || path.basename(sourcePathname);
      const filenameWithoutExt = filename.replace(/\.(bru|yml)$/, '');
      const finalFilename = `${filenameWithoutExt}.${targetFormat}`;
      const targetPathname = path.join(targetDirname, finalFilename);

      if (fs.existsSync(targetPathname)) {
        throw new Error(`A file with the name "${finalFilename}" already exists in the target location`);
      }

      const actualSourceFormat = sourceFormat || 'yml';
      const needsConversion = actualSourceFormat !== targetFormat;

      let finalContent;
      if (needsConversion) {
        const { parseRequest, stringifyRequest } = require('@usebruno/filestore');
        const sourceContent = await fs.promises.readFile(sourcePathname, 'utf8');
        const parsedRequest = parseRequest(sourceContent, { format: actualSourceFormat });
        const mergedRequest = { ...parsedRequest, ...request };
        syncExampleUidsCache(sourcePathname, mergedRequest.examples);
        finalContent = stringifyRequest(mergedRequest, { format: targetFormat });
      } else {
        syncExampleUidsCache(sourcePathname, request.examples);
        finalContent = await stringifyRequestViaWorker(request, { format: targetFormat });
      }

      await writeFile(targetPathname, finalContent);
      return { newPathname: targetPathname };
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save multiple requests
  ipcMain.handle('renderer:save-multiple-requests', async (event, requestsToSave) => {
    try {
      for (let r of requestsToSave) {
        const request = r.item;
        const pathname = r.pathname;

        if (!fs.existsSync(pathname)) {
          throw new Error(`path: ${pathname} does not exist`);
        }

        const content = await stringifyRequestViaWorker(request, { format: r.format });
        await writeFile(pathname, content);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Helper: Parse file content based on scope type
  const parseFileByType = async (fileContent, scopeType, format) => {
    switch (scopeType) {
      case 'request':
        return await parseRequestViaWorker(fileContent, { format });
      case 'folder':
        return parseFolder(fileContent, { format });
      case 'collection':
        return parseCollection(fileContent, { format });
      default:
        throw new Error(`Invalid scope type: ${scopeType}`);
    }
  };

  const stringifyByType = async (data, scopeType, collectionRoot, format) => {
    switch (scopeType) {
      case 'request':
        return await stringifyRequestViaWorker(data, { format });
      case 'folder':
        return stringifyFolder(data, { format });
      case 'collection':
        return stringifyCollection(collectionRoot, data, { format });
      default:
        throw new Error(`Invalid scope type: ${scopeType}`);
    }
  };

  // Helper: Update or create variable in array
  const updateOrCreateVariable = (variables, variable) => {
    const existingVar = variables.find((v) => v.name === variable.name);

    if (existingVar) {
      // Update existing variable
      return variables.map((v) => (v.name === variable.name ? variable : v));
    }

    // Create new variable
    return [...variables, variable];
  };

  // update variable in request/folder/collection file
  ipcMain.handle('renderer:update-variable-in-file', async (event, pathname, variable, scopeType, collectionRoot, format) => {
    try {
      if (!fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} does not exist`);
      }

      // Read and parse the file
      const fileContent = fs.readFileSync(pathname, 'utf8');
      const parsedData = await parseFileByType(fileContent, scopeType, format);

      // Update the specific variable or create it if it doesn't exist
      const varsPath = 'request.vars.req';
      const variables = _.get(parsedData, varsPath, []);
      const updatedVariables = updateOrCreateVariable(variables, variable);

      _.set(parsedData, varsPath, updatedVariables);

      const content = await stringifyByType(parsedData, scopeType, collectionRoot, format);
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // create environment
  ipcMain.handle('renderer:create-environment', async (event, collectionPathname, name, variables, color) => {
    try {
      const envDirPath = path.join(collectionPathname, 'environments');
      if (!fs.existsSync(envDirPath)) {
        await createDirectory(envDirPath);
      }

      const format = getCollectionFormat(collectionPathname);

      // Get existing environment files to generate unique name
      const existingFiles = fs.existsSync(envDirPath) ? fs.readdirSync(envDirPath) : [];
      const existingEnvNames = existingFiles
        .filter((file) => file.endsWith(`.${format}`))
        .map((file) => path.basename(file, `.${format}`));

      // Generate unique name based on existing environment files
      const sanitizedName = sanitizeName(name);
      const uniqueName = generateUniqueName(sanitizedName, (name) => existingEnvNames.includes(name));

      const envFilePath = path.join(envDirPath, `${uniqueName}.${format}`);

      const environment = {
        name: uniqueName,
        variables: variables || [],
        color
      };

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collectionPathname, environment);
      }

      const content = await stringifyEnvironment(environment, { format });

      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save environment
  ipcMain.handle('renderer:save-environment', async (event, collectionPathname, environment) => {
    try {
      const envDirPath = path.join(collectionPathname, 'environments');
      if (!fs.existsSync(envDirPath)) {
        await createDirectory(envDirPath);
      }

      const format = getCollectionFormat(collectionPathname);
      // Determine filetype from collection
      const envFilePath = path.join(envDirPath, `${environment.name}.${format}`);

      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collectionPathname, environment);
      }

      const content = await stringifyEnvironment(environment, { format });
      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename environment
  ipcMain.handle('renderer:rename-environment', async (event, collectionPathname, environmentName, newName) => {
    try {
      const format = getCollectionFormat(collectionPathname);
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}.${format}`);

      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      const newEnvFilePath = path.join(envDirPath, `${newName}.${format}`);
      if (!safeToRename(envFilePath, newEnvFilePath)) {
        throw new Error(`environment: ${newEnvFilePath} already exists`);
      }

      moveRequestUid(envFilePath, newEnvFilePath);
      fs.renameSync(envFilePath, newEnvFilePath);

      environmentSecretsStore.renameEnvironment(collectionPathname, environmentName, newName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // delete environment
  ipcMain.handle('renderer:delete-environment', async (event, collectionPathname, environmentName) => {
    try {
      const format = getCollectionFormat(collectionPathname);
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}.${format}`);
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      fs.unlinkSync(envFilePath);

      environmentSecretsStore.deleteEnvironment(collectionPathname, environmentName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Save .env file variables for collection
  ipcMain.handle('renderer:save-dotenv-variables', async (event, collectionPathname, variables, filename = '.env') => {
    try {
      if (!isValidDotEnvFilename(filename)) {
        throw new Error('Invalid .env filename');
      }

      const dotEnvPath = path.join(collectionPathname, filename);

      // Convert variables array to .env format
      const content = variables
        .filter((v) => v.name && v.name.trim() !== '')
        .map((v) => {
          const value = v.value || '';
          // If value contains newlines or special characters, wrap in quotes
          if (value.includes('\n') || value.includes('"') || value.includes('\'') || value.includes('\\')) {
            // Escape backslashes first, then double quotes
            const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `${v.name}="${escapedValue}"`;
          }
          return `${v.name}=${value}`;
        })
        .join('\n');

      await writeFile(dotEnvPath, content);

      return { success: true };
    } catch (error) {
      console.error('Error saving .env file:', error);
      return Promise.reject(error);
    }
  });

  // Save .env file raw content for collection
  ipcMain.handle('renderer:save-dotenv-raw', async (event, collectionPathname, content, filename = '.env') => {
    try {
      if (!isValidDotEnvFilename(filename)) {
        throw new Error('Invalid .env filename');
      }

      const dotEnvPath = path.join(collectionPathname, filename);
      await writeFile(dotEnvPath, content);
      return { success: true };
    } catch (error) {
      console.error('Error saving .env file:', error);
      return Promise.reject(error);
    }
  });

  // Create .env file for collection
  ipcMain.handle('renderer:create-dotenv-file', async (event, collectionPathname, filename = '.env') => {
    try {
      if (!isValidDotEnvFilename(filename)) {
        throw new Error('Invalid .env filename');
      }

      const dotEnvPath = path.join(collectionPathname, filename);

      if (fs.existsSync(dotEnvPath)) {
        throw new Error(`${filename} file already exists`);
      }

      await writeFile(dotEnvPath, '');

      return { success: true, filename };
    } catch (error) {
      console.error('Error creating .env file:', error);
      return Promise.reject(error);
    }
  });

  // Delete .env file for collection
  ipcMain.handle('renderer:delete-dotenv-file', async (event, collectionPathname, filename = '.env') => {
    try {
      if (!isValidDotEnvFilename(filename)) {
        throw new Error('Invalid .env filename');
      }

      const dotEnvPath = path.join(collectionPathname, filename);

      if (!fs.existsSync(dotEnvPath)) {
        throw new Error(`${filename} file does not exist`);
      }

      fs.unlinkSync(dotEnvPath);

      return { success: true };
    } catch (error) {
      console.error('Error deleting .env file:', error);
      return Promise.reject(error);
    }
  });

  // update environment color
  ipcMain.handle('renderer:update-environment-color', async (event, collectionPathname, environmentName, color) => {
    try {
      const format = getCollectionFormat(collectionPathname);
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}.${format}`);

      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      // Read, update color, and write back to file
      const fileContent = fs.readFileSync(envFilePath, 'utf8');
      const environment = parseEnvironment(fileContent, { format });
      environment.color = color;
      const updatedContent = stringifyEnvironment(environment, { format });
      fs.writeFileSync(envFilePath, updatedContent, 'utf8');
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Generic environment export handler
  ipcMain.handle('renderer:export-environment', async (event, { environments, environmentType, filePath, exportFormat = 'folder' }) => {
    try {
      const { app } = require('electron');
      const appVersion = app?.getVersion() || '2.0.0';

      // For single environments and folder exports, include info in each environment
      const environmentWithInfo = (environment) => ({
        name: environment.name,
        variables: environment.variables,
        color: environment.color ?? undefined,
        info: {
          type: 'bruno-environment',
          exportedAt: new Date().toISOString(),
          exportedUsing: `Bruno/v${appVersion}`
        }
      });

      if (exportFormat === 'folder') {
        // separate environment json files in folder
        const baseFolderName = `bruno-${environmentType}-environments`;
        const uniqueFolderName = generateUniqueName(baseFolderName, (name) => fs.existsSync(path.join(filePath, name)));
        const exportPath = path.join(filePath, uniqueFolderName);

        fs.mkdirSync(exportPath, { recursive: true });

        for (const environment of environments) {
          const baseFileName = environment.name ? `${environment.name.replace(/[^a-zA-Z0-9-_]/g, '_')}` : 'environment';
          const uniqueFileName = generateUniqueName(baseFileName, (name) => fs.existsSync(path.join(exportPath, `${name}.json`)));
          const fullPath = path.join(exportPath, `${uniqueFileName}.json`);

          const cleanEnv = environmentWithInfo(environment);
          const jsonContent = JSON.stringify(cleanEnv, null, 2);
          await fs.promises.writeFile(fullPath, jsonContent, 'utf8');
        }
      } else if (exportFormat === 'single-file') {
        // all environments in a single file with top-level info and environments array
        const baseFileName = `bruno-${environmentType}-environments`;
        const uniqueFileName = generateUniqueName(baseFileName, (name) => fs.existsSync(path.join(filePath, `${name}.json`)));
        const fullPath = path.join(filePath, `${uniqueFileName}.json`);

        const exportData = {
          info: {
            type: 'bruno-environment',
            exportedAt: new Date().toISOString(),
            exportedUsing: `Bruno/v${appVersion}`
          },
          environments
        };

        const jsonContent = JSON.stringify(exportData, null, 2);
        await fs.promises.writeFile(fullPath, jsonContent, 'utf8');
      } else if (exportFormat === 'single-object') {
        // single environment json file
        if (environments.length !== 1) {
          throw new Error('Single object export requires exactly one environment');
        }

        const environment = environments[0];
        const baseFileName = environment.name ? `${environment.name.replace(/[^a-zA-Z0-9-_]/g, '_')}` : 'environment';
        const uniqueFileName = generateUniqueName(baseFileName, (name) => fs.existsSync(path.join(filePath, `${name}.json`)));
        const fullPath = path.join(filePath, `${uniqueFileName}.json`);
        const jsonContent = JSON.stringify(environmentWithInfo(environment), null, 2);
        await fs.promises.writeFile(fullPath, jsonContent, 'utf8');
      } else {
        throw new Error(`Unsupported export format: ${exportFormat}`);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename item
  ipcMain.handle('renderer:rename-item-name', async (event, { itemPath, newName, collectionPathname }) => {
    try {
      if (!fs.existsSync(itemPath)) {
        throw new Error(`path: ${itemPath} does not exist`);
      }

      if (isDirectory(itemPath)) {
        const format = getCollectionFormat(collectionPathname);
        const folderFilePath = path.join(itemPath, `folder.${format}`);
        let folderFileJsonContent;
        if (fs.existsSync(folderFilePath)) {
          const oldFolderFileContent = await fs.promises.readFile(folderFilePath, 'utf8');
          folderFileJsonContent = await parseFolder(oldFolderFileContent, { format });
          folderFileJsonContent.meta.name = newName;
        } else {
          folderFileJsonContent = {
            meta: {
              name: newName
            }
          };
        }

        const folderFileContent = await stringifyFolder(folderFileJsonContent, { format });
        await writeFile(folderFilePath, folderFileContent);

        return;
      }

      const format = getCollectionFormat(collectionPathname);
      if (!hasRequestExtension(itemPath, format)) {
        throw new Error(`path: ${itemPath} is not a valid request file`);
      }

      const data = fs.readFileSync(itemPath, 'utf8');
      const jsonData = parseRequest(data, { format });
      jsonData.name = newName;
      const content = stringifyRequest(jsonData, { format });
      await writeFile(itemPath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename item
  ipcMain.handle('renderer:rename-item-filename', async (event, { oldPath, newPath, newName, newFilename, collectionPathname }) => {
    const tempDir = path.join(os.tmpdir(), `temp-folder-${Date.now()}`);
    const isWindowsOSAndNotWSLPathAndItemHasSubDirectories = isDirectory(oldPath) && isWindowsOS() && !isWSLPath(oldPath) && hasSubDirectories(oldPath);
    try {
      // Check if the old path exists
      if (!fs.existsSync(oldPath)) {
        throw new Error(`path: ${oldPath} does not exist`);
      }

      if (!safeToRename(oldPath, newPath)) {
        throw new Error(`path: ${newPath} already exists`);
      }

      const format = getCollectionFormat(collectionPathname);

      if (isDirectory(oldPath)) {
        const folderFilePath = path.join(oldPath, `folder.${format}`);
        let folderFileJsonContent;
        if (fs.existsSync(folderFilePath)) {
          const oldFolderFileContent = await fs.promises.readFile(folderFilePath, 'utf8');
          folderFileJsonContent = await parseFolder(oldFolderFileContent, { format });
          folderFileJsonContent.meta.name = newName;
        } else {
          folderFileJsonContent = {
            meta: {
              name: newName
            }
          };
        }

        const folderFileContent = await stringifyFolder(folderFileJsonContent, { format });
        await writeFile(folderFilePath, folderFileContent);

        const requestFilesAtSource = await searchForRequestFiles(oldPath, collectionPathname);

        for (let requestFile of requestFilesAtSource) {
          const newRequestFilePath = requestFile.replace(oldPath, newPath);
          moveRequestUid(requestFile, newRequestFilePath);
        }

        /**
         * If it is windows OS
         * And it is not a WSL path (meaning it is not running in WSL (linux pathtype))
         * And it has sub directories
         * Only then we need to use the temp dir approach to rename the folder
         *
         * Windows OS would sometimes throw error when renaming a folder with sub directories
         * This is an alternative approach to avoid that error
         */
        if (isWindowsOSAndNotWSLPathAndItemHasSubDirectories) {
          await fsExtra.copy(oldPath, tempDir);
          await fsExtra.remove(oldPath);
          await fsExtra.move(tempDir, newPath, { overwrite: true });
          await fsExtra.remove(tempDir);
        } else {
          await fs.renameSync(oldPath, newPath);
        }

        return newPath;
      }

      if (!hasRequestExtension(oldPath, format)) {
        throw new Error(`path: ${oldPath} is not a valid request file`);
      }

      if (!validateName(newFilename)) {
        throw new Error(`path: ${newFilename} is not a valid filename`);
      }

      // update name in file and save new copy, then delete old copy
      const data = await fs.promises.readFile(oldPath, 'utf8'); // Use async read
      const jsonData = parseRequest(data, { format });
      jsonData.name = newName;
      moveRequestUid(oldPath, newPath);

      const content = stringifyRequest(jsonData, { format });
      await fs.promises.unlink(oldPath);
      await writeFile(newPath, content);

      return newPath;
    } catch (error) {
      // in case the rename file operations fails, and we see that the temp dir exists
      // and the old path does not exist, we need to restore the data from the temp dir to the old path
      if (isWindowsOSAndNotWSLPathAndItemHasSubDirectories) {
        if (fsExtra.pathExistsSync(tempDir) && !fsExtra.pathExistsSync(oldPath)) {
          try {
            await fsExtra.copy(tempDir, oldPath);
            await fsExtra.remove(tempDir);
          } catch (err) {
            console.error('Failed to restore data to the old path:', err);
          }
        }
      }

      return Promise.reject(error);
    }
  });

  // new folder
  ipcMain.handle('renderer:new-folder', async (event, { pathname, folderData, format }) => {
    const resolvedFolderName = sanitizeName(path.basename(pathname));
    pathname = path.join(path.dirname(pathname), resolvedFolderName);
    try {
      if (!fs.existsSync(pathname)) {
        fs.mkdirSync(pathname);
        const folderFilePath = path.join(pathname, `folder.${format}`);
        const content = await stringifyFolder(folderData, { format });
        await writeFile(folderFilePath, content);
      } else {
        return Promise.reject(new Error('The directory already exists'));
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // delete file/folder
  ipcMain.handle('renderer:delete-item', async (event, pathname, type, collectionPathname) => {
    try {
      if (type === 'folder') {
        if (!fs.existsSync(pathname)) {
          return Promise.reject(new Error('The directory does not exist'));
        }

        // delete the request uid mappings
        const requestFilesAtSource = await searchForRequestFiles(pathname, collectionPathname);
        for (let requestFile of requestFilesAtSource) {
          deleteRequestUid(requestFile);
        }

        fs.rmSync(pathname, { recursive: true, force: true });
      } else if (['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(type)) {
        if (!fs.existsSync(pathname)) {
          return Promise.reject(new Error('The file does not exist'));
        }

        deleteRequestUid(pathname);

        fs.unlinkSync(pathname);
      } else {
        return Promise.reject();
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Delete transient request files by their absolute paths
  // This is a simpler handler specifically for cleaning up transient requests
  // tempDirectory: the collection's temp directory path to validate files belong to this collection
  ipcMain.handle('renderer:delete-transient-requests', async (event, filePaths, tempDirectory) => {
    const brunoTempPrefix = getTransientCollectionPrefix();
    const results = { deleted: [], skipped: [], errors: [] };

    // Validate tempDirectory is within Bruno transient directory
    const normalizedTempDir = tempDirectory ? path.normalize(tempDirectory) : null;
    if (!normalizedTempDir || !normalizedTempDir.startsWith(brunoTempPrefix)) {
      return { deleted: [], skipped: filePaths.map((p) => ({ path: p, reason: 'Invalid temp directory' })), errors: [] };
    }

    for (const filePath of filePaths) {
      try {
        // Safety check: only delete files within the collection's temp directory
        const normalizedPath = path.normalize(filePath);
        if (!normalizedPath.startsWith(normalizedTempDir + path.sep) && normalizedPath !== normalizedTempDir) {
          results.skipped.push({ path: filePath, reason: 'Not in collection temp directory' });
          continue;
        }

        // Check if file exists before trying to delete
        if (!fs.existsSync(filePath)) {
          results.skipped.push({ path: filePath, reason: 'File does not exist' });
          continue;
        }

        // Delete the file and its UID mapping
        deleteRequestUid(filePath);
        fs.unlinkSync(filePath);
        results.deleted.push(filePath);
      } catch (error) {
        results.errors.push({ path: filePath, error: error.message });
      }
    }

    return results;
  });

  ipcMain.handle('renderer:open-collection', async () => {
    if (watcher && mainWindow) {
      await openCollectionDialog(mainWindow, watcher);
    }
  });

  ipcMain.handle('renderer:open-multiple-collections', async (e, collectionPaths, options = {}) => {
    if (watcher && mainWindow) {
      await openCollectionsByPathname(mainWindow, watcher, collectionPaths);
      if (options.workspacePath) {
        const { setCollectionWorkspace } = require('../store/process-env');
        const { generateUidBasedOnHash } = require('../utils/common');
        for (const collectionPath of collectionPaths) {
          const collectionUid = generateUidBasedOnHash(collectionPath);
          setCollectionWorkspace(collectionUid, options.workspacePath);
        }
      }
    }
  });

  ipcMain.handle('renderer:set-collection-workspace', (event, collectionUid, workspacePath) => {
    if (workspacePath) {
      const { setCollectionWorkspace } = require('../store/process-env');
      setCollectionWorkspace(collectionUid, workspacePath);
    }
  });

  ipcMain.handle('renderer:remove-collection', async (event, collectionPath, collectionUid, workspacePath) => {
    if (watcher && mainWindow) {
      watcher.removeWatcher(collectionPath, mainWindow, collectionUid);

      if (wsClient) {
        wsClient.closeForCollection(collectionUid);
      }
    }

    // Clean up
    const { clearCollectionWorkspace } = require('../store/process-env');
    clearCollectionWorkspace(collectionUid);

    if (workspacePath && workspacePath !== 'default') {
      try {
        const { removeCollectionFromWorkspace } = require('../utils/workspace-config');
        await removeCollectionFromWorkspace(workspacePath, collectionPath);
      } catch (error) {
        console.error('Error removing collection from workspace.yml:', error);
      }
    }

    // Clean up AppData spec files for this collection
    try {
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
    } catch (error) {
      console.error('Error cleaning up spec files for removed collection:', error);
    }
  });

  ipcMain.handle('renderer:import-collection', async (_, collection, collectionLocation, options = {}) => {
    const format = options.format || DEFAULT_COLLECTION_FORMAT;
    const rawOpenAPISpec = options.rawOpenAPISpec;
    let collections = Array.isArray(collection) ? collection : [collection];
    let completedImports = 0;
    let failedImports = 0;
    let successfulImports = [];

    for (let coll of collections) {
      try {
        // Sending a "started" and "ended" event to renderer to start and stop the spinner.
        mainWindow.webContents.send('main:collection-import-started', coll.uid);

        let collectionName = sanitizeName(coll.name);
        let collectionPath = path.join(collectionLocation, collectionName);

        // Auto-rename if collection already exists
        if (fs.existsSync(collectionPath)) {
          const uniqueName = await findUniqueFolderName(coll.name, collectionLocation);
          collectionName = sanitizeName(uniqueName);
          collectionPath = path.join(collectionLocation, collectionName);
          coll.name = uniqueName;
        }

        const getFilenameWithFormat = (item, format) => {
          if (item?.filename) {
            const ext = path.extname(item.filename);
            if (ext === '.bru' || ext === '.yml') {
              return item.filename.replace(ext, `.${format}`);
            }
            return item.filename;
          }
          return `${item.name}.${format}`;
        };

        // Recursive function to parse the collection items and create files/folders
        const parseCollectionItems = async (items = [], currentPath) => {
          await Promise.all(items.map(async (item) => {
            if (['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type)) {
              let sanitizedFilename = sanitizeName(getFilenameWithFormat(item, format));
              const content = await stringifyRequestViaWorker(item, { format });
              const filePath = path.join(currentPath, sanitizedFilename);
              safeWriteFileSync(filePath, content);
            }
            if (item.type === 'folder') {
              let sanitizedFolderName = sanitizeName(item?.filename || item?.name);
              const folderPath = path.join(currentPath, sanitizedFolderName);
              fs.mkdirSync(folderPath);

              if (item?.root?.meta?.name) {
                const folderFilePath = path.join(folderPath, `folder.${format}`);
                item.root.meta.seq = item.seq;
                const folderContent = await stringifyFolder(item.root, { format });
                safeWriteFileSync(folderFilePath, folderContent);
              }

              if (item.items && item.items.length) {
                await parseCollectionItems(item.items, folderPath);
              }
            }
            // Handle items of type 'js'
            if (item.type === 'js') {
              let sanitizedFilename = sanitizeName(item?.filename || `${item.name}.js`);
              const filePath = path.join(currentPath, sanitizedFilename);
              safeWriteFileSync(filePath, item.fileContent);
            }
          }));
        };

        const parseEnvironments = async (environments = [], collectionPath) => {
          const envDirPath = path.join(collectionPath, 'environments');
          if (!fs.existsSync(envDirPath)) {
            fs.mkdirSync(envDirPath);
          }

          await Promise.all(environments.map(async (env) => {
            const content = await stringifyEnvironment(env, { format });
            let sanitizedEnvFilename = sanitizeName(`${env.name}.${format}`);
            const filePath = path.join(envDirPath, sanitizedEnvFilename);
            safeWriteFileSync(filePath, content);
          }));
        };

        const getBrunoJsonConfig = (collection) => {
          let brunoConfig = collection.brunoConfig;

          if (!brunoConfig) {
            brunoConfig = {
              version: '1',
              name: collection.name,
              type: 'collection',
              ignore: ['node_modules', '.git']
            };
          }

          return brunoConfig;
        };

        await createDirectory(collectionPath);

        const uid = generateUidBasedOnHash(collectionPath);
        const brunoConfig = getBrunoJsonConfig(coll);

        // Convert absolute local file paths to collection-relative (git-shareable)
        if (Array.isArray(brunoConfig.openapi)) {
          for (const entry of brunoConfig.openapi) {
            if (entry.sourceUrl && path.isAbsolute(entry.sourceUrl)) {
              entry.sourceUrl = path.relative(collectionPath, entry.sourceUrl);
            }
          }
        }

        if (format === 'yml') {
          brunoConfig.opencollection = '1.0.0';
          const collectionContent = await stringifyCollection(coll.root, brunoConfig, { format });
          await writeFile(path.join(collectionPath, 'opencollection.yml'), collectionContent);
        } else if (format === 'bru') {
          const stringifiedBrunoConfig = await stringifyJson(brunoConfig);
          await writeFile(path.join(collectionPath, 'bruno.json'), stringifiedBrunoConfig);

          const collectionContent = await stringifyCollection(coll.root, brunoConfig, { format });
          await writeFile(path.join(collectionPath, 'collection.bru'), collectionContent);
        } else {
          throw new Error(`Invalid format: ${format}`);
        }

        // create folder and files based on collection
        await parseCollectionItems(coll.items, collectionPath);
        await parseEnvironments(coll.environments, collectionPath);

        // Save OpenAPI spec file for sync support
        if (rawOpenAPISpec && brunoConfig.openapi?.length) {
          const importSourceUrl = brunoConfig.openapi[0].sourceUrl;
          const specContent = typeof rawOpenAPISpec === 'string'
            ? rawOpenAPISpec
            : JSON.stringify(rawOpenAPISpec, null, 2);
          await saveSpecAndUpdateMetadata({ collectionPath, specContent, sourceUrl: importSourceUrl });
        }

        const { size, filesCount } = await getCollectionStats(collectionPath);
        brunoConfig.size = size;
        brunoConfig.filesCount = filesCount;

        mainWindow.webContents.send('main:collection-opened', collectionPath, uid, brunoConfig);
        ipcMain.emit('main:collection-opened', mainWindow, collectionPath, uid, brunoConfig);

        mainWindow.webContents.send('main:collection-import-ended', coll.uid);

        successfulImports.push({
          path: collectionPath,
          name: coll.name
        });
        // Increment completed imports
        completedImports++;
      } catch (error) {
        mainWindow.webContents.send('main:collection-import-failed', coll.uid, {
          message: `Error ${error.message}`
        });
        console.error(`Failed to import collection: ${coll.name}, Error: ${error.message}`);

        // Increment failed imports
        failedImports++;

        // Continue with next collection instead of breaking
        continue;
      }
    }

    // Send final status when all collections have been processed (either succeeded or failed)
    if ((completedImports + failedImports) === collections.length) {
      mainWindow.webContents.send('main:all-collections-import-ended', {
        message: `Import completed. ${completedImports} collections imported successfully, ${failedImports} failed.`,
        status: {
          total: collections.length,
          succeeded: completedImports,
          failed: failedImports
        }
      });
    }

    return {
      success: {
        count: completedImports,
        items: successfulImports
      }
    };
  });

  ipcMain.handle('renderer:clone-folder', async (event, itemFolder, collectionPath, collectionPathname) => {
    try {
      if (fs.existsSync(collectionPath)) {
        throw new Error(`folder: ${collectionPath} already exists`);
      }

      const format = getCollectionFormat(collectionPathname);

      // Recursive function to parse the folder and create files/folders
      const parseCollectionItems = (items = [], currentPath) => {
        items.forEach(async (item) => {
          if (['http-request', 'graphql-request', 'grpc-request'].includes(item.type)) {
            const content = await stringifyRequestViaWorker(item, { format });

            // Use the correct file extension based on target format
            const baseName = path.parse(item.filename).name;
            const newFilename = format === 'yml' ? `${baseName}.yml` : `${baseName}.bru`;
            const filePath = path.join(currentPath, newFilename);

            safeWriteFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            const folderPath = path.join(currentPath, item.filename);
            fs.mkdirSync(folderPath);

            // If folder has a root element, then I should write its folder file
            if (item.root) {
              const folderContent = await stringifyFolder(item.root, { format });
              folderContent.name = item.name;
              if (folderContent) {
                const folderFilePath = path.join(folderPath, `folder.${format}`);
                safeWriteFileSync(folderFilePath, folderContent);
              }
            }

            if (item.items && item.items.length) {
              parseCollectionItems(item.items, folderPath);
            }
          }
        });
      };

      await createDirectory(collectionPath);

      // If initial folder has a root element, then I should write its folder file
      if (itemFolder.root) {
        const folderContent = await stringifyFolder(itemFolder.root, { format });
        if (folderContent) {
          const folderFilePath = path.join(collectionPath, `folder.${format}`);
          safeWriteFileSync(folderFilePath, folderContent);
        }
      }

      // create folder and files based on another folder
      await parseCollectionItems(itemFolder.items, collectionPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:resequence-items', async (event, itemsToResequence, collectionPathname) => {
    try {
      const format = getCollectionFormat(collectionPathname);

      for (let item of itemsToResequence) {
        if (item?.type === 'folder') {
          const folderRootPath = path.join(item.pathname, `folder.${format}`);
          let folderJsonData = {
            meta: {
              name: path.basename(item.pathname),
              seq: item.seq
            }
          };
          if (fs.existsSync(folderRootPath)) {
            const folderContent = fs.readFileSync(folderRootPath, 'utf8');
            folderJsonData = await parseFolder(folderContent, { format });
            if (!folderJsonData?.meta) {
              folderJsonData.meta = {
                name: path.basename(item.pathname),
                seq: item.seq
              };
            }
            if (folderJsonData?.meta?.seq === item.seq) {
              continue;
            }
            folderJsonData.meta.seq = item.seq;
          }
          const content = await stringifyFolder(folderJsonData, { format });
          await writeFile(folderRootPath, content);
        } else if (REQUEST_TYPES.includes(item?.type)) {
          if (fs.existsSync(item.pathname)) {
            const itemToSave = transformRequestToSaveToFilesystem(item);
            const content = await stringifyRequestViaWorker(itemToSave, { format });
            await writeFile(item.pathname, content);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error in resequence-items:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:move-file-item', async (event, itemPath, destinationPath) => {
    try {
      const itemContent = fs.readFileSync(itemPath, 'utf8');
      const newItemPath = path.join(destinationPath, path.basename(itemPath));

      moveRequestUid(itemPath, newItemPath);

      fs.unlinkSync(itemPath);
      safeWriteFileSync(newItemPath, itemContent);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:move-item', async (event, { targetDirname, sourcePathname }) => {
    try {
      if (fs.existsSync(targetDirname)) {
        const sourceDirname = path.dirname(sourcePathname);
        const pathnamesBefore = await getPaths(sourcePathname);
        const pathnamesAfter = pathnamesBefore?.map((p) => p?.replace(sourceDirname, targetDirname));
        await copyPath(sourcePathname, targetDirname);
        await removePath(sourcePathname);
        // move the request uids of the previous file/folders to the new file/folder items
        pathnamesAfter?.forEach((_, index) => {
          moveRequestUid(pathnamesBefore[index], pathnamesAfter[index]);
        });
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:move-folder-item', async (event, folderPath, destinationPath) => {
    try {
      const folderName = path.basename(folderPath);
      const newFolderPath = path.join(destinationPath, folderName);

      if (!fs.existsSync(folderPath)) {
        throw new Error(`folder: ${folderPath} does not exist`);
      }

      if (fs.existsSync(newFolderPath)) {
        throw new Error(`folder: ${newFolderPath} already exists`);
      }

      const requestFilesAtSource = await searchForRequestFiles(folderPath);

      for (let requestFile of requestFilesAtSource) {
        const newRequestFilePath = requestFile.replace(folderPath, newFolderPath);
        moveRequestUid(requestFile, newRequestFilePath);
      }

      fs.renameSync(folderPath, newFolderPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:update-bruno-config', async (event, brunoConfig, collectionPath, collectionRoot) => {
    try {
      const transformedBrunoConfig = transformBrunoConfigBeforeSave(brunoConfig);
      const format = getCollectionFormat(collectionPath);

      if (format === 'bru') {
        const brunoConfigPath = path.join(collectionPath, 'bruno.json');
        const content = await stringifyJson(transformedBrunoConfig);
        await writeFile(brunoConfigPath, content);
      } else if (format === 'yml') {
        const content = await stringifyCollection(collectionRoot, transformedBrunoConfig, { format });
        await writeFile(path.join(collectionPath, 'opencollection.yml'), content);
      } else {
        throw new Error(`Invalid collection format: ${format}`);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:open-devtools', async () => {
    mainWindow.webContents.openDevTools();
  });

  ipcMain.handle('renderer:load-gql-schema-file', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile']
      });
      if (filePaths.length === 0) {
        return;
      }

      const jsonData = fs.readFileSync(filePaths[0], 'utf8');
      return safeParseJSON(jsonData);
    } catch (err) {
      return Promise.reject(new Error('Failed to load GraphQL schema file'));
    }
  });

  const updateCookiesAndNotify = async () => {
    const domainsWithCookies = await getDomainsWithCookies();
    mainWindow.webContents.send(
      'main:cookies-update',
      safeParseJSON(safeStringifyJSON(domainsWithCookies))
    );
    cookiesStore.saveCookieJar();
  };

  // Delete all cookies for a domain
  ipcMain.handle('renderer:delete-cookies-for-domain', async (event, domain) => {
    try {
      await deleteCookiesForDomain(domain);
      await updateCookiesAndNotify();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:delete-cookie', async (event, domain, path, cookieKey) => {
    try {
      await deleteCookie(domain, path, cookieKey);
      await updateCookiesAndNotify();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // add cookie
  ipcMain.handle('renderer:add-cookie', async (event, domain, cookie) => {
    try {
      await addCookieForDomain(domain, cookie);
      await updateCookiesAndNotify();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // modify cookie
  ipcMain.handle('renderer:modify-cookie', async (event, domain, oldCookie, cookie) => {
    try {
      await modifyCookieForDomain(domain, oldCookie, cookie);
      await updateCookiesAndNotify();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-parsed-cookie', async (event, cookieStr) => {
    try {
      return parseCookieString(cookieStr);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:create-cookie-string', async (event, cookie) => {
    try {
      return createCookieString(cookie);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:save-collection-security-config', async (event, collectionPath, securityConfig) => {
    try {
      collectionSecurityStore.setSecurityConfigForCollection(collectionPath, {
        jsSandboxMode: securityConfig.jsSandboxMode
      });
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-collection-security-config', async (event, collectionPath) => {
    try {
      return collectionSecurityStore.getSecurityConfigForCollection(collectionPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:update-ui-state-snapshot', (event, { type, data }) => {
    try {
      uiStateSnapshotStore.update({ type, data });
    } catch (error) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('renderer:fetch-oauth2-credentials', async (event, { itemUid, request, collection }) => {
    try {
      if (request.oauth2) {
        let requestCopy = _.cloneDeep(request);
        const { uid: collectionUid, pathname: collectionPath, runtimeVariables, environments = [], activeEnvironmentUid } = collection;
        const environment = _.find(environments, (e) => e.uid === activeEnvironmentUid);
        const envVars = getEnvVars(environment);
        const processEnvVars = getProcessEnvVars(collectionUid);
        const partialItem = { uid: itemUid };
        const requestTreePath = getTreePathFromCollectionToItem(collection, partialItem);
        mergeVars(collection, requestCopy, requestTreePath);
        const globalEnvironmentVariables = collection.globalEnvironmentVariables;
        const promptVariables = collection.promptVariables;
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        const { oauth2: { grantType, accessTokenUrl, refreshTokenUrl }, collectionVariables, folderVariables, requestVariables } = requestCopy || {};

        // For OAuth2 token requests, use accessTokenUrl for cert/proxy config instead of main request URL
        let certsAndProxyConfigForTokenUrl = null;
        let certsAndProxyConfigForRefreshUrl = null;

        if (accessTokenUrl && grantType !== 'implicit') {
          const interpolatedTokenUrl = interpolateString(accessTokenUrl, {
            globalEnvironmentVariables,
            collectionVariables,
            envVars,
            folderVariables,
            requestVariables,
            runtimeVariables,
            processEnvVars,
            promptVariables
          });
          let tokenRequestForConfig = { ...requestCopy, url: interpolatedTokenUrl };
          certsAndProxyConfigForTokenUrl = await getCertsAndProxyConfig({
            collectionUid,
            collection,
            request: tokenRequestForConfig,
            envVars,
            runtimeVariables,
            processEnvVars,
            collectionPath,
            globalEnvironmentVariables
          });
        }

        // For refresh token requests, use refreshTokenUrl if available, otherwise accessTokenUrl
        const tokenUrlForRefresh = refreshTokenUrl || accessTokenUrl;
        if (tokenUrlForRefresh && grantType !== 'implicit') {
          const interpolatedRefreshUrl = interpolateString(tokenUrlForRefresh, {
            globalEnvironmentVariables,
            collectionVariables,
            envVars,
            folderVariables,
            requestVariables,
            runtimeVariables,
            processEnvVars,
            promptVariables
          });
          let refreshRequestForConfig = { ...requestCopy, url: interpolatedRefreshUrl };
          certsAndProxyConfigForRefreshUrl = await getCertsAndProxyConfig({
            collectionUid,
            collection,
            request: refreshRequestForConfig,
            envVars,
            runtimeVariables,
            processEnvVars,
            collectionPath,
            globalEnvironmentVariables
          });
        }

        const handleOAuth2Response = (response) => {
          if (response.error && !response.debugInfo) {
            throw new Error(response.error);
          }
          return response;
        };

        switch (grantType) {
          case 'authorization_code':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingAuthorizationCode({
              request: requestCopy,
              collectionUid,
              forceFetch: true,
              certsAndProxyConfigForTokenUrl,
              certsAndProxyConfigForRefreshUrl
            }).then(handleOAuth2Response);

          case 'client_credentials':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingClientCredentials({
              request: requestCopy,
              collectionUid,
              forceFetch: true,
              certsAndProxyConfigForTokenUrl,
              certsAndProxyConfigForRefreshUrl
            }).then(handleOAuth2Response);

          case 'password':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingPasswordCredentials({
              request: requestCopy,
              collectionUid,
              forceFetch: true,
              certsAndProxyConfigForTokenUrl,
              certsAndProxyConfigForRefreshUrl
            }).then(handleOAuth2Response);

          case 'implicit':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingImplicitGrant({
              request: requestCopy,
              collectionUid,
              forceFetch: true
            }).then(handleOAuth2Response);

          default:
            return {
              error: `Unsupported grant type: ${grantType}`,
              credentials: null,
              url: null,
              collectionUid,
              credentialsId: null
            };
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:refresh-oauth2-credentials', async (event, { itemUid, request, collection }) => {
    try {
      if (request.oauth2) {
        let requestCopy = _.cloneDeep(request);
        const { uid: collectionUid, pathname: collectionPath, runtimeVariables, environments = [], activeEnvironmentUid } = collection;
        const environment = _.find(environments, (e) => e.uid === activeEnvironmentUid);
        const envVars = getEnvVars(environment);
        const processEnvVars = getProcessEnvVars(collectionUid);
        const partialItem = { uid: itemUid };
        const requestTreePath = getTreePathFromCollectionToItem(collection, partialItem);
        mergeVars(collection, requestCopy, requestTreePath);
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        const globalEnvironmentVariables = collection.globalEnvironmentVariables;

        const certsAndProxyConfig = await getCertsAndProxyConfig({
          collectionUid,
          collection,
          request: requestCopy,
          envVars,
          runtimeVariables,
          processEnvVars,
          collectionPath,
          globalEnvironmentVariables
        });

        let { credentials, url, credentialsId, debugInfo } = await refreshOauth2Token({ requestCopy, collectionUid, certsAndProxyConfig });
        return { credentials, url, collectionUid, credentialsId, debugInfo };
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:cancel-oauth2-authorization-request', async () => {
    try {
      const cancelled = cancelOAuth2AuthorizationRequest();
      return { success: true, cancelled };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:is-oauth2-authorization-request-in-progress', () => {
    return isOauth2AuthorizationRequestInProgress();
  });

  // todo: could be removed
  ipcMain.handle('renderer:load-request-via-worker', async (event, { collectionUid, pathname }) => {
    let fileStats;
    try {
      fileStats = fs.statSync(pathname);
      if (hasBruExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = parseBruFileMeta(bruContent);
        file.data = metaJson;
        file.loading = true;
        file.partial = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        file.data = await parseRequestViaWorker(bruContent, { format: 'bru' });
        file.partial = false;
        file.loading = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
    } catch (error) {
      if (hasBruExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = parseBruFileMeta(bruContent);
        file.data = metaJson;
        file.partial = true;
        file.loading = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
      return Promise.reject(error);
    }
  });

  // todo: could be removed
  ipcMain.handle('renderer:load-request', async (event, { collectionUid, pathname }) => {
    let fileStats;
    try {
      fileStats = fs.statSync(pathname);
      if (hasRequestExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = parseBruFileMeta(bruContent);
        file.data = metaJson;
        file.loading = true;
        file.partial = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        file.data = parseRequest(bruContent);
        file.partial = false;
        file.loading = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
    } catch (error) {
      if (hasRequestExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = parseBruFileMeta(bruContent);
        file.data = metaJson;
        file.partial = true;
        file.loading = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:load-large-request', async (event, { collectionUid, pathname }) => {
    let fileStats;
    if (!hasBruExtension(pathname)) {
      return;
    }

    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };

    try {
      fileStats = fs.statSync(pathname);

      const bruContent = fs.readFileSync(pathname, 'utf8');
      const metaJson = parseBruFileMeta(bruContent);

      file.data = metaJson;
      file.partial = false;
      file.loading = true;
      file.size = sizeInMB(fileStats?.size);
      hydrateRequestWithUuid(file.data, pathname);
      await mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);

      try {
        const parsedData = await parseLargeRequestWithRedaction(bruContent, 'bru');

        file.data = parsedData;
        file.loading = false;
        file.partial = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        await mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      } catch (parseError) {
        file.data = metaJson;
        file.partial = true;
        file.loading = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        await mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        throw parseError;
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:mount-collection', async (event, { collectionUid, collectionPathname, brunoConfig }) => {
    let tempDirectoryPath = null;
    try {
      // Ensure the transient base directory exists
      const transientBase = getTransientDirectoryBase();
      if (!fs.existsSync(transientBase)) {
        fs.mkdirSync(transientBase, { recursive: true });
      }
      tempDirectoryPath = fs.mkdtempSync(getTransientCollectionPrefix());
      const metadata = {
        collectionPath: collectionPathname
      };
      fs.writeFileSync(path.join(tempDirectoryPath, 'metadata.json'), JSON.stringify(metadata));
    } catch (error) {
      throw error;
    }
    const {
      size,
      filesCount,
      maxFileSize
    } = await getCollectionStats(collectionPathname);

    const shouldLoadCollectionAsync
      = (size > MAX_COLLECTION_SIZE_IN_MB)
        || (filesCount > MAX_COLLECTION_FILES_COUNT)
        || (maxFileSize > MAX_SINGLE_FILE_SIZE_IN_COLLECTION_IN_MB);

    watcher.addWatcher(mainWindow, collectionPathname, collectionUid, brunoConfig, false, shouldLoadCollectionAsync);

    // Add watcher for transient directory
    watcher.addTempDirectoryWatcher(mainWindow, tempDirectoryPath, collectionUid, collectionPathname);

    return tempDirectoryPath;
  });

  ipcMain.handle('renderer:mount-workspace-scratch', async (event, { workspaceUid, workspacePath }) => {
    try {
      // Ensure the transient base directory exists
      const transientBase = getTransientDirectoryBase();
      if (!fs.existsSync(transientBase)) {
        fs.mkdirSync(transientBase, { recursive: true });
      }
      const tempDirectoryPath = fs.mkdtempSync(getTransientScratchPrefix());
      registerScratchCollectionPath(tempDirectoryPath);

      const collectionRoot = {
        meta: {
          name: 'Scratch'
        }
      };

      const brunoConfig = {
        opencollection: '1.0.0',
        name: 'Scratch',
        type: 'collection',
        ignore: ['node_modules', '.git']
      };

      const content = stringifyCollection(collectionRoot, brunoConfig, { format: 'yml' });
      await writeFile(path.join(tempDirectoryPath, 'opencollection.yml'), content);

      const metadata = {
        workspaceUid,
        workspacePath,
        type: 'scratch'
      };
      fs.writeFileSync(path.join(tempDirectoryPath, 'metadata.json'), JSON.stringify(metadata));

      return tempDirectoryPath;
    } catch (error) {
      console.error('Error mounting workspace scratch collection:', error);
      throw error;
    }
  });

  ipcMain.handle('renderer:add-collection-watcher', async (event, { collectionPath, collectionUid, brunoConfig }) => {
    if (!watcher || !mainWindow) {
      throw new Error('Watcher or mainWindow not available');
    }

    try {
      const { size, filesCount, maxFileSize } = await getCollectionStats(collectionPath);

      const shouldLoadCollectionAsync
        = (size > MAX_COLLECTION_SIZE_IN_MB)
          || (filesCount > MAX_COLLECTION_FILES_COUNT)
          || (maxFileSize > MAX_SINGLE_FILE_SIZE_IN_COLLECTION_IN_MB);

      watcher.addWatcher(mainWindow, collectionPath, collectionUid, brunoConfig, false, shouldLoadCollectionAsync);

      return { success: true };
    } catch (error) {
      console.error('Error adding collection watcher:', error);
      throw error;
    }
  });

  ipcMain.handle('renderer:save-scratch-request', async (event, { sourcePathname, targetDirname, targetFilename, request }) => {
    try {
      if (!fs.existsSync(sourcePathname)) {
        throw new Error(`Source path: ${sourcePathname} does not exist`);
      }

      if (!fs.existsSync(targetDirname)) {
        throw new Error(`Target directory: ${targetDirname} does not exist`);
      }

      validatePathIsInsideCollection(targetDirname);

      const collectionPath = findCollectionPathByItemPath(targetDirname);
      if (!collectionPath) {
        throw new Error('Could not determine collection for target directory');
      }
      const format = getCollectionFormat(collectionPath);

      const filename = targetFilename || path.basename(sourcePathname);
      const filenameWithoutExt = filename.replace(/\.(bru|yml)$/, '');
      const finalFilename = `${filenameWithoutExt}.${format}`;
      const targetPathname = path.join(targetDirname, finalFilename);

      if (fs.existsSync(targetPathname)) {
        throw new Error(`A file with the name "${finalFilename}" already exists in the target location`);
      }

      const content = await stringifyRequestViaWorker(request, { format });

      await writeFile(targetPathname, content);

      if (request.examples) {
        syncExampleUidsCache(collectionPath, request.examples);
      }

      return { newPathname: targetPathname };
    } catch (error) {
      console.error('Error saving scratch request:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:show-in-folder', async (event, arg) => {
    try {
      let filePath;
      if (typeof arg === 'string') {
        filePath = arg;
      } else if (arg && typeof arg === 'object') {
        // Support { filePath, collectionPath } to resolve relative paths on disk
        filePath = arg.collectionPath
          ? path.resolve(arg.collectionPath, arg.filePath)
          : arg.filePath;
      }
      if (!filePath) {
        throw new Error('File path is required');
      }
      shell.showItemInFolder(filePath);
    } catch (error) {
      console.error('Error in show-in-folder: ', error);
      throw error;
    }
  });

  // Resolve a relative path to absolute given a base directory
  ipcMain.handle('renderer:resolve-path', async (event, { basePath, relativePath }) => {
    return path.resolve(basePath, relativePath);
  });

  // Implement the Postman to Bruno conversion handler
  ipcMain.handle('renderer:convert-postman-to-bruno', async (event, postmanCollection) => {
    try {
      // Convert Postman collection to Bruno format
      const brunoCollection = await postmanToBruno(postmanCollection, { useWorkers: true });

      return brunoCollection;
    } catch (error) {
      console.error('Error converting Postman to Bruno:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-collection-json', async (event, collectionPath) => {
    let variables = {};
    let name = '';
    const getBruFilesRecursively = async (dir) => {
      const getFilesInOrder = async (dir) => {
        let bruJsons = [];

        const traverse = async (currentPath) => {
          const filesInCurrentDir = fs.readdirSync(currentPath);

          if (currentPath.includes('node_modules')) {
            return;
          }

          for (const file of filesInCurrentDir) {
            const filePath = path.join(currentPath, file);
            const stats = fs.lstatSync(filePath);

            if (stats.isDirectory() && !filePath.startsWith('.git') && !filePath.startsWith('node_modules')) {
              await traverse(filePath);
            }
          }

          const currentDirBruJsons = [];
          for (const file of filesInCurrentDir) {
            const filePath = path.join(currentPath, file);
            const stats = fs.lstatSync(filePath);

            if (isBrunoConfigFile(filePath, collectionPath)) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const brunoConfig = JSON.parse(content);

                name = brunoConfig?.name;
              } catch (err) {
                console.error(err);
              }
            }

            if (isDotEnvFile(filePath, collectionPath)) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const jsonData = dotenvToJson(content);
                variables = {
                  ...variables,
                  processEnvVariables: {
                    ...process.env,
                    ...jsonData
                  }
                };
                continue;
              } catch (err) {
                console.error(err);
              }
            }

            if (isBruEnvironmentConfig(filePath, collectionPath)) {
              try {
                let bruContent = fs.readFileSync(filePath, 'utf8');
                const environmentFilepathBasename = path.basename(filePath);
                const environmentName = environmentFilepathBasename.substring(0, environmentFilepathBasename.length - 4);
                let data = await parseEnvironment(bruContent);
                variables = {
                  ...variables,
                  envVariables: {
                    ...(variables?.envVariables || {}),
                    [path.basename(filePath)]: data.variables
                  }
                };
                continue;
              } catch (err) {
                console.error(err);
              }
            }

            if (isCollectionRootBruFile(filePath, collectionPath)) {
              try {
                let bruContent = fs.readFileSync(filePath, 'utf8');
                let data = await parseCollection(bruContent);
                // TODO
                continue;
              } catch (err) {
                console.error(err);
              }
            }
            if (!stats.isDirectory() && path.extname(filePath) === '.bru' && file !== 'folder.bru') {
              const bruContent = fs.readFileSync(filePath, 'utf8');
              const bruJson = parseRequest(bruContent);

              currentDirBruJsons.push({
                ...bruJson
              });
            }
          }

          bruJsons = bruJsons.concat(currentDirBruJsons);
        };

        await traverse(dir);
        return bruJsons;
      };

      const orderedFiles = await getFilesInOrder(dir);
      return orderedFiles;
    };

    const files = await getBruFilesRecursively(collectionPath);
    return { name, files, ...variables };
  });

  ipcMain.handle('renderer:export-collection-zip', async (event, collectionPath, collectionName) => {
    try {
      if (!collectionPath || !fs.existsSync(collectionPath)) {
        throw new Error('Collection path does not exist');
      }

      const defaultFileName = `${sanitizeName(collectionName)}.zip`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Collection as ZIP',
        defaultPath: defaultFileName,
        filters: [{ name: 'Zip Files', extensions: ['zip'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const ignoredDirectories = ['node_modules', '.git'];

      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          resolve();
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        const addDirectoryToArchive = (dirPath, archivePath) => {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const entryArchivePath = archivePath ? path.join(archivePath, entry.name) : entry.name;

            if (entry.isDirectory()) {
              if (!ignoredDirectories.includes(entry.name)) {
                addDirectoryToArchive(fullPath, entryArchivePath);
              }
            } else {
              archive.file(fullPath, { name: entryArchivePath });
            }
          }
        };

        addDirectoryToArchive(collectionPath, '');
        archive.finalize();
      });

      return { success: true, filePath };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:is-bruno-collection-zip', async (event, zipFilePath) => {
    try {
      const zip = new AdmZip(zipFilePath);
      const entries = zip.getEntries().map((e) => e.entryName);

      return entries.some(
        (name) =>
          name === 'bruno.json'
          || name === 'opencollection.yml'
          || /^[^/]+\/bruno\.json$/.test(name)
          || /^[^/]+\/opencollection\.yml$/.test(name)
      );
    } catch {
      return false;
    }
  });

  ipcMain.handle('renderer:import-collection-zip', async (event, zipFilePath, collectionLocation) => {
    try {
      if (!fs.existsSync(zipFilePath)) {
        throw new Error('ZIP file does not exist');
      }

      if (!collectionLocation || !fs.existsSync(collectionLocation)) {
        throw new Error('Collection location does not exist');
      }

      const tempDir = path.join(os.tmpdir(), `bruno_zip_import_${Date.now()}`);
      await fsExtra.ensureDir(tempDir);

      // Validates that no symlinks point outside the base directory
      const validateNoExternalSymlinks = (dir, baseDir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const stat = fs.lstatSync(fullPath);

          if (stat.isSymbolicLink()) {
            const linkTarget = fs.readlinkSync(fullPath);
            const resolvedTarget = path.resolve(path.dirname(fullPath), linkTarget);
            if (!resolvedTarget.startsWith(baseDir + path.sep) && resolvedTarget !== baseDir) {
              throw new Error(`Security error: Symlink "${entry.name}" points outside extraction directory`);
            }
          }

          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            validateNoExternalSymlinks(fullPath, baseDir);
          }
        }
      };

      try {
        await extractZip(zipFilePath, { dir: tempDir });

        validateNoExternalSymlinks(tempDir, tempDir);

        const extractedItems = fs.readdirSync(tempDir);
        let collectionDir = tempDir;

        if (extractedItems.length === 1) {
          const singleItem = path.join(tempDir, extractedItems[0]);
          const singleItemStat = fs.lstatSync(singleItem);
          if (singleItemStat.isDirectory() && !singleItemStat.isSymbolicLink()) {
            collectionDir = singleItem;
          }
        }

        const brunoJsonPath = path.join(collectionDir, 'bruno.json');
        const openCollectionYmlPath = path.join(collectionDir, 'opencollection.yml');

        if (!fs.existsSync(brunoJsonPath) && !fs.existsSync(openCollectionYmlPath)) {
          throw new Error('Invalid collection: Neither bruno.json nor opencollection.yml found in the ZIP file');
        }

        // Ensure config files are not symlinks
        if (fs.existsSync(brunoJsonPath) && fs.lstatSync(brunoJsonPath).isSymbolicLink()) {
          throw new Error('Security error: bruno.json cannot be a symbolic link');
        }
        if (fs.existsSync(openCollectionYmlPath) && fs.lstatSync(openCollectionYmlPath).isSymbolicLink()) {
          throw new Error('Security error: opencollection.yml cannot be a symbolic link');
        }

        let collectionName = 'Imported Collection';
        let brunoConfig = { name: collectionName, version: '1', type: 'collection', ignore: ['node_modules', '.git'] };
        if (fs.existsSync(openCollectionYmlPath)) {
          try {
            const content = fs.readFileSync(openCollectionYmlPath, 'utf8');
            const parsed = parseCollection(content, { format: 'yml' });
            brunoConfig = parsed.brunoConfig || brunoConfig;
            collectionName = brunoConfig.name || collectionName;
          } catch (e) {
            console.error(`Error parsing opencollection.yml at ${openCollectionYmlPath}:`, e);
          }
        } else if (fs.existsSync(brunoJsonPath)) {
          try {
            brunoConfig = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));
            collectionName = brunoConfig.name || collectionName;
          } catch (e) {
            console.error(`Error parsing bruno.json at ${brunoJsonPath}:`, e);
          }
        }

        let sanitizedName = sanitizeName(collectionName);
        if (!sanitizedName) {
          sanitizedName = `untitled-${Date.now()}`;
        }
        let finalCollectionPath = path.join(collectionLocation, sanitizedName);
        let counter = 1;
        while (fs.existsSync(finalCollectionPath)) {
          finalCollectionPath = path.join(collectionLocation, `${sanitizedName} (${counter})`);
          counter++;
        }

        await fsExtra.move(collectionDir, finalCollectionPath);
        if (tempDir !== collectionDir) {
          await fsExtra.remove(tempDir).catch(() => {});
        }

        const uid = generateUidBasedOnHash(finalCollectionPath);
        const { size, filesCount } = await getCollectionStats(finalCollectionPath);
        brunoConfig.size = size;
        brunoConfig.filesCount = filesCount;

        mainWindow.webContents.send('main:collection-opened', finalCollectionPath, uid, brunoConfig);
        ipcMain.emit('main:collection-opened', mainWindow, finalCollectionPath, uid, brunoConfig);

        return finalCollectionPath;
      } catch (error) {
        await fsExtra.remove(tempDir).catch(() => {});
        throw error;
      }
    } catch (error) {
      throw error;
    }
  });

  // Lightweight check for polling — only fetches and hashes, no endpoint extraction or diff
  ipcMain.handle('renderer:check-openapi-updates', async (event, { collectionPath, sourceUrl, storedSpecHash }) => {
    try {
      if (isLocalFilePath(sourceUrl)) {
        const resolvedPath = collectionPath ? path.resolve(collectionPath, sourceUrl) : sourceUrl;
        if (!fs.existsSync(resolvedPath)) {
          return { hasUpdates: false, error: `Spec file not found at: ${sourceUrl}`, errorCode: 'LOCAL_FILE_NOT_FOUND' };
        }
        const content = fs.readFileSync(resolvedPath, 'utf8');
        const remoteSpecHash = generateSpecHash(parseSpec(content));
        return { hasUpdates: !storedSpecHash || storedSpecHash !== remoteSpecHash, remoteSpecHash };
      }

      if (!isValidHttpUrl(sourceUrl)) {
        return { hasUpdates: false, error: 'Invalid URL: only http and https are allowed' };
      }

      const cacheBustUrl = sourceUrl.includes('?')
        ? `${sourceUrl}&_=${Date.now()}`
        : `${sourceUrl}?_=${Date.now()}`;

      let response;
      try {
        response = await fetch(cacheBustUrl, {
          headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' },
          signal: AbortSignal.timeout(30000)
        });
      } catch (fetchErr) {
        const reason = fetchErr.cause?.code || fetchErr.name || 'unknown';
        return { hasUpdates: false, error: `Could not reach ${sourceUrl} (${reason})` };
      }

      if (!response.ok) {
        return { hasUpdates: false, error: `Failed to fetch spec: ${response.status}` };
      }

      const content = await response.text();
      const parsed = parseSpec(content);

      const remoteSpecHash = generateSpecHash(parsed);
      const hasUpdates = !storedSpecHash || storedSpecHash !== remoteSpecHash;

      return { hasUpdates, remoteSpecHash };
    } catch (error) {
      console.error('[OpenAPI Sync] Lightweight check error:', error.message);
      return { hasUpdates: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:compare-openapi-specs', async (event, { collectionPath, sourceUrl }) => {
    try {
      if (!isValidHttpUrl(sourceUrl) && !isLocalFilePath(sourceUrl)) {
        throw new Error('Invalid source: only http/https URLs and local file paths are allowed');
      }

      // Validate that the spec is a valid OpenAPI document
      const isValidOpenApiSpec = (spec) => {
        if (!spec || typeof spec !== 'object') return false;

        // Check for OpenAPI 3.x
        if (spec.openapi && typeof spec.openapi === 'string' && spec.openapi.startsWith('3.')) {
          return spec.paths && typeof spec.paths === 'object';
        }

        // Check for Swagger 2.x
        if (spec.swagger && spec.swagger === '2.0') {
          return spec.paths && typeof spec.paths === 'object';
        }

        return false;
      };

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

      let newSpecContent, newSpec;

      if (isLocalFilePath(sourceUrl)) {
        const resolvedPath = collectionPath ? path.resolve(collectionPath, sourceUrl) : sourceUrl;
        if (!fs.existsSync(resolvedPath)) {
          return {
            isValid: false,
            error: `Spec file not found at: ${sourceUrl}`,
            errorCode: 'LOCAL_FILE_NOT_FOUND',
            storedSpec,
            storedSpecMissing
          };
        }
        newSpecContent = fs.readFileSync(resolvedPath, 'utf8');
        newSpec = parseSpec(newSpecContent);
        if (!isValidOpenApiSpec(newSpec)) {
          return {
            isValid: false,
            error: 'The file does not contain a valid OpenAPI/Swagger specification',
            added: [],
            removed: [],
            unchanged: [],
            hasChanges: false
          };
        }
      } else {
        // Add cache-busting and no-cache headers to bypass GitHub CDN caching
        const cacheBustUrl = sourceUrl.includes('?')
          ? `${sourceUrl}&_=${Date.now()}`
          : `${sourceUrl}?_=${Date.now()}`;

        let response;
        try {
          response = await fetch(cacheBustUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            signal: AbortSignal.timeout(30000)
          });
        } catch (fetchErr) {
          const reason = fetchErr.cause?.code || fetchErr.name || 'unknown';
          return {
            isValid: false,
            error: `Could not reach ${sourceUrl} (${reason})`,
            storedSpec,
            storedSpecMissing
          };
        }

        if (!response.ok) {
          return {
            isValid: false,
            error: `Failed to fetch spec: ${response.status} ${response.statusText}`,
            storedSpec,
            storedSpecMissing
          };
        }

        newSpecContent = await response.text();
        newSpec = parseSpec(newSpecContent);

        // Validate that the fetched content is a valid OpenAPI spec
        if (!isValidOpenApiSpec(newSpec)) {
          return {
            isValid: false,
            error: 'The URL does not point to a valid OpenAPI/Swagger specification',
            added: [],
            removed: [],
            unchanged: [],
            hasChanges: false
          };
        }
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
      const totalLines = Math.max(
        (storedContent || '').split('\n').length,
        newSpecContent.split('\n').length
      );
      const unifiedDiff = createTwoFilesPatch(
        correctSpecFilename, correctSpecFilename,
        storedContent || '', newSpecContent,
        'Current Spec', 'New Spec',
        { context: totalLines }
      );

      return {
        ...diff,
        isValid: true,
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

  // Collection Drift Detection - compare stored spec (converted to bru) vs actual .bru files
  ipcMain.handle('renderer:get-collection-drift', async (event, { collectionPath, collectionItems, brunoConfig: passedBrunoConfig, compareSpec }) => {
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
      const specItems = new Map();
      const flattenSpecItems = (items, parentPath = '') => {
        for (const item of items) {
          if (item.type === 'folder' && item.items) {
            flattenSpecItems(item.items, path.join(parentPath, item.name || ''));
          } else if (item.request) {
            const method = item.request.method?.toUpperCase() || 'GET';
            const urlPath = normalizeUrlPath(item.request.url);
            const id = `${method}:${urlPath}`;
            specItems.set(id, { ...item, expectedPath: parentPath });
          }
        }
      };
      flattenSpecItems(specAsCollection.items || []);

      // Build collection endpoints — prefer passed items from Redux, fall back to disk scanning
      let collectionEndpoints;

      if (collectionItems) {
        // Fast path: use pre-parsed items from the renderer
        collectionEndpoints = collectionItems.map((item) => ({
          fullPath: item.pathname,
          relativePath: path.relative(collectionPath, item.pathname),
          request: item.request,
          name: item.name
        }));
      } else {
        // Fallback: scan and parse from disk
        const scanCollectionFiles = (dirPath, relativePath = '') => {
          const files = [];
          if (!fs.existsSync(dirPath)) return files;
          const entries = fs.readdirSync(dirPath);
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const relPath = relativePath ? path.join(relativePath, entry) : entry;
            if (['node_modules', '.git', 'resources', 'environments'].includes(entry)) continue;
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
              files.push(...scanCollectionFiles(fullPath, relPath));
            } else if ((entry.endsWith('.bru') || entry.endsWith('.yml'))
              && !entry.startsWith('folder.') && !entry.startsWith('collection.') && !entry.startsWith('opencollection.')) {
              files.push({ fullPath, relativePath: relPath });
            }
          }
          return files;
        };

        const collectionFiles = scanCollectionFiles(collectionPath);
        collectionEndpoints = [];
        for (const { fullPath, relativePath } of collectionFiles) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const fileFormat = fullPath.endsWith('.yml') ? 'yml' : 'bru';
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

          // Compare parameters (by name, ignoring values which are user-set)
          const specParamNames = (specRequest.params || []).map((p) => p.name).sort();
          const actualParamNames = (actualRequest.params || []).map((p) => p.name).sort();

          // Compare headers (by name)
          const specHeaderNames = (specRequest.headers || []).map((h) => h.name).sort();
          const actualHeaderNames = (actualRequest.headers || []).map((h) => h.name).sort();

          // Check for differences
          const paramsDiff = JSON.stringify(specParamNames) !== JSON.stringify(actualParamNames);
          const headersDiff = JSON.stringify(specHeaderNames) !== JSON.stringify(actualHeaderNames);

          // Check body mode difference
          const specBodyMode = specRequest.body?.mode || 'none';
          const actualBodyMode = actualRequest.body?.mode || 'none';
          const bodyDiff = specBodyMode !== actualBodyMode;

          // Check auth mode difference
          const specAuthMode = specRequest.auth?.mode || 'none';
          const actualAuthMode = actualRequest.auth?.mode || 'none';
          const authDiff = specAuthMode !== actualAuthMode;

          // Check form field names when body modes match and mode is form-based
          let formFieldsDiff = false;
          let specFormFieldNames = [];
          let actualFormFieldNames = [];
          if (!bodyDiff && (specBodyMode === 'formUrlEncoded' || specBodyMode === 'multipartForm')) {
            specFormFieldNames = (specRequest.body?.[specBodyMode] || []).map((f) => f.name).sort();
            actualFormFieldNames = (actualRequest.body?.[specBodyMode] || []).map((f) => f.name).sort();
            formFieldsDiff = JSON.stringify(specFormFieldNames) !== JSON.stringify(actualFormFieldNames);
          }

          if (paramsDiff || headersDiff || bodyDiff || authDiff || formFieldsDiff) {
            const changes = [];
            if (paramsDiff) {
              const addedParams = actualParamNames.filter((p) => !specParamNames.includes(p));
              const removedParams = specParamNames.filter((p) => !actualParamNames.includes(p));
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
            if (formFieldsDiff) {
              const addedFields = actualFormFieldNames.filter((f) => !specFormFieldNames.includes(f));
              const removedFields = specFormFieldNames.filter((f) => !actualFormFieldNames.includes(f));
              if (addedFields.length) changes.push(`+${addedFields.length} form fields`);
              if (removedFields.length) changes.push(`-${removedFields.length} form fields`);
            }

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
      let specItem = null;
      const findSpecItem = (items) => {
        for (const item of items) {
          if (item.type === 'folder' && item.items) {
            const found = findSpecItem(item.items);
            if (found) return found;
          } else if (item.request) {
            const itemMethod = item.request.method?.toUpperCase() || 'GET';
            const itemPath = normalizeUrlPath(item.request.url);
            if (itemMethod === method.toUpperCase() && itemPath === endpointPath) {
              return item;
            }
          }
        }
        return null;
      };
      specItem = findSpecItem(specAsCollection.items || []);

      // Find the actual collection file for this endpoint
      let actualRequest = null;
      const findActualRequest = (dirPath) => {
        if (!fs.existsSync(dirPath)) return null;

        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry);
          if (['node_modules', '.git', 'resources', 'environments'].includes(entry)) continue;

          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            const found = findActualRequest(fullPath);
            if (found) return found;
          } else if ((entry.endsWith('.bru') || entry.endsWith('.yml'))
            && !entry.startsWith('folder.') && !entry.startsWith('collection.') && !entry.startsWith('opencollection.')) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const fileFormat = entry.endsWith('.yml') ? 'yml' : 'bru';
              const request = parseRequest(content, { format: fileFormat });

              if (request?.request) {
                const reqMethod = request.request.method?.toUpperCase() || 'GET';
                const reqPath = normalizeUrlPath(request.request.url);

                if (reqMethod === method.toUpperCase() && reqPath === endpointPath) {
                  return request;
                }
              }
            } catch (err) {
              // Skip files that can't be parsed
            }
          }
        }
        return null;
      };
      actualRequest = findActualRequest(collectionPath);

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
        const specItemsMap = new Map();
        const flattenItems = (items, parentFolder = null) => {
          for (const item of items) {
            if (item.type === 'folder' && item.items) {
              flattenItems(item.items, item.name);
            } else if (item.request) {
              const method = item.request.method?.toUpperCase() || 'GET';
              const urlPath = normalizeUrlPath(item.request.url);
              const id = `${method}:${urlPath}`;
              specItemsMap.set(id, { ...item, folderName: parentFolder });
            }
          }
        };
        flattenItems(newCollection.items || []);

        // Find and update existing .bru files
        const findAndResetRequest = async (dirPath) => {
          if (!fs.existsSync(dirPath)) return;

          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory() && !['node_modules', '.git', 'resources', 'environments'].includes(file)) {
              await findAndResetRequest(filePath);
            } else if ((file.endsWith('.bru') || file.endsWith('.yml'))
              && !file.startsWith('folder.') && !file.startsWith('collection.')) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const fileFormat = file.endsWith('.yml') ? 'yml' : 'bru';
                const existingRequest = parseRequest(content, { format: fileFormat });

                if (existingRequest?.request) {
                  const method = existingRequest.request.method?.toUpperCase() || 'GET';
                  const urlPath = normalizeUrlPath(existingRequest.request.url);
                  const id = `${method}:${urlPath}`;

                  const specItem = specItemsMap.get(id);
                  if (specItem) {
                    // Reset to spec while preserving tests, scripts, assertions
                    const mergedRequest = {
                      ...existingRequest,
                      request: {
                        ...specItem.request,
                        // Preserve user values for params and headers where names match
                        params: specItem.request.params?.map((newParam) => {
                          const existing = existingRequest.request.params?.find((p) => p.name === newParam.name);
                          return existing ? { ...newParam, value: existing.value, enabled: existing.enabled } : newParam;
                        }) || [],
                        headers: specItem.request.headers?.map((newHeader) => {
                          const existing = existingRequest.request.headers?.find((h) => h.name === newHeader.name);
                          return existing ? { ...newHeader, value: existing.value, enabled: existing.enabled } : newHeader;
                        }) || []
                      }
                    };

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
            const safeFolderName = sanitizeName(specItem.folderName);
            targetFolder = path.join(collectionPath, safeFolderName);
            if (!isPathInsideCollection(targetFolder, collectionPath)) {
              console.error(`[OpenAPI Sync Reset] Path traversal blocked in folder name: ${specItem.folderName}`);
              targetFolder = collectionPath;
            } else if (!fs.existsSync(targetFolder)) {
              fs.mkdirSync(targetFolder, { recursive: true });
              const folderBruPath = path.join(targetFolder, `folder.${format}`);
              const folderContent = await stringifyFolder({ meta: { name: safeFolderName } }, { format });
              await writeFile(folderBruPath, folderContent);
            }
          }

          const requestContent = await stringifyRequestViaWorker(specItem, { format });
          const sanitizedFilename = sanitizeName(specItem.filename || `${specItem.name}.${format}`);
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

      // Mode: sync (default) - Existing behavior
      if (addNewRequests && diff.added?.length > 0 && diff.newSpec) {
        const openapiEntrySyncAdded = (brunoConfig.openapi || []).find((e) => e.sourceUrl === sourceUrl);
        const groupBy = openapiEntrySyncAdded?.groupBy || 'tags';
        const newCollection = openApiToBruno(diff.newSpec, { groupBy });

        for (const endpoint of diff.added) {
          const normalizedPath = normalizeUrlPath(endpoint.path);
          const result = findItemInCollection(newCollection.items, endpoint.method, endpoint.path);
          const newItem = result?.item;

          if (newItem) {
            // Check if endpoint already exists in collection (prevents overwriting user customizations)
            const existingFile = findRequestFileOnDisk(collectionPath, endpoint.method.toUpperCase(), normalizedPath);

            if (existingFile) {
              // Merge instead of overwrite — preserve user's tests, scripts, assertions, param values
              const existingRequest = existingFile.request;
              const mergedRequest = {
                ...existingRequest,
                request: {
                  ...existingRequest.request,
                  url: newItem.request.url,
                  body: newItem.request.body,
                  auth: newItem.request.auth,
                  params: newItem.request.params?.map((newParam) => {
                    const existing = existingRequest.request.params?.find((p) => p.name === newParam.name);
                    return existing ? { ...newParam, value: existing.value, enabled: existing.enabled } : newParam;
                  }) || existingRequest.request.params,
                  headers: newItem.request.headers?.map((newHeader) => {
                    const existing = existingRequest.request.headers?.find((h) => h.name === newHeader.name);
                    return existing ? { ...newHeader, value: existing.value, enabled: existing.enabled } : newHeader;
                  }) || existingRequest.request.headers
                }
              };
              const content = await stringifyRequestViaWorker(mergedRequest, { format: existingFile.fileFormat });
              await writeFile(existingFile.filePath, content);
            } else {
              // Truly new — create file as before
              let targetFolder = collectionPath;
              if (endpoint.tags?.length > 0 && groupBy === 'tags') {
                const folderName = sanitizeName(endpoint.tags[0]);
                targetFolder = path.join(collectionPath, folderName);
                if (!isPathInsideCollection(targetFolder, collectionPath)) {
                  console.error(`[OpenAPI Sync] Path traversal blocked in tag folder name: ${endpoint.tags[0]}`);
                  targetFolder = collectionPath;
                } else if (!fs.existsSync(targetFolder)) {
                  fs.mkdirSync(targetFolder, { recursive: true });
                  const folderBruPath = path.join(targetFolder, `folder.${format}`);
                  const folderContent = await stringifyFolder({ meta: { name: folderName } }, { format });
                  await writeFile(folderBruPath, folderContent);
                }
              }

              const requestContent = await stringifyRequestViaWorker(newItem, { format });
              const sanitizedFilename = sanitizeName(newItem.filename || `${newItem.name}.${format}`);
              await writeFile(path.join(targetFolder, sanitizedFilename), requestContent);
            }
          }
        }
      }

      if (removeDeletedRequests && diff.removed?.length > 0) {
        const findAndRemoveRequest = (dirPath) => {
          if (!fs.existsSync(dirPath)) return;

          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory() && !['node_modules', '.git', 'resources', 'environments'].includes(file)) {
              findAndRemoveRequest(filePath);
            } else if (file.endsWith('.bru') || file.endsWith('.yml')) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const request = parseRequest(content, { format: file.endsWith('.yml') ? 'yml' : 'bru' });

                if (request?.request) {
                  const method = request.request.method?.toUpperCase();
                  const url = request.request.url?.replace('{{baseUrl}}', '');

                  for (const removed of diff.removed) {
                    const removedPath = removed.path.replace(/{([^}]+)}/g, ':$1');
                    if (method === removed.method.toUpperCase() && url === removedPath) {
                      fs.unlinkSync(filePath);
                      break;
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
      if (localOnlyToRemove?.length > 0) {
        for (const endpoint of localOnlyToRemove) {
          if (endpoint.filePath) {
            const fullPath = path.resolve(collectionPath, endpoint.filePath);
            if (!isPathInsideCollection(fullPath, collectionPath)) {
              console.error(`[OpenAPI Sync] Path traversal blocked in localOnlyToRemove: ${endpoint.filePath}`);
              continue;
            }
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          }
        }
      }

      // Handle modified endpoints with conflict resolutions
      // endpointDecisions: { endpointId: 'keep-mine' | 'accept-incoming' }
      // Only apply changes for endpoints marked as 'accept-incoming' or not in decisions (default: apply)
      if (diff.modified?.length > 0 && diff.newSpec && diff.newSpec.paths) {
        const openapiEntryModified = (brunoConfig.openapi || []).find((e) => e.sourceUrl === sourceUrl);
        const groupBy = openapiEntryModified?.groupBy || 'tags';
        let newCollection;
        try {
          newCollection = openApiToBruno(diff.newSpec, { groupBy });
        } catch (err) {
          console.error('[OpenAPI Sync] Error converting spec for modified endpoints:', err);
          // Skip modified endpoint handling if conversion fails
          newCollection = null;
        }

        if (newCollection) {
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
              // Parse the existing file and merge with new data
              const existingRequest = existingFile.request;

              // Preserve user's tests, scripts, assertions, etc.
              const mergedRequest = {
                ...existingRequest,
                request: {
                  ...existingRequest.request,
                  url: newItem.request.url,
                  body: newItem.request.body, // Use incoming body from spec
                  auth: newItem.request.auth, // Use incoming auth from spec
                  // Update params from new spec while preserving enabled state
                  params: newItem.request.params?.map((newParam) => {
                    const existing = existingRequest.request.params?.find((p) => p.name === newParam.name);
                    return existing ? { ...newParam, value: existing.value, enabled: existing.enabled } : newParam;
                  }) || existingRequest.request.params,
                  headers: newItem.request.headers?.map((newHeader) => {
                    const existing = existingRequest.request.headers?.find((h) => h.name === newHeader.name);
                    return existing ? { ...newHeader, value: existing.value, enabled: existing.enabled } : newHeader;
                  }) || existingRequest.request.headers
                }
              };

              const content = await stringifyRequestViaWorker(mergedRequest, { format: existingFile.fileFormat });
              await writeFile(existingFile.filePath, content);
            }
          }
        } // Close the else block for newCollection check
      }

      // Handle drifted endpoints to reset (collection differs from stored spec)
      // These are endpoints where user chose 'accept-incoming' to reset to spec
      if (driftedToReset?.length > 0) {
        // Load stored spec for reset (or use newSpec if available)
        const specToUse = diff.newSpec || (await (async () => {
          const applySpecEntry = getSpecEntryForUrl(collectionPath, sourceUrl);
          const storedSpecPath = applySpecEntry ? path.join(getSpecsDir(), applySpecEntry.filename) : null;
          if (storedSpecPath && fs.existsSync(storedSpecPath)) {
            const content = fs.readFileSync(storedSpecPath, 'utf8');
            return parseSpec(content);
          }
          return null;
        })());

        if (specToUse) {
          const openapiEntryDrift = (brunoConfig.openapi || []).find((e) => e.sourceUrl === sourceUrl);
          const groupBy = openapiEntryDrift?.groupBy || 'tags';
          let specCollection;
          try {
            specCollection = openApiToBruno(specToUse, { groupBy });
          } catch (err) {
            console.error('[OpenAPI Sync] Error converting spec for drift reset:', err);
          }

          if (specCollection) {
            // Build map of spec items
            const specItemsMap = new Map();
            const flattenItems = (items) => {
              for (const item of items) {
                if (item.type === 'folder' && item.items) {
                  flattenItems(item.items);
                } else if (item.request) {
                  const method = item.request.method?.toUpperCase() || 'GET';
                  const urlPath = normalizeUrlPath(item.request.url);
                  const id = `${method}:${urlPath}`;
                  specItemsMap.set(id, item);
                }
              }
            };
            flattenItems(specCollection.items || []);

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
                    const fileFormat = fullPath.endsWith('.yml') ? 'yml' : 'bru';
                    const existingContent = fs.readFileSync(fullPath, 'utf8');
                    const existingRequest = parseRequest(existingContent, { format: fileFormat });

                    // Reset to spec while preserving tests/scripts/assertions
                    const mergedRequest = {
                      ...existingRequest,
                      request: {
                        ...specItem.request,
                        // Preserve user values where names match
                        params: specItem.request.params?.map((newParam) => {
                          const existing = existingRequest.request?.params?.find((p) => p.name === newParam.name);
                          return existing ? { ...newParam, value: existing.value, enabled: existing.enabled } : newParam;
                        }) || [],
                        headers: specItem.request.headers?.map((newHeader) => {
                          const existing = existingRequest.request?.headers?.find((h) => h.name === newHeader.name);
                          return existing ? { ...newHeader, value: existing.value, enabled: existing.enabled } : newHeader;
                        }) || []
                      }
                    };

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

  // Read stored OpenAPI spec file content
  ipcMain.handle('renderer:read-collection-file', async (event, { collectionPath, relativePath }) => {
    try {
      const filePath = path.join(collectionPath, relativePath);
      if (!fs.existsSync(filePath)) {
        return { error: 'File not found' };
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return { content };
    } catch (error) {
      return { error: error.message || 'Failed to read file' };
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

      // Read stored spec (supports both JSON and YAML)
      const addMissingSourceUrl = brunoConfig?.openapi?.[0]?.sourceUrl;
      const addMissingEntry = addMissingSourceUrl ? getSpecEntryForUrl(collectionPath, addMissingSourceUrl) : null;
      const specPath = addMissingEntry ? path.join(getSpecsDir(), addMissingEntry.filename) : null;

      if (!specPath || !fs.existsSync(specPath)) {
        throw new Error('No stored spec file found. Please sync with remote spec first.');
      }

      const specRaw = fs.readFileSync(specPath, 'utf8');
      const storedSpec = parseSpec(specRaw);
      const groupBy = brunoConfig?.openapi?.[0]?.groupBy || 'tags';
      const specCollection = openApiToBruno(storedSpec, { groupBy });

      let addedCount = 0;
      for (const endpoint of endpoints) {
        const result = findItemInCollection(specCollection.items, endpoint.method, endpoint.path);

        if (result) {
          const { item: specItem, folderName } = result;
          let targetFolder = collectionPath;

          // Use folder name from spec collection structure
          if (folderName && groupBy === 'tags') {
            const safeFolderName = sanitizeName(folderName);
            targetFolder = path.join(collectionPath, safeFolderName);
            if (!isPathInsideCollection(targetFolder, collectionPath)) {
              console.error(`[add-missing-endpoints] Path traversal blocked in folder name: ${folderName}`);
              targetFolder = collectionPath;
            } else if (!fs.existsSync(targetFolder)) {
              fs.mkdirSync(targetFolder, { recursive: true });
              const folderBruPath = path.join(targetFolder, `folder.${format}`);
              const folderContent = await stringifyFolder({ meta: { name: safeFolderName } }, { format });
              await writeFile(folderBruPath, folderContent);
            }
          }

          const requestContent = await stringifyRequestViaWorker(specItem, { format });
          const sanitizedFilename = sanitizeName(specItem.filename || `${specItem.name}.${format}`);
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
      const { format, brunoConfig } = loadBrunoConfig(collectionPath);

      // Read stored spec (supports both JSON and YAML)
      const resetSourceUrl = brunoConfig?.openapi?.[0]?.sourceUrl;
      const resetSpecEntry = resetSourceUrl ? getSpecEntryForUrl(collectionPath, resetSourceUrl) : null;
      const specPath = resetSpecEntry ? path.join(getSpecsDir(), resetSpecEntry.filename) : null;

      if (!specPath || !fs.existsSync(specPath)) {
        throw new Error('No stored spec file found. Please sync with remote spec first.');
      }

      const specRaw = fs.readFileSync(specPath, 'utf8');
      const storedSpec = parseSpec(specRaw);
      const groupBy = brunoConfig?.openapi?.[0]?.groupBy || 'tags';
      const specCollection = openApiToBruno(storedSpec, { groupBy });

      let resetCount = 0;
      for (const endpoint of endpoints) {
        // Find the spec version of this endpoint
        const specItem = findItemInCollection(specCollection.items, endpoint.method, endpoint.path)?.item;

        if (specItem && endpoint.pathname) {
          if (!isPathInsideCollection(endpoint.pathname, collectionPath)) {
            console.error(`[OpenAPI Sync] Path traversal blocked in reset-endpoints: ${endpoint.pathname}`);
            continue;
          }
          // Overwrite the existing file with the spec version
          const requestContent = await stringifyRequestViaWorker(specItem, { format });
          await writeFile(endpoint.pathname, requestContent);
          resetCount++;
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

const registerMainEventHandlers = (mainWindow, watcher) => {
  ipcMain.on('main:open-collection', () => {
    if (watcher && mainWindow) {
      openCollectionDialog(mainWindow, watcher);
    }
  });

  ipcMain.on('main:open-docs', () => {
    const docsURL = 'https://docs.usebruno.com';
    shell.openExternal(docsURL);
  });

  ipcMain.on('main:collection-opened', async (win, pathname, uid, brunoConfig) => {
    app.addRecentDocument(pathname);
  });

  ipcMain.handle('renderer:scan-for-bruno-files', (event, dir) => {
    try {
      return scanForBrunoFiles(dir);
    } catch (error) {
      throw new Error(error.message);
    }
  });

  // The app listen for this event and allows the user to save unsaved requests before closing the app
  ipcMain.on('main:start-quit-flow', () => {
    mainWindow.webContents.send('main:start-quit-flow');
  });

  ipcMain.handle('main:complete-quit-flow', () => {
    mainWindow.destroy();
  });

  ipcMain.handle('main:force-quit', () => {
    process.exit();
  });
};

const registerCollectionsIpc = (mainWindow, watcher) => {
  registerRendererEventHandlers(mainWindow, watcher);
  registerMainEventHandlers(mainWindow, watcher);
};

module.exports = registerCollectionsIpc;
