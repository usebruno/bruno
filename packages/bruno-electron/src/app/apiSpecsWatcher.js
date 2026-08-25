const _ = require('lodash');
const fs = require('node:fs');
const path = require('node:path');
const chokidar = require('chokidar');
const { getApiSpecUid } = require('../cache/apiSpecUids');
const { isDirectory } = require('../utils/filesystem');
const { parseApiSpecContent, resolveExternalApiSpecRefs } = require('../utils/apiSpecs');

const hasApiSpecExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  return ['yaml', 'yml', 'json'].some((ext) => filename.toLowerCase().endsWith(`.${ext}`));
};

const hydrateApiSpecWithUuid = (apiSpec, pathname) => {
  apiSpec.uid = getApiSpecUid(pathname);
  return apiSpec;
};

const refFileWatchState = new Map();

const syncRefFileWatchers = (rootPath, refFilePaths) => {
  const state = refFileWatchState.get(rootPath);
  if (!state) return;

  const unwatched = refFilePaths.filter((filePath) => !state.watchedRefFilePaths.has(filePath));
  if (!unwatched.length) return;

  unwatched.forEach((filePath) => state.watchedRefFilePaths.add(filePath));
  state.watcher.add(unwatched);
};

const add = async (win, pathname) => {
  if (!hasApiSpecExtension(pathname)) return;
  try {
    const basename = path.basename(pathname);
    const file = {};
    const raw = fs.readFileSync(pathname, 'utf8');
    const extension = path.extname(pathname);
    const apiSpecContent = parseApiSpecContent(raw, extension);
    const { resolvedJson, refFilePaths } = await resolveExternalApiSpecRefs(apiSpecContent, pathname);

    file.raw = raw;
    file.name = apiSpecContent?.info?.title || basename.split('.')[0];
    file.filename = basename;
    file.pathname = pathname;
    file.json = apiSpecContent;
    file.resolvedJson = resolvedJson;
    hydrateApiSpecWithUuid(file, pathname);
    win.webContents.send('main:apispec-tree-updated', 'addFile', file);
    syncRefFileWatchers(pathname, refFilePaths);
  } catch (err) {
    console.error(err);
  }
};

const change = async (win, pathname) => {
  if (!hasApiSpecExtension(pathname)) return;
  try {
    const basename = path.basename(pathname);
    const file = {};
    const raw = fs.readFileSync(pathname, 'utf8');
    const extension = path.extname(pathname);
    const apiSpecContent = parseApiSpecContent(raw, extension);
    const { resolvedJson, refFilePaths } = await resolveExternalApiSpecRefs(apiSpecContent, pathname);

    file.raw = raw;
    file.name = apiSpecContent?.info?.title || basename.split('.')[0];
    file.filename = basename;
    file.pathname = pathname;
    file.json = apiSpecContent;
    file.resolvedJson = resolvedJson;
    hydrateApiSpecWithUuid(file, pathname);
    win.webContents.send('main:apispec-tree-updated', 'changeFile', file);
    syncRefFileWatchers(pathname, refFilePaths);
  } catch (err) {
    console.error(err);
  }
};

class ApiSpecWatcher {
  constructor() {
    this.watchers = {};
    this.watcherWorkspaces = {};
  }

  addWatcher(win, watchPath, apiSpecUid, brunoConfig, workspacePath = null) {
    // Avoid creating watcher for directories
    if (isDirectory(watchPath)) return;

    if (this.watchers[watchPath]) {
      this.watchers[watchPath].close();
      refFileWatchState.delete(watchPath);
    }

    if (workspacePath) {
      this.watcherWorkspaces[watchPath] = workspacePath;
    }

    // Always ignore node_modules and .git, regardless of user config
    // This prevents infinite loops with symlinked directories (e.g., npm workspaces)
    const defaultIgnores = ['node_modules', '.git'];
    const userIgnores = brunoConfig?.ignore || [];
    const ignores = [...new Set([...defaultIgnores, ...userIgnores])];

    const self = this;
    setTimeout(() => {
      const watcher = chokidar.watch(watchPath, {
        ignoreInitial: false,
        usePolling: watchPath.startsWith('\\\\') ? true : false,
        ignored: (filepath) => {
          const normalizedPath = filepath.replace(/\\/g, '/');
          const relativePath = path.relative(watchPath, normalizedPath);

          // Check if any path segment matches a default ignore pattern (handles symlinks)
          const pathSegments = relativePath.split(path.sep);
          if (pathSegments.some((segment) => defaultIgnores.includes(segment))) {
            return true;
          }

          return ignores.some((ignorePattern) => {
            const normalizedIgnorePattern = ignorePattern.replace(/\\/g, '/');
            return relativePath === normalizedIgnorePattern || relativePath.startsWith(normalizedIgnorePattern);
          });
        },
        persistent: true,
        ignorePermissionErrors: true,
        awaitWriteFinish: {
          stabilityThreshold: 80,
          pollInterval: 10
        },
        depth: 20
      });

      const isSpecItself = (pathname) => path.resolve(pathname) === path.resolve(watchPath);

      watcher
        .on('add', (pathname) => {
          if (isSpecItself(pathname)) add(win, watchPath);
          else change(win, watchPath);
        })
        .on('change', () => change(win, watchPath))
        .on('unlink', (pathname) => {
          if (!isSpecItself(pathname)) change(win, watchPath);
        })
        .on('error', (err) => console.error(`API spec watcher error for ${watchPath}:`, err));

      refFileWatchState.set(watchPath, { watcher, watchedRefFilePaths: new Set() });
      self.watchers[watchPath] = watcher;
    }, 100);
  }

  hasWatcher(watchPath) {
    return this.watchers[watchPath];
  }

  removeWatcher(watchPath, win) {
    refFileWatchState.delete(watchPath);
    if (this.watchers[watchPath]) {
      this.watchers[watchPath].close();
      this.watchers[watchPath] = null;
    }
    if (this.watcherWorkspaces[watchPath]) {
      delete this.watcherWorkspaces[watchPath];
    }
  }

  closeAllWatchers() {
    const pending = [];
    for (const [watchPath, watcher] of Object.entries(this.watchers)) {
      try {
        const result = watcher?.close();
        if (result && typeof result.then === 'function') pending.push(result);
      } catch (err) {}
    }
    this.watchers = {};
    this.watcherWorkspaces = {};
    refFileWatchState.clear();
    return Promise.allSettled(pending);
  }
}

module.exports = ApiSpecWatcher;
