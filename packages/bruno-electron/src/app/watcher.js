const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { hasJsonExtension, hasBruExtension, writeFile } = require('../utils/filesystem');
const { bruToEnvJson, envJsonToBru, bruToJson, jsonToBru } = require('../bru');

const { isLegacyEnvFile, migrateLegacyEnvFile, isLegacyBruFile, migrateLegacyBruFile } = require('../bru/migrate');
const { itemSchema } = require('@usebruno/schema');
const { uuid } = require('../utils/common');
const { getRequestUid } = require('../cache/requestUids');

const isJsonEnvironmentConfig = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === 'environments.json';
};

const isBruEnvironmentConfig = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const envDirectory = path.join(collectionPath, 'environments');
  const basename = path.basename(pathname);

  return dirname === envDirectory && hasBruExtension(basename);
};

const hydrateRequestWithUuid = (request, pathname) => {
  request.uid = getRequestUid(pathname);

  const params = _.get(request, 'request.params', []);
  const headers = _.get(request, 'request.headers', []);
  const requestVars = _.get(request, 'request.vars.req', []);
  const responseVars = _.get(request, 'request.vars.res', []);
  const assertions = _.get(request, 'request.assertions', []);
  const bodyFormUrlEncoded = _.get(request, 'request.body.formUrlEncoded', []);
  const bodyMultipartForm = _.get(request, 'request.body.multipartForm', []);

  params.forEach((param) => (param.uid = uuid()));
  headers.forEach((header) => (header.uid = uuid()));
  requestVars.forEach((variable) => (variable.uid = uuid()));
  responseVars.forEach((variable) => (variable.uid = uuid()));
  assertions.forEach((assertion) => (assertion.uid = uuid()));
  bodyFormUrlEncoded.forEach((param) => (param.uid = uuid()));
  bodyMultipartForm.forEach((param) => (param.uid = uuid()));

  return request;
};

const addEnvironmentFile = async (win, pathname, collectionUid) => {
  try {
    const basename = path.basename(pathname);
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: basename
      }
    };

    let bruContent = fs.readFileSync(pathname, 'utf8');

    // migrate old env json to bru file
    if (isLegacyEnvFile(bruContent)) {
      bruContent = await migrateLegacyEnvFile(bruContent, pathname);
    }

    file.data = bruToEnvJson(bruContent);
    file.data.name = basename.substring(0, basename.length - 4);
    file.data.uid = getRequestUid(pathname);

    _.each(_.get(file, 'data.variables', []), (variable) => (variable.uid = uuid()));
    win.webContents.send('main:collection-tree-updated', 'addEnvironmentFile', file);
  } catch (err) {
    console.error(err);
  }
};

const changeEnvironmentFile = async (win, pathname, collectionUid) => {
  try {
    const basename = path.basename(pathname);
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: basename
      }
    };

    const bruContent = fs.readFileSync(pathname, 'utf8');
    file.data = bruToEnvJson(bruContent);
    file.data.name = basename.substring(0, basename.length - 4);
    file.data.uid = getRequestUid(pathname);
    _.each(_.get(file, 'data.variables', []), (variable) => (variable.uid = uuid()));

    // we are reusing the addEnvironmentFile event itself
    // this is because the uid of the pathname remains the same
    // and the collection tree will be able to update the existing environment
    win.webContents.send('main:collection-tree-updated', 'addEnvironmentFile', file);
  } catch (err) {
    console.error(err);
  }
};

const unlinkEnvironmentFile = async (win, pathname, collectionUid) => {
  try {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      },
      data: {
        uid: getRequestUid(pathname),
        name: path.basename(pathname).substring(0, path.basename(pathname).length - 4)
      }
    };

    win.webContents.send('main:collection-tree-updated', 'unlinkEnvironmentFile', file);
  } catch (err) {
    console.error(err);
  }
};

