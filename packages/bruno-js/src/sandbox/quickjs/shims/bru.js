const { cleanJson, cleanCircularJson } = require('../../../utils');
const { marshallToVm } = require('../utils');
const { createBrunoRequestShim } = require('./bruno-request');
const { createBrunoResponseShim } = require('./bruno-response');

const addBruShimToContext = (vm, bru) => {
  const bruObject = vm.newObject();
  const bruRunnerObject = vm.newObject();

  let cwd = vm.newFunction('cwd', function () {
    return marshallToVm(bru.cwd(), vm);
  });
  vm.setProp(bruObject, 'cwd', cwd);
  cwd.dispose();

  let getEnvName = vm.newFunction('getEnvName', function () {
    return marshallToVm(bru.getEnvName(), vm);
  });
  vm.setProp(bruObject, 'getEnvName', getEnvName);
  getEnvName.dispose();

  let getCollectionName = vm.newFunction('getCollectionName', function () {
    return marshallToVm(bru.getCollectionName(), vm);
  });
  vm.setProp(bruObject, 'getCollectionName', getCollectionName);
  getCollectionName.dispose();

  let isSafeMode = vm.newFunction('isSafeMode', function () {
    return marshallToVm(bru.isSafeMode(), vm);
  });
  vm.setProp(bruObject, 'isSafeMode', isSafeMode);
  isSafeMode.dispose();

  let getProcessEnv = vm.newFunction('getProcessEnv', function (key) {
    return marshallToVm(bru.getProcessEnv(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getProcessEnv', getProcessEnv);
  getProcessEnv.dispose();

  let interpolate = vm.newFunction('interpolate', function (str) {
    return marshallToVm(bru.interpolate(vm.dump(str)), vm);
  });
  vm.setProp(bruObject, 'interpolate', interpolate);
  interpolate.dispose();

  let hasEnvVar = vm.newFunction('hasEnvVar', function (key) {
    return marshallToVm(bru.hasEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'hasEnvVar', hasEnvVar);
  hasEnvVar.dispose();

  let getEnvVar = vm.newFunction('getEnvVar', function (key) {
    return marshallToVm(bru.getEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getEnvVar', getEnvVar);
  getEnvVar.dispose();

  let setEnvVar = vm.newFunction('setEnvVar', function (key, value, options = {}) {
    bru.setEnvVar(vm.dump(key), vm.dump(value), vm.dump(options));
  });
  vm.setProp(bruObject, 'setEnvVar', setEnvVar);
  setEnvVar.dispose();

  let deleteEnvVar = vm.newFunction('deleteEnvVar', function (key) {
    bru.deleteEnvVar(vm.dump(key));
  });
  vm.setProp(bruObject, 'deleteEnvVar', deleteEnvVar);
  deleteEnvVar.dispose();

  let getAllEnvVars = vm.newFunction('getAllEnvVars', function () {
    return marshallToVm(bru.getAllEnvVars(), vm);
  });
  vm.setProp(bruObject, 'getAllEnvVars', getAllEnvVars);
  getAllEnvVars.dispose();

  let deleteAllEnvVars = vm.newFunction('deleteAllEnvVars', function () {
    bru.deleteAllEnvVars();
  });
  vm.setProp(bruObject, 'deleteAllEnvVars', deleteAllEnvVars);
  deleteAllEnvVars.dispose();

  let getGlobalEnvVar = vm.newFunction('getGlobalEnvVar', function (key) {
    return marshallToVm(bru.getGlobalEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getGlobalEnvVar', getGlobalEnvVar);
  getGlobalEnvVar.dispose();

  let getOauth2CredentialVar = vm.newFunction('getOauth2CredentialVar', function (key) {
    return marshallToVm(bru.getOauth2CredentialVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getOauth2CredentialVar', getOauth2CredentialVar);
  getOauth2CredentialVar.dispose();

  let resetOauth2Credential = vm.newFunction('resetOauth2Credential', function (credentialId) {
    bru.resetOauth2Credential(vm.dump(credentialId));
  });
  vm.setProp(bruObject, 'resetOauth2Credential', resetOauth2Credential);
  resetOauth2Credential.dispose();

  let setGlobalEnvVar = vm.newFunction('setGlobalEnvVar', function (key, value) {
    bru.setGlobalEnvVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(bruObject, 'setGlobalEnvVar', setGlobalEnvVar);
  setGlobalEnvVar.dispose();

  let deleteGlobalEnvVar = vm.newFunction('deleteGlobalEnvVar', function (key) {
    bru.deleteGlobalEnvVar(vm.dump(key));
  });
  vm.setProp(bruObject, 'deleteGlobalEnvVar', deleteGlobalEnvVar);
  deleteGlobalEnvVar.dispose();

  let getAllGlobalEnvVars = vm.newFunction('getAllGlobalEnvVars', function () {
    return marshallToVm(bru.getAllGlobalEnvVars(), vm);
  });
  vm.setProp(bruObject, 'getAllGlobalEnvVars', getAllGlobalEnvVars);
  getAllGlobalEnvVars.dispose();

  let deleteAllGlobalEnvVars = vm.newFunction('deleteAllGlobalEnvVars', function () {
    bru.deleteAllGlobalEnvVars();
  });
  vm.setProp(bruObject, 'deleteAllGlobalEnvVars', deleteAllGlobalEnvVars);
  deleteAllGlobalEnvVars.dispose();

  let hasVar = vm.newFunction('hasVar', function (key) {
    return marshallToVm(bru.hasVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'hasVar', hasVar);
  hasVar.dispose();

  let getVar = vm.newFunction('getVar', function (key) {
    return marshallToVm(bru.getVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getVar', getVar);
  getVar.dispose();

  let setVar = vm.newFunction('setVar', function (key, value) {
    bru.setVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(bruObject, 'setVar', setVar);
  setVar.dispose();

  let deleteVar = vm.newFunction('deleteVar', function (key) {
    bru.deleteVar(vm.dump(key));
  });
  vm.setProp(bruObject, 'deleteVar', deleteVar);
  deleteVar.dispose();

  let deleteAllVars = vm.newFunction('deleteAllVars', function () {
    bru.deleteAllVars();
  });
  vm.setProp(bruObject, 'deleteAllVars', deleteAllVars);
  deleteAllVars.dispose();

  let getAllVars = vm.newFunction('getAllVars', function () {
    return marshallToVm(bru.getAllVars(), vm);
  });
  vm.setProp(bruObject, 'getAllVars', getAllVars);
  getAllVars.dispose();

  let setNextRequest = vm.newFunction('setNextRequest', function (nextRequest) {
    bru.setNextRequest(vm.dump(nextRequest));
  });
  vm.setProp(bruObject, 'setNextRequest', setNextRequest);
  setNextRequest.dispose();

  let runnerSkipRequest = vm.newFunction('skipRequest', function () {
    bru?.runner?.skipRequest();
  });
  vm.setProp(bruRunnerObject, 'skipRequest', runnerSkipRequest);
  runnerSkipRequest.dispose();

  let runnerStopExecution = vm.newFunction('stopExecution', function () {
    bru?.runner?.stopExecution();
  });
  vm.setProp(bruRunnerObject, 'stopExecution', runnerStopExecution);
  runnerStopExecution.dispose();

  let runnerSetNextRequest = vm.newFunction('setNextRequest', function (nextRequest) {
    bru?.runner?.setNextRequest(vm.dump(nextRequest));
  });
  vm.setProp(bruRunnerObject, 'setNextRequest', runnerSetNextRequest);
  runnerSetNextRequest.dispose();

  let visualize = vm.newFunction('visualize', function (htmlString) {
    bru.visualize(vm.dump(htmlString));
  });
  vm.setProp(bruObject, 'visualize', visualize);
  visualize.dispose();

  let getSecretVar = vm.newFunction('getSecretVar', function (key) {
    return marshallToVm(bru.getSecretVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getSecretVar', getSecretVar);
  getSecretVar.dispose();

  let getRequestVar = vm.newFunction('getRequestVar', function (key) {
    return marshallToVm(bru.getRequestVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getRequestVar', getRequestVar);
  getRequestVar.dispose();

  let getFolderVar = vm.newFunction('getFolderVar', function (key) {
    return marshallToVm(bru.getFolderVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getFolderVar', getFolderVar);
  getFolderVar.dispose();

  let getCollectionVar = vm.newFunction('getCollectionVar', function (key) {
    return marshallToVm(bru.getCollectionVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getCollectionVar', getCollectionVar);
  getCollectionVar.dispose();

  let setCollectionVar = vm.newFunction('setCollectionVar', function (key, value) {
    bru.setCollectionVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(bruObject, 'setCollectionVar', setCollectionVar);
  setCollectionVar.dispose();

  let hasCollectionVar = vm.newFunction('hasCollectionVar', function (key) {
    return marshallToVm(bru.hasCollectionVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'hasCollectionVar', hasCollectionVar);
  hasCollectionVar.dispose();

  let deleteCollectionVar = vm.newFunction('deleteCollectionVar', function (key) {
    bru.deleteCollectionVar(vm.dump(key));
  });
  vm.setProp(bruObject, 'deleteCollectionVar', deleteCollectionVar);
  deleteCollectionVar.dispose();

  let deleteAllCollectionVars = vm.newFunction('deleteAllCollectionVars', function () {
    bru.deleteAllCollectionVars();
  });
  vm.setProp(bruObject, 'deleteAllCollectionVars', deleteAllCollectionVars);
  deleteAllCollectionVars.dispose();

  let getAllCollectionVars = vm.newFunction('getAllCollectionVars', function () {
    return marshallToVm(bru.getAllCollectionVars(), vm);
  });
  vm.setProp(bruObject, 'getAllCollectionVars', getAllCollectionVars);
  getAllCollectionVars.dispose();

  let getTestResults = vm.newFunction('getTestResults', () => {
    const promise = vm.newPromise();
    bru
      .getTestResults()
      .then((results) => {
        promise.resolve(marshallToVm(cleanJson(results), vm));
      })
      .catch((err) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  getTestResults.consume((handle) => vm.setProp(bruObject, 'getTestResults', handle));

  let getAssertionResults = vm.newFunction('getAssertionResults', () => {
    const promise = vm.newPromise();
    bru
      .getAssertionResults()
      .then((results) => {
        promise.resolve(marshallToVm(cleanJson(results), vm));
      })
      .catch((err) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  getAssertionResults.consume((handle) => vm.setProp(bruObject, 'getAssertionResults', handle));

  let runRequestHandle = vm.newFunction('runRequest', (args) => {
    const promise = vm.newPromise();
    bru
      .runRequest(vm.dump(args))
      .then((response) => {
        promise.resolve(marshallToVm(cleanCircularJson(response), vm));
      })
      .catch((err) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  runRequestHandle.consume((handle) => vm.setProp(bruObject, 'runRequest', handle));

  let sendRequestHandle = vm.newFunction('_sendRequest', (args) => {
    const promise = vm.newPromise();
    bru
      .sendRequest(vm.dump(args))
      .then((response) => {
        promise.resolve(marshallToVm(cleanCircularJson(response), vm));
      })
      .catch((err) => {
        promise.reject(
          marshallToVm(
            cleanJson(err),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sendRequestHandle.consume((handle) => vm.setProp(bruObject, '_sendRequest', handle));

  const sleep = vm.newFunction('sleep', (timer) => {
    const t = vm.getString(timer);
    const promise = vm.newPromise();
    setTimeout(() => {
      promise.resolve(vm.newString('slept'));
    }, t);
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sleep.consume((handle) => vm.setProp(bruObject, 'sleep', handle));

  let bruCookiesObject = vm.newObject();

  const _jarFn = vm.newFunction('_jar', () => {
    const nativeJar = bru.cookies.jar();
    const jarObj = vm.newObject();

    const _getCookieFn = vm.newFunction('_getCookie', (url, cookieName) => {
      const promise = vm.newPromise();
      nativeJar.getCookie(vm.dump(url), vm.dump(cookieName), (err, cookie) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(marshallToVm(cleanCircularJson(cookie), vm));
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _getCookieFn.consume((handle) => vm.setProp(jarObj, '_getCookie', handle));

    const _getCookiesFn = vm.newFunction('_getCookies', (url) => {
      const promise = vm.newPromise();
      nativeJar.getCookies(vm.dump(url), (err, cookies) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(marshallToVm(cleanCircularJson(cookies), vm));
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _getCookiesFn.consume((handle) => vm.setProp(jarObj, '_getCookies', handle));

    const _setCookieFn = vm.newFunction('_setCookie', (url, nameOrCookieObj, value) => {
      const promise = vm.newPromise();
      const dumpedUrl = vm.dump(url);
      const dumpedNameOrObj = vm.dump(nameOrCookieObj);

      // Check if the second argument is an object (cookie object case)
      if (typeof dumpedNameOrObj === 'object' && dumpedNameOrObj !== null) {
        // Cookie object case: setCookie(url, cookieObject, callback)
        nativeJar.setCookie(dumpedUrl, dumpedNameOrObj, (err) => {
          if (err) {
            promise.reject(marshallToVm(cleanJson(err), vm));
          } else {
            promise.resolve(vm.undefined);
          }
        });
      } else {
        // Name/value case: setCookie(url, name, value, callback)
        const dumpedValue = value ? vm.dump(value) : '';
        nativeJar.setCookie(dumpedUrl, dumpedNameOrObj, dumpedValue, (err) => {
          if (err) {
            promise.reject(marshallToVm(cleanJson(err), vm));
          } else {
            promise.resolve(vm.undefined);
          }
        });
      }

      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _setCookieFn.consume((handle) => vm.setProp(jarObj, '_setCookie', handle));

    const _setCookiesFn = vm.newFunction('_setCookies', (url, cookiesArray) => {
      const promise = vm.newPromise();

      nativeJar.setCookies(vm.dump(url), vm.dump(cookiesArray), (err) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(vm.undefined);
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _setCookiesFn.consume((handle) => vm.setProp(jarObj, '_setCookies', handle));

    const _clearFn = vm.newFunction('_clear', () => {
      const promise = vm.newPromise();
      nativeJar.clear((err) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(vm.undefined);
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _clearFn.consume((handle) => vm.setProp(jarObj, '_clear', handle));

    const _deleteCookiesFn = vm.newFunction('_deleteCookies', (url) => {
      const promise = vm.newPromise();
      nativeJar.deleteCookies(vm.dump(url), (err) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(vm.undefined);
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _deleteCookiesFn.consume((handle) => vm.setProp(jarObj, '_deleteCookies', handle));

    const _deleteCookieFn = vm.newFunction('_deleteCookie', (url, cookieName) => {
      const promise = vm.newPromise();
      nativeJar.deleteCookie(vm.dump(url), vm.dump(cookieName), (err) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(vm.undefined);
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _deleteCookieFn.consume((handle) => vm.setProp(jarObj, '_deleteCookie', handle));

    return jarObj;
  });
  _jarFn.consume((handle) => vm.setProp(bruCookiesObject, '_jar', handle));

  vm.setProp(bruObject, 'cookies', bruCookiesObject);
  bruCookiesObject.dispose();

  // Add hooks shim if bru.hooks exists
  if (bru.hooks) {
    // Execute handler using the original function handle from the VM
    // Returns a Promise that resolves when the handler completes (supports async handlers)
    const executeHandler = async (handlerHandle, vmInstance, data) => {
      if (!handlerHandle) {
        return Promise.resolve();
      }
      if (!vmInstance) {
        return Promise.resolve();
      }

      try {
        // Verify handler is still a function in the VM
        const handlerType = vmInstance.typeof(handlerHandle);
        if (handlerType !== 'function') {
          return Promise.resolve();
        }

        // Prepare data (clean circular refs) - use try-catch to prevent stack overflow
        let cleanedData;
        try {
          cleanedData = { ...cleanCircularJson(data) };
        } catch (e) {
          // If cleaning fails due to circular refs or stack overflow, use minimal data
          console.warn('Error cleaning hook data, using minimal data:', e.message);
          cleanedData = {};
        }

        // Create data object in VM
        const dataHandle = vmInstance.newObject();

        // Add all cleaned data properties
        Object.keys(cleanedData).forEach((key) => {
          if (key !== 'req' && key !== 'res') {
            const value = marshallToVm(cleanedData[key], vmInstance);
            vmInstance.setProp(dataHandle, key, value);
            value.dispose();
          }
        });

        // Add req/res shim objects to data if provided
        // In QuickJS, when you setProp, the parent object takes ownership
        // We dispose them after setting to avoid keeping extra references
        // but dataHandle will maintain the reference until it's disposed
        if (data.req) {
          const reqShim = createBrunoRequestShim(vmInstance, data.req);
          vmInstance.setProp(dataHandle, 'req', reqShim);
          // Dispose the original handle - dataHandle now owns the reference
          reqShim.dispose();
        }

        if (data.res) {
          const resShim = createBrunoResponseShim(vmInstance, data.res);
          vmInstance.setProp(dataHandle, 'res', resShim);
          // Dispose the original handle - dataHandle now owns the reference
          resShim.dispose();
        }

        // Call the original handler function
        // Use vmInstance.global as context to ensure proper scope access
        const result = vmInstance.callFunction(handlerHandle, vmInstance.global, dataHandle);
        // Dispose dataHandle - this will clean up all child references
        dataHandle.dispose();

        if (result.error) {
          const error = vmInstance.dump(result.error);
          result.error.dispose();
          const errorMsg = error?.message || error?.toString() || String(error);
          if (!errorMsg.includes('UseAfterFree') && !errorMsg.includes('Lifetime not alive')) {
            console.error('Error in hook handler:', error);
          }
          return;
        }

        // Check if the result is a Promise (async handler) and await it
        // This is crucial for handlers that need to complete before the request proceeds
        const resultType = vmInstance.typeof(result.value);

        // Only try to resolve as Promise if it's an object (Promises are objects in JS)
        // For non-object values (undefined, null, primitives), just dispose and return
        if (resultType !== 'object') {
          result.value.dispose();
          return;
        }

        // Check if the object has a .then property (duck-typing for Promise)
        let isPromise = false;
        try {
          const thenProp = vmInstance.getProp(result.value, 'then');
          isPromise = vmInstance.typeof(thenProp) === 'function';
          thenProp.dispose();
        } catch (e) {
          // If we can't check for .then, assume it's not a promise
          isPromise = false;
        }

        if (!isPromise) {
          // Not a promise, just dispose and return
          result.value.dispose();
          return;
        }

        // It's a Promise - await it using resolvePromise
        try {
          const resolvedResult = await vmInstance.resolvePromise(result.value);
          result.value.dispose();

          if (resolvedResult.error) {
            const error = vmInstance.dump(resolvedResult.error);
            resolvedResult.error.dispose();
            const errorMsg = error?.message || error?.toString() || String(error);
            if (!errorMsg.includes('UseAfterFree') && !errorMsg.includes('Lifetime not alive')) {
              console.error('Error in async hook handler:', error);
            }
          } else {
            resolvedResult.value.dispose();
          }
        } catch (promiseError) {
          // If resolvePromise fails, just dispose the value
          try {
            result.value.dispose();
          } catch (e) {
            // Ignore disposal errors
          }
        }
      } catch (error) {
        const errorMsg = error?.message || error?.toString() || String(error);
        if (!errorMsg.includes('UseAfterFree') && !errorMsg.includes('Lifetime not alive')) {
          console.error('Error executing hook handler:', error);
        }
      }
    };

    /**
     * Creates a hook function that registers a handler with the native hook system.
     * This helper eliminates code duplication across different hook types.
     *
     * @param {string} handlerIdPrefix - Prefix for logging/debugging (not used for lookup)
     * @param {Function} nativeHookRegister - Function to register with native hooks (e.g., bru.hooks.http.onBeforeRequest)
     * @param {boolean} validateHandler - Whether to validate handler is a function (default: true)
     * @returns {Function} VM function that can be registered as a hook
     */
    const createHookFunction = (handlerIdPrefix, nativeHookRegister, validateHandler = true) => {
      return vm.newFunction(handlerIdPrefix, function (handler) {
        // Validate handler if required
        if (validateHandler && vm.typeof(handler) !== 'function') {
          throw new Error('Handler must be a function');
        }

        // Try to duplicate the handle to own a reference
        let handlerHandle;
        try {
          handlerHandle = handler.dup ? handler.dup() : handler;
        } catch (e) {
          handlerHandle = handler;
        }

        // Create native handler that executes the stored handle
        // Returns a Promise so HookManager can await async handlers
        // Capture handlerHandle directly in closure - no lookup needed
        const nativeHandler = (data) => {
          if (!handlerHandle || !vm) {
            return Promise.resolve();
          }
          // Return the Promise from executeHandler so HookManager awaits it
          return executeHandler(handlerHandle, vm, data);
        };

        // Register with native hook system
        const unhook = nativeHookRegister(nativeHandler);

        // Create unhook function (just calls native unhook - no handle cleanup needed)
        const unhookFn = vm.newFunction('unhook', () => {
          unhook();
        });

        return unhookFn;
      });
    };

    // Add namespaced hooks structure
    if (bru.hooks) {
      const hooksNamespacedObject = vm.newObject();

      // HTTP hooks namespace
      if (bru.hooks.http) {
        const httpHooksObject = vm.newObject();

        if (typeof bru.hooks.http.onBeforeRequest === 'function') {
          const onBeforeRequest = createHookFunction('onBeforeRequest', (nativeHandler) => bru.hooks.http.onBeforeRequest(nativeHandler), false);
          onBeforeRequest.consume((handle) => vm.setProp(httpHooksObject, 'onBeforeRequest', handle));
        }

        if (typeof bru.hooks.http.onAfterResponse === 'function') {
          const onAfterResponse = createHookFunction('onAfterResponse', (nativeHandler) => bru.hooks.http.onAfterResponse(nativeHandler), false);
          onAfterResponse.consume((handle) => vm.setProp(httpHooksObject, 'onAfterResponse', handle));
        }

        vm.setProp(hooksNamespacedObject, 'http', httpHooksObject);
        httpHooksObject.dispose();
      }

      // Runner hooks namespace
      if (bru.hooks.runner) {
        const runnerHooksObject = vm.newObject();

        if (typeof bru.hooks.runner.onBeforeCollectionRun === 'function') {
          const onBeforeCollectionRun = createHookFunction('onBeforeCollectionRun', (nativeHandler) => bru.hooks.runner.onBeforeCollectionRun(nativeHandler), true);
          onBeforeCollectionRun.consume((handle) => vm.setProp(runnerHooksObject, 'onBeforeCollectionRun', handle));
        }

        if (typeof bru.hooks.runner.onAfterCollectionRun === 'function') {
          const onAfterCollectionRun = createHookFunction('onAfterCollectionRun', (nativeHandler) => bru.hooks.runner.onAfterCollectionRun(nativeHandler), true);
          onAfterCollectionRun.consume((handle) => vm.setProp(runnerHooksObject, 'onAfterCollectionRun', handle));
        }

        vm.setProp(hooksNamespacedObject, 'runner', runnerHooksObject);
        runnerHooksObject.dispose();
      }

      vm.setProp(bruObject, 'hooks', hooksNamespacedObject);
      hooksNamespacedObject.dispose();
    }
  }

  vm.setProp(bruObject, 'runner', bruRunnerObject);
  vm.setProp(vm.global, 'bru', bruObject);
  bruObject.dispose();

  vm.evalCode(`
    // sendRequest with callback: normalize error.status (axios uses error.response.status) so
    // tests like expect(error.status).to.eql(404) pass in safe sandbox; return response after
    // success callback for consistent promise resolution.
    globalThis.bru.sendRequest = async (requestConfig, callback) => {
      if (!callback) return await globalThis.bru._sendRequest(requestConfig);
      try {
        const response = await globalThis.bru._sendRequest(requestConfig);
        try {
          await callback(null, response);
          return response;
        }
        catch(error) {
          return Promise.reject(error);
        }
      }
      catch(error) {
        const errObj = JSON.parse(JSON.stringify(error));
        if (errObj && errObj.response && typeof errObj.response.status === 'number') errObj.status = errObj.response.status;
        try {
          await callback(errObj, null);
        }
        catch(err) {
          return Promise.reject(err);
        }
      }
    };

    globalThis.bru.cookies.jar = () => {
      const _jar = globalThis.bru.cookies._jar();

      const callWithCallback = async (promiseFn, callback) => {
        if (!callback) return await promiseFn();
        try {
          const result = await promiseFn();
          try { await callback(null, result); } catch(cbErr) { return Promise.reject(cbErr); }
        } catch(err) {
          try { await callback(err, null); } catch(cbErr) { return Promise.reject(cbErr); }
        }
      };

      return {
        getCookie: (url, name, cb) => callWithCallback(() => _jar._getCookie(url, name), cb),
        getCookies: (url, cb) => callWithCallback(() => _jar._getCookies(url), cb),
        setCookie: (url, nameOrCookieObj, valueOrCallback, maybeCallback) => {
          if (typeof nameOrCookieObj === 'object' && nameOrCookieObj !== null) {
            const callback = typeof valueOrCallback === 'function' ? valueOrCallback : undefined;
            return callWithCallback(() => _jar._setCookie(url, nameOrCookieObj), callback);
          } else {
            const value = typeof valueOrCallback === 'string' ? valueOrCallback : '';
            const callback = typeof maybeCallback === 'function' ? maybeCallback : 
                           (typeof valueOrCallback === 'function' ? valueOrCallback : undefined);
            return callWithCallback(() => _jar._setCookie(url, nameOrCookieObj, value), callback);
          }
        },
        setCookies: (url, cookiesArray, cb) => callWithCallback(() => _jar._setCookies(url, cookiesArray), cb),
        clear: (cb) => callWithCallback(() => _jar._clear(), cb),
        deleteCookies: (url, cb) => callWithCallback(() => _jar._deleteCookies(url), cb),
        deleteCookie: (url, name, cb) => callWithCallback(() => _jar._deleteCookie(url, name), cb)
      };
    };
  `);
};

module.exports = addBruShimToContext;
