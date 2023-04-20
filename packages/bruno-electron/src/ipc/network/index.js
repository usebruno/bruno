const axios = require('axios');
const Mustache = require('mustache');
const FormData = require('form-data');
const { ipcMain } = require('electron');
const { forOwn, extend, each, get } = require('lodash');
const { VarsRuntime, AssertRuntime, ScriptRuntime, TestRuntime } = require('@usebruno/js');
const prepareRequest = require('./prepare-request');
const prepareGqlIntrospectionRequest = require('./prepare-gql-introspection-request');
const { cancelTokens, saveCancelToken, deleteCancelToken } = require('../../utils/cancel-token');
const { uuid } = require('../../utils/common');
const interpolateVars = require('./interpolate-vars');
const { sortFolder, getAllRequestsInFolderRecursively } = require('./helper');

// override the default escape function to prevent escaping
Mustache.escape = function (value) {
  return value;
};

const safeStringifyJSON = (data) => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return data;
  }
};

const safeParseJSON = (data) => {
  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
};

const getEnvVars = (environment = {}) => {
  const variables = environment.variables;
  if (!variables || !variables.length) {
    return {};
  }

  const envVars = {};
  each(variables, (variable) => {
    if(variable.enabled) {
      envVars[variable.name] = Mustache.escape(variable.value);
    }
  });

  return envVars;
};

