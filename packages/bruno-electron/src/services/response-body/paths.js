const path = require('node:path');
const fs = require('node:fs');

/**
 * Own helpers for response-body spill dir. Do NOT reuse getTransient* from collection.js.
 * @param {{ getUserDataPath?: () => string }} [deps]
 */
const getResponseBodiesDirectoryBase = (deps = {}) => {
  const getUserDataPath
    = deps.getUserDataPath
      || (() => require('electron').app.getPath('userData'));
  return path.join(getUserDataPath(), 'tmp', 'response-bodies');
};


const purgeResponseBodiesDirectory = (deps = {}) => {
  const base = getResponseBodiesDirectoryBase(deps);
  if (fs.existsSync(base)) {
    fs.rmSync(base, { recursive: true, force: true });
  }
  fs.mkdirSync(base, { recursive: true });
  return base;
};

const ensureResponseBodiesDirectory = (deps = {}) => {
  const base = getResponseBodiesDirectoryBase(deps);
  fs.mkdirSync(base, { recursive: true });
  return base;
};

module.exports = {
  getResponseBodiesDirectoryBase,
  ensureResponseBodiesDirectory,
  purgeResponseBodiesDirectory
};
