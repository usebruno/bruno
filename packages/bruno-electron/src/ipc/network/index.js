const qs = require('qs');
const https = require('https');
const axios = require('axios');
const path = require('path');
const decomment = require('decomment');
const contentDispositionParser = require('content-disposition');
const mime = require('mime-types');
const { ipcMain } = require('electron');
const { each, get, extend, cloneDeep } = require('lodash');
const { VarsRuntime, AssertRuntime, ScriptRuntime, TestRuntime } = require('@usebruno/js');
const { prepareRequest, prepareGqlIntrospectionRequest, getJsSandboxRuntime, configureRequest, parseDataFromResponse } = require('../../utils/request');
const { cancelTokens, saveCancelToken, deleteCancelToken } = require('../../utils/cancel-token');
const { uuid, safeStringifyJSON, safeParseJSON } = require('../../utils/common');
const interpolateVars = require('./interpolate-vars');
const { preferencesUtil } = require('../../store/preferences');
const { getProcessEnvVars } = require('../../store/process-env');
const { getBrunoConfig } = require('../../store/bruno-config');
const { chooseFileToSave, writeBinaryFile, writeFile } = require('../../utils/filesystem');
const { addCookieToJar, getDomainsWithCookies, getCookieStringForUrl } = require('../../utils/cookies');
const Oauth2Store = require('../../store/oauth2');
const FormData = require('form-data');
const { createFormData } = require('../../utils/form-data');
const { findItemInCollectionByPathname, sortFolder, getAllRequestsInFolderRecursively, getEnvVars } = require('../../utils/collection');

const saveCookies = (url, headers) => {
  if (preferencesUtil.shouldStoreCookies()) {
    let setCookieHeaders = [];
    if (headers['set-cookie']) {
      setCookieHeaders = Array.isArray(headers['set-cookie'])
        ? headers['set-cookie']
        : [headers['set-cookie']];
      for (let setCookieHeader of setCookieHeaders) {
        if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
          addCookieToJar(setCookieHeader, url);
        }
      }
    }
  }
}

