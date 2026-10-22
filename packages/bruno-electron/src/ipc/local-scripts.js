const os = require('os');
const {
  executeLocalScript,
  LocalScriptError,
  loadGlobalLocalScriptsConfig,
  saveGlobalLocalScriptsConfig
} = require('@usebruno/requests');
const { preferencesUtil } = require('../store/preferences');

const NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const MAX_TIMEOUT_MS = 600000;

/**
 * Returns the global local script registry shared by the app and the CLI
 * (`~/.bruno/local-scripts.json`).
 */
const getLocalScripts = async () => {
  try {
    return loadGlobalLocalScriptsConfig();
  } catch (error) {
    console.error('Error in renderer:get-local-scripts:', error);
    return Promise.reject(error);
  }
};

const saveLocalScripts = async (_event, { config } = {}) => {
  try {
    return saveGlobalLocalScriptsConfig(config);
  } catch (error) {
    console.error('Error in renderer:save-local-scripts:', error);
    return Promise.reject(error);
  }
};

/**
 * Runs one local script on demand from the Local Scripts page.
 * Execution still requires the global opt-in preference: nothing runs on the
 * host machine until the user enables local scripts explicitly. Global
 * scripts have no collection folder, so the user's home directory is used as
 * working directory.
 */
const runLocalScript = async (_event, { script } = {}) => {
  if (!preferencesUtil.isLocalScriptsEnabled()) {
    throw new Error('Local scripts are disabled. Enable them in Preferences → General first.');
  }
  if (!script || typeof script !== 'object') {
    throw new Error('A script definition is required.');
  }
  const { name, command, timeout } = script;
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    throw new Error('Invalid script name.');
  }
  if (typeof command !== 'string' || command.trim() === '') {
    throw new Error('A non-empty command is required.');
  }
  if (timeout !== undefined && (typeof timeout !== 'number' || timeout <= 0 || timeout > MAX_TIMEOUT_MS)) {
    throw new Error(`Timeout must be a positive number of ms (max ${MAX_TIMEOUT_MS}).`);
  }

  try {
    const result = await executeLocalScript({ name, command, timeout }, { cwd: os.homedir() });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      duration: result.duration
    };
  } catch (error) {
    if (error instanceof LocalScriptError) {
      const wrapped = new Error(error.message);
      wrapped.stderr = error.stderr;
      wrapped.exitCode = error.exitCode;
      wrapped.timedOut = error.timedOut;
      throw wrapped;
    }
    throw error;
  }
};

const registerLocalScriptsIpc = () => {
  const { ipcMain } = require('electron');
  ipcMain.handle('renderer:get-local-scripts', getLocalScripts);
  ipcMain.handle('renderer:save-local-scripts', saveLocalScripts);
  ipcMain.handle('renderer:run-local-script', runLocalScript);
};

module.exports = { registerLocalScriptsIpc, getLocalScripts, saveLocalScripts, runLocalScript };
