const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chokidar = require('chokidar');
const { hasJsonExtension } = require('../utils/filesystem');

const add = async (win, pathname, collectionUid) => {
  const isJson = hasJsonExtension(pathname);
  console.log(`watcher add: ${pathname}`);

  if(isJson) {
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

const change = async (win, pathname, collectionUid) => {
  console.log(`watcher change: ${pathname}`);
  const file = {
    meta: {
      collectionUid,
      pathname,
      name: path.basename(pathname),
    }
  };

  try {
    const jsonData = fs.readFileSync(pathname, 'utf8');
    file.data = await JSON.parse(jsonData);
    win.webContents.send('main:collection-tree-updated', 'change', file);
  } catch (err) {
    console.error(err)
  }
};

const unlink = (win, pathname, collectionUid) => {
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
        .on('add', pathname => add(win, pathname, collectionUid))
        .on('addDir', pathname => addDirectory(win, pathname, collectionUid))
        .on('change', pathname => change(win, pathname, collectionUid))
        .on('unlink', pathname => unlink(win, pathname, collectionUid))
        .on('unlinkDir', pathname => unlinkDir(win, pathname, collectionUid))
  
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
      win.webContents.send('main:collection-removed', watchPath);
    }
  }
};

module.exports =  Watcher;
