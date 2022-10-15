const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const {
  isValidPathname,
  writeFile,
  hasJsonExtension,
  isDirectory,
  browseDirectory,
  createDirectory
} = require('../utils/filesystem');
const { uuid, stringifyJson, parseJson } = require('../utils/common');
const { openCollection } = require('../app/collections');

const registerRendererEventHandlers = (mainWindow, watcher, lastOpenedCollections) => {
  // browse directory
  ipcMain.handle('renderer:browse-directory', async (event, pathname, request) => {
    try {
      const dirPath = await browseDirectory(mainWindow);

      return dirPath;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // create collection
  ipcMain.handle('renderer:create-collection', async (event, collectionName, collectionLocation) => {
    try {
      const dirPath = path.join(collectionLocation, collectionName);
      if (fs.existsSync(dirPath)){
        throw new Error(`collection: ${dir} already exists`);
      }

      if(!isValidPathname(dirPath)) {
        throw new Error(`collection: invaid pathname - ${dir}`);
      }

      await createDirectory(dirPath);

      const content = await stringifyJson({
        version: '1.0',
        type: 'collection'
      });
      await writeFile(path.join(dirPath, 'bruno.json'), content);

      const uid = uuid();
      mainWindow.webContents.send('main:collection-opened', dirPath, uid);
      ipcMain.emit('main:collection-opened', mainWindow, dirPath, uid);

      return;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // new request
  ipcMain.handle('renderer:new-request', async (event, pathname, request) => {
    try {
      if (fs.existsSync(pathname)){
        throw new Error(`path: ${pathname} already exists`);
      }

      const content = await stringifyJson(request);
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save request
  ipcMain.handle('renderer:save-request', async (event, pathname, request) => {
    try {
      if (!fs.existsSync(pathname)){
        throw new Error(`path: ${pathname} does not exist`);
      }

      const content = await stringifyJson(request);
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename item
  ipcMain.handle('renderer:rename-item', async (event, oldPath, newPath, newName) => {
    try {
      if (!fs.existsSync(oldPath)){
        throw new Error(`path: ${oldPath} does not exist`);
      }
      if (fs.existsSync(newPath)){
        throw new Error(`path: ${oldPath} already exists`);
      }

      // if its directory, rename and return
      if(isDirectory(oldPath)) {
        return fs.renameSync(oldPath, newPath);
      }

      const isJson = hasJsonExtension(oldPath);
      if(!isJson) {
        throw new Error(`path: ${oldPath} is not a json file`);
      }

      // update name in file and save new copy, then delete old copy
      const data = fs.readFileSync(oldPath, 'utf8');
      const jsonData = await parseJson(data);

      jsonData.name = newName;

      const content = await stringifyJson(jsonData);
      await writeFile(newPath, content);
      await fs.unlinkSync(oldPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // new folder
  ipcMain.handle('renderer:new-folder', async (event, pathname) => {
    try {
      if (!fs.existsSync(pathname)){
          fs.mkdirSync(pathname);
      } else {
        return Promise.reject(new Error('The directory already exists'));
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // delete file/folder
  ipcMain.handle('renderer:delete-item', async (event, pathname, type) => {
    try {
      if(type === 'folder') {
        await fs.rmSync(pathname, { recursive: true, force: true});
      } else if (['http-request', 'graphql-request'].includes(type)) {
        await fs.unlinkSync(pathname);
      } else {
        return Promise.reject(error);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:open-collection', () => {
    if(watcher && mainWindow) {
      openCollection(mainWindow, watcher);
    }
  });

  ipcMain.handle('renderer:remove-collection', async (event, collectionPath) => {
    if(watcher && mainWindow) {
      console.log(`watcher stopWatching: ${collectionPath}`);
      watcher.removeWatcher(collectionPath, mainWindow);
    }
  });

  ipcMain.handle('renderer:ready', async (event) => {
    // reload last opened collections
    const lastOpened = lastOpenedCollections.getAll();

    if(lastOpened && lastOpened.length) {
      for(let collectionPath of lastOpened) {
        if(isDirectory(collectionPath)) {
          const uid = uuid();
          mainWindow.webContents.send('main:collection-opened', collectionPath, uid);
          ipcMain.emit('main:collection-opened', mainWindow, collectionPath, uid);
        }
      }
    }
  });
};

const registerMainEventHandlers = (mainWindow, watcher, lastOpenedCollections) => {
  ipcMain.on('main:open-collection', () => {
    if(watcher && mainWindow) {
      openCollection(mainWindow, watcher);
    }
  });

  ipcMain.on('main:collection-opened', (win, pathname, uid) => {
    watcher.addWatcher(win, pathname, uid);
    lastOpenedCollections.add(pathname);
  });

}

const registerLocalCollectionsIpc = (mainWindow, watcher, lastOpenedCollections) => {
  registerRendererEventHandlers(mainWindow, watcher, lastOpenedCollections);
  registerMainEventHandlers(mainWindow, watcher, lastOpenedCollections);
}

module.exports = registerLocalCollectionsIpc;
