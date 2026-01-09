const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { getApiSpecUid } = require('../cache/apiSpecUids');
const yaml = require('js-yaml');
const { isDirectory } = require('../utils/filesystem');
const { safeParseJSON } = require('../utils/common');

const hasApiSpecExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  return ['yaml', 'yml', 'json'].some((ext) => filename.toLowerCase().endsWith(`.${ext}`));
};

const parseApiSpecContent = (pathname) => {
  const extension = path.extname(pathname).toLowerCase();
  let content = fs.readFileSync(pathname, 'utf8');

  if (extension === '.yaml' || extension === '.yml') {
    return yaml.load(content);
  } else if (extension === '.json') {
    return safeParseJSON(content);
  }
  return null;
};

const hydrateApiSpecWithUuid = (apiSpec, pathname) => {
  apiSpec.uid = getApiSpecUid(pathname);
  return apiSpec;
};

const add = async (win, pathname) => {
  if (!hasApiSpecExtension(pathname)) return;
  try {
    const basename = path.basename(pathname);
    const file = {};
    const apiSpecContent = parseApiSpecContent(pathname);

    file.raw = fs.readFileSync(pathname, 'utf8');
    file.name = apiSpecContent?.info?.title || basename.split('.')[0];
    file.filename = basename;
    file.pathname = pathname;
    file.json = apiSpecContent;
    hydrateApiSpecWithUuid(file, pathname);
    win.webContents.send('main:apispec-tree-updated', 'addFile', file);
  } catch (err) {
    console.error(err);
  }
};

const change = async (win, pathname) => {
  if (!hasApiSpecExtension(pathname)) return;
  try {
    const basename = path.basename(pathname);
    const file = {};
    const apiSpecContent = parseApiSpecContent(pathname);

    file.raw = fs.readFileSync(pathname, 'utf8');
    file.name = apiSpecContent?.info?.title || basename.split('.')[0];
    file.filename = basename;
    file.pathname = pathname;
    file.json = apiSpecContent;
    hydrateApiSpecWithUuid(file, pathname);
    win.webContents.send('main:apispec-tree-updated', 'changeFile', file);
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

      watcher
        .on('add', (pathname) => add(win, pathname, apiSpecUid, watchPath, workspacePath))
        .on('change', (pathname) => change(win, pathname, apiSpecUid, watchPath, workspacePath));

      self.watchers[watchPath] = watcher;
    }, 100);
  }

  hasWatcher(watchPath) {
    return this.watchers[watchPath];
  }

  removeWatcher(watchPath, win) {
    if (this.watchers[watchPath]) {
      this.watchers[watchPath].close();
      this.watchers[watchPath] = null;
    }
    if (this.watcherWorkspaces[watchPath]) {
      delete this.watcherWorkspaces[watchPath];
    }
  }
}

module.exports = ApiSpecWatcher;
