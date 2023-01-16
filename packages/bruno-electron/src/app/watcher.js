const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { hasJsonExtension, hasBruExtension, writeFile } = require('../utils/filesystem');
const {
  bruToJson,
  jsonToBru
} = require('@usebruno/bruno-lang');
const { itemSchema } = require('@usebruno/schema');
const { generateUidBasedOnHash, uuid } = require('../utils/common');

const isEnvironmentConfig = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === 'environments.json';
}

const hydrateRequestWithUuid = (request, pathname) => {
  request.uid = generateUidBasedOnHash(pathname);

  const params = _.get(request, 'request.params', []);
  const headers = _.get(request, 'request.headers', []);
  const bodyFormUrlEncoded = _.get(request, 'request.body.formUrlEncoded', []);
  const bodyMultipartForm = _.get(request, 'request.body.multipartForm', []);

  params.forEach((param) => param.uid = uuid());
  headers.forEach((header) => header.uid = uuid());
  bodyFormUrlEncoded.forEach((param) => param.uid = uuid());
  bodyMultipartForm.forEach((param) => param.uid = uuid());

  return request;
}

const addEnvironmentFile = async (win, pathname, collectionUid) => {
  try {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
      }
    };

    const jsonData = fs.readFileSync(pathname, 'utf8');
    file.data = JSON.parse(jsonData);
    win.webContents.send('main:collection-tree-updated', 'addEnvironmentFile', file);
  } catch (err) {
    console.error(err)
  }
};

const changeEnvironmentFile = async (win, pathname, collectionUid) => {
  try {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
      }
    };

    const jsonData = fs.readFileSync(pathname, 'utf8');
    file.data = JSON.parse(jsonData);
    win.webContents.send('main:collection-tree-updated', 'changeEnvironmentFile', file);
  } catch (err) {
    console.error(err)
  }
};

const unlinkEnvironmentFile = async (win, pathname, collectionUid) => {
  try {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
      },
      data: []
    };

    win.webContents.send('main:collection-tree-updated', 'changeEnvironmentFile', file);
  } catch (err) {
    console.error(err)
  }
};

const add = async (win, pathname, collectionUid, collectionPath) => {
  const isJson = hasJsonExtension(pathname);
  console.log(`watcher add: ${pathname}`);

  if(isJson) {
    if(isEnvironmentConfig(pathname, collectionPath)) {
      return addEnvironmentFile(win, pathname, collectionUid);
    }
  }

  // migrate old json files to bru
  if(hasJsonExtension(pathname)) {
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

  if(hasBruExtension(pathname)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
      }
    }

    try {
      const bru = fs.readFileSync(pathname, 'utf8');
      file.data = bruToJson(bru);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);
    } catch (err) {
      console.error(err)
    }
  }
};

const addDirectory = (win, pathname, collectionUid) => {
  console.log(`watcher addDirectory: ${pathname}`);
  const directory = {
    meta: {
      collectionUid,
      pathname,
      name: path.basename(pathname),
    }
  };
  win.webContents.send('main:collection-tree-updated', 'addDir', directory);
};

const change = async (win, pathname, collectionUid, collectionPath) => {
  console.log(`watcher change: ${pathname}`);

  if(isEnvironmentConfig(pathname, collectionPath)) {
    return changeEnvironmentFile(win, pathname, collectionUid);
  }

  if(hasBruExtension(pathname)) {
    try {
      const file = {
        meta: {
          collectionUid,
          pathname,
          name: path.basename(pathname),
        }
      };
    
      const bru = fs.readFileSync(pathname, 'utf8');
      file.data = bruToJson(bru);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'change', file);
    } catch (err) {
      console.error(err)
    }
  }

};

const unlink = (win, pathname, collectionUid, collectionPath) => {
  if(isEnvironmentConfig(pathname, collectionPath)) {
    return unlinkEnvironmentFile(win, pathname, collectionUid);
  }

  if(hasBruExtension(pathname)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };
    win.webContents.send('main:collection-tree-updated', 'unlink', file);
  }
}

const unlinkDir = (win, pathname, collectionUid) => {
  const directory = {
    meta: {
      collectionUid,
      pathname,
      name: path.basename(pathname)
    }
  };
  win.webContents.send('main:collection-tree-updated', 'unlinkDir', directory);
}

class Watcher {
  constructor () {
    this.watchers = {};
  }

  addWatcher (win, watchPath, collectionUid) {
    if(this.watchers[watchPath]) {
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
        ignored: path => ["node_modules", ".git", "bruno.json"].some(s => path.includes(s)),
        persistent: true,
        ignorePermissionErrors: true,
        awaitWriteFinish: {
          stabilityThreshold: 80,
          pollInterval: 10
        },
        depth: 20
      });
  
      watcher
        .on('add', pathname => add(win, pathname, collectionUid, watchPath))
        .on('addDir', pathname => addDirectory(win, pathname, collectionUid, watchPath))
        .on('change', pathname => change(win, pathname, collectionUid, watchPath))
        .on('unlink', pathname => unlink(win, pathname, collectionUid, watchPath))
        .on('unlinkDir', pathname => unlinkDir(win, pathname, collectionUid, watchPath))
  
        self.watchers[watchPath] = watcher;
    }, 100);
  }

  hasWatcher (watchPath) {
    return this.watchers[watchPath];
  }

  removeWatcher (watchPath, win) {
    if(this.watchers[watchPath]) {
      this.watchers[watchPath].close();
      this.watchers[watchPath] = null;
    }
  }
};

module.exports =  Watcher;
