const { createResponseBodyStore } = require('./store');
const { createNodeFileSystem } = require('./node-fs');
const { purgeResponseBodiesDirectory } = require('./paths');
const { registerResponseBodyIpc, CHANNELS } = require('./ipc');
const { SHOW_INLINE_BYTES, VIEW_MAX_BYTES } = require('./constants');
const {
  BodyNotFoundError,
  BodyTooLargeForViewError,
  ResponseBodyError
} = require('./errors');

let singleton = null;

const createResponseBodyService = (options = {}) => {
  if (singleton && !options.fresh) {
    return singleton;
  }

  const spillDir = options.spillDir || purgeResponseBodiesDirectory();
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
  CHANNELS,
  SHOW_INLINE_BYTES,
  VIEW_MAX_BYTES,
  BodyNotFoundError,
  BodyTooLargeForViewError,
  ResponseBodyError
};
