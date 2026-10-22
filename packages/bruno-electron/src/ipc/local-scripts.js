const path = require('path');
const { executeLocalScript, LocalScriptError } = require('@usebruno/requests');
const { preferencesUtil } = require('../store/preferences');

const NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const MAX_TIMEOUT_MS = 600000;

/**
 * Runs a single registered local script on demand from Collection Settings.
 * Execution still requires the global opt-in preference: nothing runs on the
 * host machine until the user enables local scripts explicitly.
 */
const runLocalScript = async (_event, { collectionPathname, script } = {}) => {
  if (!preferencesUtil.isLocalScriptsEnabled()) {
    throw new Error('Local scripts are disabled. Enable them in Preferences → General first.');
  }
  if (typeof collectionPathname !== 'string' || collectionPathname.trim() === '') {
    throw new Error('A collection path is required to run a local script.');
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

  const cwd = path.resolve(collectionPathname);
  try {
    const result = await executeLocalScript({ name, command, timeout }, { cwd });
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
  ipcMain.handle('renderer:run-local-script', runLocalScript);
};

module.exports = { registerLocalScriptsIpc, runLocalScript };
