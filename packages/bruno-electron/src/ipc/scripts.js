const { ipcMain } = require('electron');
const CollectionSecurityStore = require('../store/collection-security');
const { isScriptPathSafe, parseEnvVarsFromOutput, runShellScript } = require('../utils/collection-scripts');

const collectionSecurityStore = new CollectionSecurityStore();

const registerCollectionScriptsIpc = (mainWindow) => {
  ipcMain.handle('renderer:run-collection-script', async (event, payload) => {
    const { collectionUid, collectionPath, script } = payload || {};

    if (typeof collectionPath !== 'string' || !collectionPath.length) {
      return { error: 'Invalid request: collection path is required.' };
    }
    if (!script || typeof script !== 'object') {
      return { error: 'Invalid request: script is required.' };
    }
    if (typeof script.file !== 'string' || !script.file.length) {
      return { error: 'Invalid request: script.file is required.' };
    }

    const securityConfig = collectionSecurityStore.getSecurityConfigForCollection(collectionPath);
    if (securityConfig?.jsSandboxMode !== 'developer') {
      return { error: 'Collection scripts require Developer Mode. Enable it in Collection Settings > Security.' };
    }

    if (!isScriptPathSafe(collectionPath, script.file)) {
      return { error: 'Script path must be within the collection directory.' };
    }

    const sendChunk = (data, stream) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('main:collection-script-output', {
          collectionUid, scriptUid: script.uid, data, stream
        });
      }
    };

    try {
      const { exitCode, stdout } = await runShellScript(collectionPath, script.file, {
        onStdout: (chunk) => sendChunk(chunk, 'stdout'),
        onStderr: (chunk) => sendChunk(chunk, 'stderr')
      });

      if (script.outputMode === 'envVars' && exitCode === 0 && mainWindow && !mainWindow.isDestroyed()) {
        const parsed = parseEnvVarsFromOutput(stdout);
        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: parsed, runtimeVariables: {}, persistentEnvVariables: parsed, collectionUid
        });
        mainWindow.webContents.send('main:persistent-env-variables-update', {
          persistentEnvVariables: parsed, collectionUid
        });
      }

      return { exitCode };
    } catch (err) {
      sendChunk(`Error: ${err.message}`, 'stderr');
      return { error: err.message, exitCode: 1 };
    }
  });
};

module.exports = registerCollectionScriptsIpc;
