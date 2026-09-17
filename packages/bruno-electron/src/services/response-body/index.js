const { createResponseBodyStore } = require('./store');
const { createNodeFileSystem } = require('./node-fs');
const { ensureResponseBodiesDirectory } = require('./paths');
const { registerResponseBodyIpc, CHANNELS } = require('./ipc');
const {
  registerBrunoResponseScheme,
  registerBrunoResponseProtocol,
  SCHEME
} = require('./protocol');
const { SHOW_INLINE_BYTES, VIEW_MAX_BYTES, STORAGE_MEMORY, STORAGE_FILE } = require('./constants');
const {
  BodyNotFoundError,
  BodyTooLargeForScriptsError,
  BodyTooLargeForViewError,
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
    idGen: options.idGen
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
  SHOW_INLINE_BYTES,
  VIEW_MAX_BYTES,
  STORAGE_MEMORY,
  STORAGE_FILE,
  BodyNotFoundError,
  BodyTooLargeForScriptsError,
  BodyTooLargeForViewError,
  ResponseBodyError
};