const add = async (win, pathname, collectionUid, collectionPath) => {
  console.log(`watcher add: ${pathname}`);

  if (isJsonEnvironmentConfig(pathname, collectionPath)) {
    try {
      const dirname = path.dirname(pathname);
      const bruContent = fs.readFileSync(pathname, 'utf8');

      const jsonData = JSON.parse(bruContent);

      const envDirectory = path.join(dirname, 'environments');
      if (!fs.existsSync(envDirectory)) {
        fs.mkdirSync(envDirectory);
      }

      for (const env of jsonData) {
        const bruEnvFilename = path.join(envDirectory, `${env.name}.bru`);
        const bruContent = envJsonToBru(env);
        await writeFile(bruEnvFilename, bruContent);
      }

      await fs.unlinkSync(pathname);
    } catch (err) {
      // do nothing
    }

    return;
  }

  if (isBruEnvironmentConfig(pathname, collectionPath)) {
    return addEnvironmentFile(win, pathname, collectionUid);
  }

  // migrate old json files to bru
  if (hasJsonExtension(pathname)) {
    try {
      const json = fs.readFileSync(pathname, 'utf8');
      const jsonData = JSON.parse(json);

      await itemSchema.validate(jsonData);

      const content = jsonToBru(jsonData);

      const re = /(.*)\.json$/;
      const subst = `$1.bru`;
      const bruFilename = pathname.replace(re, subst);

      await writeFile(bruFilename, content);
      await fs.unlinkSync(pathname);
    } catch (err) {
      // do nothing
    }
  }

  if (hasBruExtension(pathname)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };

    try {
      let bruContent = fs.readFileSync(pathname, 'utf8');

      // migrate old bru format to new bru format
      if (isLegacyBruFile(bruContent)) {
        bruContent = await migrateLegacyBruFile(bruContent, pathname);
      }

      file.data = bruToJson(bruContent);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);
    } catch (err) {
      console.error(err);
    }
  }
};

const addDirectory = (win, pathname, collectionUid, collectionPath) => {
  const envDirectory = path.join(collectionPath, 'environments');

  if (pathname === envDirectory) {
    return;
  }

  const directory = {
    meta: {
      collectionUid,
      pathname,
      name: path.basename(pathname)
    }
  };
  win.webContents.send('main:collection-tree-updated', 'addDir', directory);
};

const change = async (win, pathname, collectionUid, collectionPath) => {
  if (isBruEnvironmentConfig(pathname, collectionPath)) {
    return changeEnvironmentFile(win, pathname, collectionUid);
  }

  if (hasBruExtension(pathname)) {
    try {
      const file = {
        meta: {
          collectionUid,
          pathname,
          name: path.basename(pathname)
        }
      };

      const bru = fs.readFileSync(pathname, 'utf8');
      file.data = bruToJson(bru);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'change', file);
    } catch (err) {
      console.error(err);
    }
  }
};

const unlink = (win, pathname, collectionUid, collectionPath) => {
  if (isBruEnvironmentConfig(pathname, collectionPath)) {
    return unlinkEnvironmentFile(win, pathname, collectionUid);
  }

  if (hasBruExtension(pathname)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };
    win.webContents.send('main:collection-tree-updated', 'unlink', file);
  }
};

const unlinkDir = (win, pathname, collectionUid, collectionPath) => {
  const envDirectory = path.join(collectionPath, 'environments');

  if (pathname === envDirectory) {
    return;
  }

  const directory = {
    meta: {
      collectionUid,
      pathname,
      name: path.basename(pathname)
    }
  };
  win.webContents.send('main:collection-tree-updated', 'unlinkDir', directory);
};

class Watcher {
  constructor() {
    this.watchers = {};
  }

  addWatcher(win, watchPath, collectionUid) {
    if (this.watchers[watchPath]) {
      this.watchers[watchPath].close();
    }

    // todo
    // enable this in a future release
    // once we can confirm all older json based files have been auto migrated to .bru format
    // watchPath = path.join(watchPath, '**/*.bru');

    const self = this;
    setTimeout(() => {
      const watcher = chokidar.watch(watchPath, {
        ignoreInitial: false,
        usePolling: false,
        ignored: (path) => ['node_modules', '.git', 'bruno.json'].some((s) => path.includes(s)),
        persistent: true,
        ignorePermissionErrors: true,
        awaitWriteFinish: {
          stabilityThreshold: 80,
          pollInterval: 10
        },
        depth: 20
      });

      watcher
        .on('add', (pathname) => add(win, pathname, collectionUid, watchPath))
        .on('addDir', (pathname) => addDirectory(win, pathname, collectionUid, watchPath))
        .on('change', (pathname) => change(win, pathname, collectionUid, watchPath))
        .on('unlink', (pathname) => unlink(win, pathname, collectionUid, watchPath))
        .on('unlinkDir', (pathname) => unlinkDir(win, pathname, collectionUid, watchPath));

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
  }
}

module.exports = Watcher;
