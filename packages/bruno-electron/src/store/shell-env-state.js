const { initializeShellEnv: _initializeShellEnv, refreshShellEnvProxyVars: _refreshShellEnvProxyVars } = require('@usebruno/requests');

const TIMEOUT_MS = 60_000;

/** @type {null | Promise<any>} */
let _promise = null;

const _initWithTimeout = (fn) => {
  // @TODO: Temp skip during Playwright tests - otherwise it can hang on macOS CI
  if (process.env.PLAYWRIGHT) {
    return Promise.resolve();
  }

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      _promise = null;
      reject(new Error('Shell environment initialization timed out'));
    }, TIMEOUT_MS);
  });
  return Promise.race([fn(), timeout]).finally(() => clearTimeout(timer));
};

const initializeShellEnv = () => {
  if (!_promise) _promise = _initWithTimeout(_initializeShellEnv);
};

const refreshShellEnvProxyVars = async () => {
  return _initWithTimeout(_refreshShellEnvProxyVars);
};

const waitForShellEnv = () => {
  if (!_promise) _promise = _initWithTimeout();
  return _promise;
};

module.exports = { initializeShellEnv, refreshShellEnvProxyVars, waitForShellEnv };
