const { createResponseBodyStore } = require('./store');
const { createNodeFileSystem } = require('./node-fs');
const { ensureResponseBodiesDirectory } = require('./paths');
const { registerResponseBodyIpc, CHANNELS } = require('./ipc');
const {
  registerBrunoResponseScheme,
  registerBrunoResponseProtocol,
  SCHEME
} = require('./protocol');
const { SPILL_THRESHOLD_BYTES, STORAGE_MEMORY, STORAGE_FILE } = require('./constants');
const {
  BodyNotFoundError,
  BodyTooLargeForScriptsError,
  ResponseBodyError
} = require('./errors');

let singleton = null;

const createResponseBodyService = (options = {}) => {
  if (singleton && !options.fresh) {
    return singleton;
  }

  const spillDir = options.spillDir || ensureResponseBodiesDirectory();
  const fs = options.fs || createNodeFileSystem();
  const store = createResponseBodyStore({
    fs,
    spillDir,
    idGen: options.idGen,
    spillThreshold: options.spillThreshold
  });

  singleton = {
    store,
    spillDir,
    registerIpc(mainWindow) {
      return registerResponseBodyIpc(mainWindow, store);
    },
    registerProtocol() {
      registerBrunoResponseProtocol(store);
    }
  };

  return singleton;
};

const getResponseBodyService = () => {
  if (!singleton) {
    return createResponseBodyService();
  }
  return singleton;
};

module.exports = {
  createResponseBodyService,
  getResponseBodyService,
  registerBrunoResponseScheme,
  CHANNELS,
  SCHEME,
  SPILL_THRESHOLD_BYTES,
  STORAGE_MEMORY,
  STORAGE_FILE,
  BodyNotFoundError,
  BodyTooLargeForScriptsError,
  ResponseBodyError
};
