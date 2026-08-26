const { createResponseBodyStore } = require('./core/store');
const { createNodeFileSystem } = require('./adapters/node-fs');
const { ensureResponseBodiesDirectory } = require('./adapters/paths');
const { registerResponseBodyIpc, CHANNELS } = require('./adapters/ipc');
const {
  registerBrunoResponseScheme,
  registerBrunoResponseProtocol,
  SCHEME
} = require('./adapters/protocol');
const { SPILL_THRESHOLD_BYTES, STORAGE_MEMORY, STORAGE_FILE } = require('./core/constants');
const {
  BodyNotFoundError,
  BodyTooLargeForScriptsError,
  ResponseBodyError
} = require('./core/errors');

let singleton = null;

/**
 * Create (or return) the process-wide response body service.
 */
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