const registerNetworkIpc = (mainWindow) => {
  const onConsoleLog = (type, args) => {
    console[type](...args);

    mainWindow.webContents.send('main:console-log', {
      type,
      args
    });
  };

  const runPreRequest = async (
    request,
    requestUid,
    envVars,
    collectionPath,
    collectionRoot,
    collectionUid,
    runtimeVariables,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname
  ) => {
    // run pre-request script
    let scriptResult;
    const requestScript = get(request, 'script.req');
    if (requestScript?.length) {
      const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
      scriptResult = await scriptRuntime.runRequestScript(
        decomment(requestScript),
        request,
        envVars,
        runtimeVariables,
        collectionPath,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        runRequestByItemPathname
      );

      mainWindow.webContents.send('main:script-environment-update', {
        envVariables: scriptResult.envVariables,
        runtimeVariables: scriptResult.runtimeVariables,
        requestUid,
        collectionUid
      });

      mainWindow.webContents.send('main:global-environment-variables-update', {
        globalEnvironmentVariables: scriptResult.globalEnvironmentVariables
      });
    }

    // interpolate variables inside request
    interpolateVars(request, envVars, runtimeVariables, processEnvVars);

    // if this is a graphql request, parse the variables, only after interpolation
    // https://github.com/usebruno/bruno/issues/884
    if (request.mode === 'graphql') {
      request.data.variables = JSON.parse(request.data.variables);
    }

    // stringify the request url encoded params
    if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
      request.data = qs.stringify(request.data);
    }

    if (request.headers['content-type'] === 'multipart/form-data') {
      if (!(request.data instanceof FormData)) {
        let form = createFormData(request.data, collectionPath);
        request.data = form;
        extend(request.headers, form.getHeaders());
      }
    }

    return scriptResult;
  };

  const runPostResponse = async (
    request,
    response,
    requestUid,
    envVars,
    collectionPath,
    collectionRoot,
    collectionUid,
    runtimeVariables,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname
  ) => {
    // run post-response vars
    const postResponseVars = get(request, 'vars.res', []);
    if (postResponseVars?.length) {
      const varsRuntime = new VarsRuntime({ runtime: scriptingConfig?.runtime });
      const result = varsRuntime.runPostResponseVars(
        postResponseVars,
        request,
        response,
        envVars,
        runtimeVariables,
        collectionPath,
        processEnvVars
      );

      if (result) {
        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: result.envVariables,
          runtimeVariables: result.runtimeVariables,
          requestUid,
          collectionUid
        });

        mainWindow.webContents.send('main:global-environment-variables-update', {
          globalEnvironmentVariables: result.globalEnvironmentVariables
        });
      }

      if (result?.error) {
        mainWindow.webContents.send('main:display-error', result.error);
      }
    }

    // run post-response script
    const responseScript = get(request, 'script.res');
    let scriptResult;
    if (responseScript?.length) {
      const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
      scriptResult = await scriptRuntime.runResponseScript(
        decomment(responseScript),
        request,
        response,
        envVars,
        runtimeVariables,
        collectionPath,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        runRequestByItemPathname
      );

      mainWindow.webContents.send('main:script-environment-update', {
        envVariables: scriptResult.envVariables,
        runtimeVariables: scriptResult.runtimeVariables,
        requestUid,
        collectionUid
      });

      mainWindow.webContents.send('main:global-environment-variables-update', {
        globalEnvironmentVariables: scriptResult.globalEnvironmentVariables
      });
    }
    return scriptResult;
  };

  const runRequest = async ({ item, collection, environment, runtimeVariables, runInBackground = false }) => {
    const collectionUid = collection.uid;
    const collectionPath = collection.pathname;
    const cancelTokenUid = uuid();
    const requestUid = uuid();

    const runRequestByItemPathname = async (relativeItemPathname) => {
      return new Promise(async (resolve, reject) => {
        let itemPathname = path.join(collection?.pathname, relativeItemPathname);
        if (itemPathname && !itemPathname?.endsWith('.bru')) {
          itemPathname = `${itemPathname}.bru`;
        }
        const _item = findItemInCollectionByPathname(collection, itemPathname);
        if(_item) {
          const res = await runRequest({ item: _item, collection, environment, runtimeVariables, runInBackground: true });
          resolve(res);
        }
        reject(`bru.runRequest: invalid request path - ${itemPathname}`);
      });
    }

    !runInBackground && mainWindow.webContents.send('main:run-request-event', {
      type: 'request-queued',
      requestUid,
      collectionUid,
      itemUid: item.uid,
      cancelTokenUid
    });

    const collectionRoot = get(collection, 'root', {});

    const request = prepareRequest(item, collection);
    request.__bruno__executionMode = 'standalone';
    const envVars = getEnvVars(environment);
    const processEnvVars = getProcessEnvVars(collectionUid);
    const brunoConfig = getBrunoConfig(collectionUid);
    const scriptingConfig = get(brunoConfig, 'scripts', {});
    scriptingConfig.runtime = getJsSandboxRuntime(collection);

    try {
      const controller = new AbortController();
      request.signal = controller.signal;
      saveCancelToken(cancelTokenUid, controller);

      await runPreRequest(
        request,
        requestUid,
        envVars,
        collectionPath,
        collectionRoot,
        collectionUid,
        runtimeVariables,
        processEnvVars,
        scriptingConfig,
        runRequestByItemPathname
      );

      const axiosInstance = await configureRequest(
        collectionUid,
        request,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath
      );

      !runInBackground && mainWindow.webContents.send('main:run-request-event', {
        type: 'request-sent',
        requestSent: {
          url: request.url,
          method: request.method,
          headers: request.headers,
          data: safeParseJSON(safeStringifyJSON(request.data)),
          timestamp: Date.now()
        },
        collectionUid,
        itemUid: item.uid,
        requestUid,
        cancelTokenUid
      });

      if (request?.oauth2Credentials) {
        mainWindow.webContents.send('main:credentials-update', {
          credentials: request?.oauth2Credentials?.credentials,
          url: request?.oauth2Credentials?.url,
          collectionUid,
          credentialsId: request?.oauth2Credentials?.credentialsId
        });
      }

      let response, responseTime;
      try {
        /** @type {import('axios').AxiosResponse} */
        response = await axiosInstance(request);

        // Prevents the duration on leaking to the actual result
        responseTime = response.headers.get('request-duration');
        response.headers.delete('request-duration');
      } catch (error) {
        deleteCancelToken(cancelTokenUid);

        // if it's a cancel request, don't continue
        if (axios.isCancel(error)) {
          let error = new Error('Request cancelled');
          error.isCancel = true;
          return Promise.reject(error);
        }

        if (error?.response) {
          response = error.response;

          // Prevents the duration on leaking to the actual result
          responseTime = response.headers.get('request-duration');
          response.headers.delete('request-duration');
        } else {
          // if it's not a network error, don't continue
          return Promise.reject(error);
        }
      }

      // Continue with the rest of the request lifecycle - post response vars, script, assertions, tests

      const { data, dataBuffer } = parseDataFromResponse(response, request.__brunoDisableParsingResponseJson);
      response.data = data;

      response.responseTime = responseTime;

      // save cookies
      if (preferencesUtil.shouldStoreCookies()) {
        saveCookies(request.url, response.headers);
      }

      // send domain cookies to renderer
      const domainsWithCookies = await getDomainsWithCookies();

      mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));

      await runPostResponse(
        request,
        response,
        requestUid,
        envVars,
        collectionPath,
        collectionRoot,
        collectionUid,
        runtimeVariables,
        processEnvVars,
        scriptingConfig,
        runRequestByItemPathname
      );

      // run assertions
      const assertions = get(request, 'assertions');
      if (assertions) {
        const assertRuntime = new AssertRuntime({ runtime: scriptingConfig?.runtime });
        const results = assertRuntime.runAssertions(
          assertions,
          request,
          response,
          envVars,
          runtimeVariables,
          processEnvVars
        );

        !runInBackground && mainWindow.webContents.send('main:run-request-event', {
          type: 'assertion-results',
          results: results,
          itemUid: item.uid,
          requestUid,
          collectionUid
        });
      }

      const testFile = get(request, 'tests');
      if (typeof testFile === 'string') {
        const testRuntime = new TestRuntime({ runtime: scriptingConfig?.runtime });
        const testResults = await testRuntime.runTests(
          decomment(testFile),
          request,
          response,
          envVars,
          runtimeVariables,
          collectionPath,
          onConsoleLog,
          processEnvVars,
          scriptingConfig,
          runRequestByItemPathname
        );

        !runInBackground && mainWindow.webContents.send('main:run-request-event', {
          type: 'test-results',
          results: testResults.results,
          itemUid: item.uid,
          requestUid,
          collectionUid
        });

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: testResults.envVariables,
          runtimeVariables: testResults.runtimeVariables,
          requestUid,
          collectionUid
        });

        mainWindow.webContents.send('main:global-environment-variables-update', {
          globalEnvironmentVariables: testResults.globalEnvironmentVariables
        });
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        dataBuffer: dataBuffer.toString('base64'),
        size: Buffer.byteLength(dataBuffer),
        duration: responseTime ?? 0
      };
    } catch (error) {
      deleteCancelToken(cancelTokenUid);

      return Promise.reject(error);
    }
  }

  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, item, collection, environment, runtimeVariables) => {
    return await runRequest({ item, collection, environment, runtimeVariables });
  });

  ipcMain.handle('clear-oauth2-cache', async (event, uid, url, credentialsId) => {
    return new Promise((resolve, reject) => {
      try {
        const oauth2Store = new Oauth2Store();
        oauth2Store.clearSessionIdOfCollection({ collectionUid: uid, url, credentialsId });
        resolve();
      } catch (err) {
        reject(new Error('Could not clear oauth2 cache'));
      }
    });
  });

  ipcMain.handle('read-oauth2-cached-credentials', async (event, uid) => {
    return new Promise((resolve, reject) => {
      try {
        const oauth2Store = new Oauth2Store();
        return resolve(oauth2Store.getOauth2DataOfCollection(uid).credentials ?? {});
      } catch (err) {
        reject(new Error('Could not read cached oauth2 credentials'));
      }
    });
  });

  ipcMain.handle('cancel-http-request', async (event, cancelTokenUid) => {
    return new Promise((resolve, reject) => {
      if (cancelTokenUid && cancelTokens[cancelTokenUid]) {
        cancelTokens[cancelTokenUid].abort();
        deleteCancelToken(cancelTokenUid);
        resolve();
      } else {
        reject(new Error('cancel token not found'));
      }
    });
  });

  ipcMain.handle('fetch-gql-schema', async (event, endpoint, environment, _request, collection) => {
    try {
      const envVars = getEnvVars(environment);
      const collectionRoot = get(collection, 'root', {});
      const request = prepareGqlIntrospectionRequest(endpoint, envVars, _request, collectionRoot);

      request.timeout = preferencesUtil.getRequestTimeout();

      if (!preferencesUtil.shouldVerifyTls()) {
        request.httpsAgent = new https.Agent({
          rejectUnauthorized: false
        });
      }

      const requestUid = uuid();
      const collectionPath = collection.pathname;
      const collectionUid = collection.uid;
      const runtimeVariables = collection.runtimeVariables;
      const processEnvVars = getProcessEnvVars(collectionUid);
      const brunoConfig = getBrunoConfig(collection.uid);
      const scriptingConfig = get(brunoConfig, 'scripts', {});
      scriptingConfig.runtime = getJsSandboxRuntime(collection);

      await runPreRequest(
        request,
        requestUid,
        envVars,
        collectionPath,
        collectionRoot,
        collectionUid,
        runtimeVariables,
        processEnvVars,
        scriptingConfig
      );

      interpolateVars(request, envVars, collection.runtimeVariables, processEnvVars);
      const axiosInstance = await configureRequest(
        collection.uid,
        request,
        envVars,
        collection.runtimeVariables,
        processEnvVars,
        collectionPath
      );
      const response = await axiosInstance(request);

      await runPostResponse(
        request,
        response,
        requestUid,
        envVars,
        collectionPath,
        collectionRoot,
        collectionUid,
        runtimeVariables,
        processEnvVars,
        scriptingConfig
      );

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      };
    } catch (error) {
      if (error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        };
      }

      return Promise.reject(error);
    }
  });

  ipcMain.handle(
    'renderer:run-collection-folder',
    async (event, folder, collection, environment, runtimeVariables, recursive, delay) => {
      const collectionUid = collection.uid;
      const collectionPath = collection.pathname;
      const folderUid = folder ? folder.uid : null;
      const cancelTokenUid = uuid();
      const brunoConfig = getBrunoConfig(collectionUid);
      const scriptingConfig = get(brunoConfig, 'scripts', {});
      scriptingConfig.runtime = getJsSandboxRuntime(collection);
      const collectionRoot = get(collection, 'root', {});
      let stopRunnerExecution = false;

      const abortController = new AbortController();
      saveCancelToken(cancelTokenUid, abortController);

      const runRequestByItemPathname = async (relativeItemPathname) => {
        return new Promise(async (resolve, reject) => {
          let itemPathname = path.join(collection?.pathname, relativeItemPathname);
          if (itemPathname && !itemPathname?.endsWith('.bru')) {
            itemPathname = `${itemPathname}.bru`;
          }
          const _item = findItemInCollectionByPathname(collection, itemPathname);
          if(_item) {
            const res = await runRequest({ item: _item, collection, environment, runtimeVariables, runInBackground: true });
            resolve(res);
          }
          reject(`bru.runRequest: invalid request path - ${itemPathname}`);
        });
      }

      if (!folder) {
        folder = collection;
      }

      mainWindow.webContents.send('main:run-folder-event', {
        type: 'testrun-started',
        isRecursive: recursive,
        collectionUid,
        folderUid,
        cancelTokenUid
      });

      try {
        const envVars = getEnvVars(environment);
        let folderRequests = [];

        if (recursive) {
          let sortedFolder = sortFolder(folder);
          folderRequests = getAllRequestsInFolderRecursively(sortedFolder);
        } else {
          each(folder.items, (item) => {
            if (item.request) {
              folderRequests.push(item);
            }
          });

          // sort requests by seq property
          folderRequests.sort((a, b) => {
            return a.seq - b.seq;
          });
        }

        let currentRequestIndex = 0;
        let nJumps = 0; // count the number of jumps to avoid infinite loops
        while (currentRequestIndex < folderRequests.length) {
          // user requested to cancel runner
          if (abortController.signal.aborted) {
            let error = new Error('Runner execution cancelled');
            error.isCancel = true;
            throw error;
          }

          stopRunnerExecution = false;

          const item = cloneDeep(folderRequests[currentRequestIndex]);
          let nextRequestName;
          const itemUid = item.uid;
          const eventData = {
            collectionUid,
            folderUid,
            itemUid
          };

          let timeStart;
          let timeEnd;

          mainWindow.webContents.send('main:run-folder-event', {
            type: 'request-queued',
            ...eventData
          });

          const request = prepareRequest(item, collection);
          request.__bruno__executionMode = 'runner';
          
          const requestUid = uuid();
          const processEnvVars = getProcessEnvVars(collectionUid);

          try {
            const preRequestScriptResult = await runPreRequest(
              request,
              requestUid,
              envVars,
              collectionPath,
              collectionRoot,
              collectionUid,
              runtimeVariables,
              processEnvVars,
              scriptingConfig,
              runRequestByItemPathname
            );

            if (preRequestScriptResult?.nextRequestName !== undefined) {
              nextRequestName = preRequestScriptResult.nextRequestName;
            }

            if (preRequestScriptResult?.stopExecution) {
              stopRunnerExecution = true;
            }

            if (preRequestScriptResult?.skipRequest) {
              mainWindow.webContents.send('main:run-folder-event', {
                type: 'runner-request-skipped',
                error: 'Request has been skipped from pre-request script',
                responseReceived: {
                  status: 'skipped',
                  statusText: 'request skipped via pre-request script',
                  data: null
                },
                ...eventData
              });
              currentRequestIndex++;
              continue;
            }

            // todo:
            // i have no clue why electron can't send the request object
            // without safeParseJSON(safeStringifyJSON(request.data))
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'request-sent',
              requestSent: {
                url: request.url,
                method: request.method,
                headers: request.headers,
                data: safeParseJSON(safeStringifyJSON(request.data))
              },
              ...eventData
            });

            request.signal = abortController.signal;
            const axiosInstance = await configureRequest(
              collectionUid,
              request,
              envVars,
              runtimeVariables,
              processEnvVars,
              collectionPath
            );

            if (request?.oauth2Credentials) {
              mainWindow.webContents.send('main:credentials-update', {
                credentials: request?.oauth2Credentials?.credentials,
                url: request?.oauth2Credentials?.url,
                collectionUid,
                credentialsId: request?.oauth2Credentials?.credentialsId
              });
            }

            timeStart = Date.now();
            let response, responseTime;
            try {
              if (delay && !Number.isNaN(delay) && delay > 0) {
                const delayPromise = new Promise((resolve) => setTimeout(resolve, delay));

                const cancellationPromise = new Promise((_, reject) => {
                  abortController.signal.addEventListener('abort', () => {
                    reject(new Error('Cancelled'));
                  });
                });

                await Promise.race([delayPromise, cancellationPromise]);
              }

              /** @type {import('axios').AxiosResponse} */
              response = await axiosInstance(request);
              timeEnd = Date.now();

              const { data, dataBuffer } = parseDataFromResponse(response, request.__brunoDisableParsingResponseJson);
              response.data = data;
              response.responseTime = response.headers.get('request-duration');

              // save cookies
              if (preferencesUtil.shouldStoreCookies()) {
                saveCookies(request.url, response.headers);
              }

              // send domain cookies to renderer
              const domainsWithCookies = await getDomainsWithCookies();

              mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'response-received',
                responseReceived: {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                  duration: timeEnd - timeStart,
                  dataBuffer: dataBuffer.toString('base64'),
                  size: Buffer.byteLength(dataBuffer),
                  data: response.data,
                  responseTime: response.headers.get('request-duration')
                },
                ...eventData
              });
            } catch (error) {
              if (error?.response && !axios.isCancel(error)) {
                const { data, dataBuffer } = parseDataFromResponse(error.response);
                error.response.data = data;

                timeEnd = Date.now();
                response = {
                  status: error.response.status,
                  statusText: error.response.statusText,
                  headers: error.response.headers,
                  duration: timeEnd - timeStart,
                  dataBuffer: dataBuffer.toString('base64'),
                  size: Buffer.byteLength(dataBuffer),
                  data: error.response.data,
                  responseTime: error.response.headers.get('request-duration')
                };

                // if we get a response from the server, we consider it as a success
                mainWindow.webContents.send('main:run-folder-event', {
                  type: 'response-received',
                  error: error ? error.message : 'An error occurred while running the request',
                  responseReceived: response,
                  ...eventData
                });
              } else {
                // if it's not a network error, don't continue
                throw Promise.reject(error);
              }
            }

            const postRequestScriptResult = await runPostResponse(
              request,
              response,
              requestUid,
              envVars,
              collectionPath,
              collectionRoot,
              collectionUid,
              runtimeVariables,
              processEnvVars,
              scriptingConfig,
              runRequestByItemPathname
            );

            if (postRequestScriptResult?.nextRequestName !== undefined) {
              nextRequestName = postRequestScriptResult.nextRequestName;
            }

            if (postRequestScriptResult?.stopExecution) {
              stopRunnerExecution = true;
            }

            // run assertions
            const assertions = get(item, 'request.assertions');
            if (assertions) {
              const assertRuntime = new AssertRuntime({ runtime: scriptingConfig?.runtime });
              const results = assertRuntime.runAssertions(
                assertions,
                request,
                response,
                envVars,
                runtimeVariables,
                processEnvVars
              );

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'assertion-results',
                assertionResults: results,
                itemUid: item.uid,
                collectionUid
              });
            }

            const testFile = get(request, 'tests');
            if (typeof testFile === 'string') {
              const testRuntime = new TestRuntime({ runtime: scriptingConfig?.runtime });
              const testResults = await testRuntime.runTests(
                decomment(testFile),
                request,
                response,
                envVars,
                runtimeVariables,
                collectionPath,
                onConsoleLog,
                processEnvVars,
                scriptingConfig,
                runRequestByItemPathname
              );

              if (testResults?.nextRequestName !== undefined) {
                nextRequestName = testResults.nextRequestName;
              }

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'test-results',
                testResults: testResults.results,
                ...eventData
              });

              mainWindow.webContents.send('main:script-environment-update', {
                envVariables: testResults.envVariables,
                runtimeVariables: testResults.runtimeVariables,
                collectionUid
              });

              mainWindow.webContents.send('main:global-environment-variables-update', {
                globalEnvironmentVariables: testResults.globalEnvironmentVariables
              });
            }
          } catch (error) {
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'error',
              error: error ? error.message : 'An error occurred while running the request',
              responseReceived: {},
              ...eventData
            });
          }

          if (stopRunnerExecution) {
            deleteCancelToken(cancelTokenUid);
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'testrun-ended',
              collectionUid,
              folderUid,
              statusText: 'collection run was terminated!'
            });
            break;
          }

          if (nextRequestName !== undefined) {
            nJumps++;
            if (nJumps > 10000) {
              throw new Error('Too many jumps, possible infinite loop');
            }
            if (nextRequestName === null) {
              break;
            }
            const nextRequestIdx = folderRequests.findIndex((request) => request.name === nextRequestName);
            if (nextRequestIdx >= 0) {
              currentRequestIndex = nextRequestIdx;
            } else {
              console.error("Could not find request with name '" + nextRequestName + "'");
              currentRequestIndex++;
            }
          } else {
            currentRequestIndex++;
          }
        }

        deleteCancelToken(cancelTokenUid);
        mainWindow.webContents.send('main:run-folder-event', {
          type: 'testrun-ended',
          collectionUid,
          folderUid
        });
      } catch (error) {
        deleteCancelToken(cancelTokenUid);
        mainWindow.webContents.send('main:run-folder-event', {
          type: 'testrun-ended',
          collectionUid,
          folderUid,
          error: error && !error.isCancel ? error : null
        });
      }
    }
  );

  // save response to file
  ipcMain.handle('renderer:save-response-to-file', async (event, response, url) => {
    try {
      const getHeaderValue = (headerName) => {
        const headersArray = typeof response.headers === 'object' ? Object.entries(response.headers) : [];

        if (headersArray.length > 0) {
          const header = headersArray.find((header) => header[0] === headerName);
          if (header && header.length > 1) {
            return header[1];
          }
        }
      };

      const getFileNameFromContentDispositionHeader = () => {
        const contentDisposition = getHeaderValue('content-disposition');
        try {
          const disposition = contentDispositionParser.parse(contentDisposition);
          return disposition && disposition.parameters['filename'];
        } catch (error) { }
      };

      const getFileNameFromUrlPath = () => {
        const lastPathLevel = new URL(url).pathname.split('/').pop();
        if (lastPathLevel && /\..+/.exec(lastPathLevel)) {
          return lastPathLevel;
        }
      };

      const getFileNameBasedOnContentTypeHeader = () => {
        const contentType = getHeaderValue('content-type');
        const extension = (contentType && mime.extension(contentType)) || 'txt';
        return `response.${extension}`;
      };

      const getEncodingFormat = () => {
        const contentType = getHeaderValue('content-type');
        const extension = mime.extension(contentType) || 'txt';
        return ['json', 'xml', 'html', 'yml', 'yaml', 'txt'].includes(extension) ? 'utf-8' : 'base64';
      };

      const determineFileName = () => {
        return (
          getFileNameFromContentDispositionHeader() || getFileNameFromUrlPath() || getFileNameBasedOnContentTypeHeader()
        );
      };

      const fileName = determineFileName();
      const filePath = await chooseFileToSave(mainWindow, fileName);
      if (filePath) {
        const encoding = getEncodingFormat();
        const data = Buffer.from(response.dataBuffer, 'base64')
        if (encoding === 'utf-8') {
          await writeFile(filePath, data);
        } else {
          await writeBinaryFile(filePath, data);
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerNetworkIpc;
module.exports.configureRequest = configureRequest;
