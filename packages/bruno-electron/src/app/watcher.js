const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { hasJsonExtension } = require('../utils/filesystem');

const isEnvironmentConfig = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === 'environments.json';
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

    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
      }
    }

    try {
      const jsonData = fs.readFileSync(pathname, 'utf8');
      file.data = JSON.parse(jsonData);
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
  try {
    if(isEnvironmentConfig(pathname, collectionPath)) {
      return changeEnvironmentFile(win, pathname, collectionUid);
    }

    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
      }
    };
  
    const jsonData = fs.readFileSync(pathname, 'utf8');
    file.data = await JSON.parse(jsonData);
    win.webContents.send('main:collection-tree-updated', 'change', file);
  } catch (err) {
    console.error(err)
  }
};

const unlink = (win, pathname, collectionUid, collectionPath) => {
  if(isEnvironmentConfig(pathname, collectionPath)) {
    return unlinkEnvironmentFile(win, pathname, collectionUid);
  }

  console.log(`watcher unlink: ${pathname}`);
  const file = {
    meta: {
      collectionUid,
      pathname,
      name: path.basename(pathname)
    }
  };
  win.webContents.send('main:collection-tree-updated', 'unlink', file);
}

const unlinkDir = (win, pathname, collectionUid) => {
  console.log(`watcher unlinkDir: ${pathname}`);
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