const getSize = (data) => {
  if(!data) {
    return 0;
  }

  if(typeof data === 'string') {
    return Buffer.byteLength(data, 'utf8');
  }

  if(typeof data === 'object') {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  return 0;
};

const registerNetworkIpc = (mainWindow, watcher, lastOpenedCollections) => {
  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, item, collectionUid, collectionPath, environment, collectionVariables) => {
    const cancelTokenUid = uuid();

    try {
      mainWindow.webContents.send('main:http-request-queued', {
        collectionUid,
        itemUid: item.uid,
        cancelTokenUid
      });

      const _request = item.draft ? item.draft.request : item.request;
      const request = prepareRequest(_request);

      // make axios work in node using form data
      // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
      if(request.headers && request.headers['content-type'] === 'multipart/form-data') {
        const form = new FormData();
        forOwn(request.data, (value, key) => {
          form.append(key, value);
        });
        extend(request.headers, form.getHeaders());
        request.data = form;
      }

      const cancelToken = axios.CancelToken.source();
      request.cancelToken = cancelToken.token;
      saveCancelToken(cancelTokenUid, cancelToken);

      const envVars = getEnvVars(environment);

      // run pre-request vars
      const preRequestVars = get(request, 'vars.req', []);
      if(preRequestVars && preRequestVars.length) {
        const varsRuntime = new VarsRuntime();
        const result = varsRuntime.runPreRequestVars(preRequestVars, request, envVars, collectionVariables, collectionPath);

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: result.envVariables,
          collectionVariables: result.collectionVariables,
          collectionUid
        });
      }

      // run pre-request script
      const requestScript = get(request, 'script.req');
      if(requestScript && requestScript.length) {
        const scriptRuntime = new ScriptRuntime();
        const result = await scriptRuntime.runRequestScript(requestScript, request, envVars, collectionVariables, collectionPath);

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: result.envVariables,
          collectionVariables: result.collectionVariables,
          collectionUid
        });
      }

      interpolateVars(request, envVars, collectionVariables);

      // todo:
      // i have no clue why electron can't send the request object 
      // without safeParseJSON(safeStringifyJSON(request.data))
      mainWindow.webContents.send('main:http-request-sent', {
        requestSent: {
          url: request.url,
          method: request.method,
          headers: request.headers,
          data: safeParseJSON(safeStringifyJSON(request.data))
        },
        collectionUid,
        itemUid: item.uid,
        cancelTokenUid
      });

      const response = await axios(request);

      // run post-response vars
      const postResponseVars = get(request, 'vars.res', []);
      if(postResponseVars && postResponseVars.length) {
        const varsRuntime = new VarsRuntime();
        const result = varsRuntime.runPostResponseVars(postResponseVars, request, response, envVars, collectionVariables, collectionPath);

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: result.envVariables,
          collectionVariables: result.collectionVariables,
          collectionUid
        });
      }

      // run post-response script
      const responseScript = get(request, 'script.res');
      if(responseScript && responseScript.length) {
        const scriptRuntime = new ScriptRuntime();
        const result = await scriptRuntime.runResponseScript(responseScript, request, response, envVars, collectionVariables, collectionPath);

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: result.envVariables,
          collectionVariables: result.collectionVariables,
          collectionUid
        });
      }

      // run assertions
      const assertions = get(request, 'assertions');
      const assertRuntime = new AssertRuntime();
      const results = assertRuntime.runAssertions(assertions, request, response, envVars, collectionVariables, collectionPath);

      mainWindow.webContents.send('main:assertion-results', {
        results: results,
        itemUid: item.uid,
        collectionUid
      });

      // run tests
      const testFile = item.draft ? get(item.draft, 'request.tests') : get(item, 'request.tests');
      const testRuntime = new TestRuntime();
      const testResults = testRuntime.runTests(testFile, request, response, envVars, collectionVariables, collectionPath);

      mainWindow.webContents.send('main:test-results', {
        results: testResults.results,
        itemUid: item.uid,
        collectionUid
      });

      deleteCancelToken(cancelTokenUid);

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      };
    } catch (error) {
      // todo: better error handling
      // need to convey the error to the UI
      // and need not be always a network error
      deleteCancelToken(cancelTokenUid);
      
      if (axios.isCancel(error)) {
        let error = new Error("Request cancelled");
        error.isCancel = true;
        return Promise.reject(error);
      }

      if(error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        }
      };

      return Promise.reject(error);
    }
  });

  ipcMain.handle('cancel-http-request', async (event, cancelTokenUid) => {
    return new Promise((resolve, reject) => {
      if(cancelTokenUid && cancelTokens[cancelTokenUid]) {
        cancelTokens[cancelTokenUid].cancel();
        deleteCancelToken(cancelTokenUid);
        resolve();
      } else {
        reject(new Error("cancel token not found"));
      }
    });
  });

  ipcMain.handle('fetch-gql-schema', async (event, endpoint, environment) => {
    try {
      const envVars = getEnvVars(environment);
      const request = prepareGqlIntrospectionRequest(endpoint, envVars);

      const response = await axios(request);

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      };
    } catch (error) {
      if(error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        }
      };

      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:run-collection-folder', async (event, folder, collection, environment, collectionVariables, recursive) => {
    const collectionUid = collection.uid;
    const collectionPath = collection.pathname;
    const folderUid = folder ? folder.uid : null;

    if(!folder) {
      folder = collection;
    }

    mainWindow.webContents.send('main:run-folder-event', {
      type: 'testrun-started',
      isRecursive: recursive,
      collectionUid,
      folderUid
    });

    try {
      const envVars = getEnvVars(environment);
      let folderRequests = [];

      if(recursive) {
        let sortedFolder = sortFolder(folder);
        folderRequests = getAllRequestsInFolderRecursively(sortedFolder);
      } else {
        each(folder.items, (item) => {
          if(item.request) {
            folderRequests.push(item);
          }
        });

        // sort requests by seq property
        folderRequests.sort((a, b) => {
          return a.seq - b.seq;
        });
      }

      for(let item of folderRequests) {
        const itemUid = item.uid;
        const eventData = {
          collectionUid,
          folderUid,
          itemUid
        };

        let timeStart;
        let timeEnd;

        try {
          mainWindow.webContents.send('main:run-folder-event', {
            type: 'request-queued',
            ...eventData
          });

          const _request = item.draft ? item.draft.request : item.request;
          const request = prepareRequest(_request);

          // make axios work in node using form data
          // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
          if(request.headers && request.headers['content-type'] === 'multipart/form-data') {
            const form = new FormData();
            forOwn(request.data, (value, key) => {
              form.append(key, value);
            });
            extend(request.headers, form.getHeaders());
            request.data = form;
          }

          // run pre-request vars
          const preRequestVars = get(request, 'vars.req', []);
          if(preRequestVars && preRequestVars.length) {
            const varsRuntime = new VarsRuntime();
            varsRuntime.runPreRequestVars(preRequestVars, request, envVars, collectionVariables, collectionPath);
          }

          // run pre-request script
          const requestScript = get(request, 'script.req');
          if(requestScript && requestScript.length) {
            const scriptRuntime = new ScriptRuntime();
            const result = await scriptRuntime.runRequestScript(requestScript, request, envVars, collectionVariables, collectionPath);
    
            mainWindow.webContents.send('main:script-environment-update', {
              envVariables: result.envVariables,
              collectionVariables: result.collectionVariables,
              collectionUid
            });
          }

          // interpolate variables inside request
          interpolateVars(request, envVars, collectionVariables);

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

          // send request
          timeStart = Date.now();
          const response = await axios(request);
          timeEnd = Date.now();

          // run post-response vars
          const postResponseVars = get(request, 'vars.res', []);
          if(postResponseVars && postResponseVars.length) {
            const varsRuntime = new VarsRuntime();
            const result = varsRuntime.runPostResponseVars(postResponseVars, request, response, envVars, collectionVariables, collectionPath);

            mainWindow.webContents.send('main:script-environment-update', {
              envVariables: result.envVariables,
              collectionVariables: result.collectionVariables,
              collectionUid
            });
          }

          // run response script
          const responseScript = get(request, 'script.res');
          if(responseScript && responseScript.length) {
            const scriptRuntime = new ScriptRuntime();
            const result = await scriptRuntime.runResponseScript(responseScript, request, response, envVars, collectionVariables, collectionPath);

            mainWindow.webContents.send('main:script-environment-update', {
              envVariables: result.envVariables,
              collectionVariables: result.collectionVariables,
              collectionUid
            });
          }

          // run assertions
          const assertions = get(item, 'request.assertions');
          if(assertions && assertions.length) {
            const assertRuntime = new AssertRuntime();
            const results = assertRuntime.runAssertions(assertions, request, response, envVars, collectionVariables, collectionPath);

            mainWindow.webContents.send('main:run-folder-event', {
              type: 'assertion-results',
              assertionResults: results,
              itemUid: item.uid,
              collectionUid
            });
          }

          // run tests
          const testFile = item.draft ? get(item.draft, 'request.tests') : get(item, 'request.tests');
          const testRuntime = new TestRuntime();
          const testResults = testRuntime.runTests(testFile, request, response, envVars, collectionVariables, collectionPath);

          mainWindow.webContents.send('main:run-folder-event', {
            type: 'test-results',
            testResults: testResults.results,
            ...eventData
          });

          mainWindow.webContents.send('main:run-folder-event', {
            type: 'response-received',
            ...eventData,
            responseReceived: {
              status: response.status,
              statusText: response.statusText,
              headers: Object.entries(response.headers),
              duration: timeEnd - timeStart,
              size: response.headers['content-length'] || getSize(response.data),
              data: response.data,
            }
          });
        } catch (error) {
          let responseReceived = {};
          let duration = 0;

          if(timeStart && timeEnd) {
            duration = timeEnd - timeStart;
          }

          if(error && error.response) {
            responseReceived = {
              status: error.response.status,
              statusText: error.response.statusText,
              headers: Object.entries(error.response.headers),
              duration: duration,
              size: error.response.headers['content-length'] || getSize(error.response.data),
              data: error.response.data,
            }
          }
          mainWindow.webContents.send('main:run-folder-event', {
            type: 'error',
            error: error ? error.message : 'An error occurred while running the request',
            responseReceived: responseReceived,
            ...eventData
          });
        }
      }

      mainWindow.webContents.send('main:run-folder-event', {
        type: 'testrun-ended',
        collectionUid,
        folderUid
      });
    } catch (error) {
      mainWindow.webContents.send('main:run-folder-event', {
        type: 'error',
        error
      });
    }
  });
};

module.exports = registerNetworkIpc;
