const { initializeShellEnv: _initializeShellEnv } = require('@usebruno/requests');

let _promise = null;

const initializeShellEnv = () => {
  if (!_promise) _promise = _initializeShellEnv();
};

// Await this wherever shell env must be settled before proceeding
const waitForShellEnv = () => {
  if (!_promise) _promise = _initializeShellEnv();
  return _promise;
};

module.exports = { initializeShellEnv, waitForShellEnv };
