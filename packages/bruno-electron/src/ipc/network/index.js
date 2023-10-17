const os = require('os');
const fs = require('fs');
const qs = require('qs');
const https = require('https');
const axios = require('axios');
const decomment = require('decomment');
const Mustache = require('mustache');
const FormData = require('form-data');
const { ipcMain } = require('electron');
const { forOwn, extend, each, get, compact } = require('lodash');
const { VarsRuntime, AssertRuntime, ScriptRuntime, TestRuntime } = require('@usebruno/js');
const prepareRequest = require('./prepare-request');
const prepareGqlIntrospectionRequest = require('./prepare-gql-introspection-request');
const { cancelTokens, saveCancelToken, deleteCancelToken } = require('../../utils/cancel-token');
const { uuid } = require('../../utils/common');
const interpolateVars = require('./interpolate-vars');
const { interpolateString } = require('./interpolate-string');
const { sortFolder, getAllRequestsInFolderRecursively } = require('./helper');
const { preferences } = require('../../store/preferences');
const { getProcessEnvVars } = require('../../store/process-env');
const { getBrunoConfig } = require('../../store/bruno-config');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { makeAxiosInstance } = require('./axios-instance');
const { addAwsV4Interceptor, resolveCredentials } = require('./awsv4auth-helper');
const { shouldUseProxy } = require('../../utils/proxy-util');

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
    return {
      __name__: environment.name
    };
  }

  const envVars = {};
  each(variables, (variable) => {
    if (variable.enabled) {
      envVars[variable.name] = Mustache.escape(variable.value);
    }
  });

  return {
    ...envVars,
    __name__: environment.name
  };
};

const getSize = (data) => {
  if (!data) {
    return 0;
  }

  if (typeof data === 'string') {
    return Buffer.byteLength(data, 'utf8');
  }

  if (typeof data === 'object') {
    return Buffer.byteLength(safeStringifyJSON(data), 'utf8');
  }

  return 0;
};

const configureRequest = async (collectionUid, request, envVars, collectionVariables, processEnvVars) => {
  const httpsAgentRequestFields = {};
  if (!preferences.isTlsVerification()) {
    httpsAgentRequestFields['rejectUnauthorized'] = false;
  }

  const brunoConfig = getBrunoConfig(collectionUid);
  const interpolationOptions = {
    envVars,
    collectionVariables,
    processEnvVars
  };

  // client certificate config
  const clientCertConfig = get(brunoConfig, 'clientCertificates.certs', []);
  for (let clientCert of clientCertConfig) {
    const domain = interpolateString(clientCert.domain, interpolationOptions);
    const certFilePath = interpolateString(clientCert.certFilePath, interpolationOptions);
    const keyFilePath = interpolateString(clientCert.keyFilePath, interpolationOptions);
    if (domain && certFilePath && keyFilePath) {
      const hostRegex = '^https:\\/\\/' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');

      if (request.url.match(hostRegex)) {
        try {
          httpsAgentRequestFields['cert'] = fs.readFileSync(certFilePath);
          httpsAgentRequestFields['key'] = fs.readFileSync(keyFilePath);
        } catch (err) {
          console.log('Error reading cert/key file', err);
        }
        httpsAgentRequestFields['passphrase'] = interpolateString(clientCert.passphrase, interpolationOptions);
        break;
      }
    }
  }

  // proxy configuration
  let proxyConfig = get(brunoConfig, 'proxy', {});
  let proxyEnabled = get(proxyConfig, 'enabled', 'disabled');
  if (proxyEnabled === 'global') {
    proxyConfig = preferences.getProxyConfig();
    proxyEnabled = get(proxyConfig, 'enabled', false);
  }
  const shouldProxy = shouldUseProxy(request.url, get(proxyConfig, 'noProxy', ''));
  if ((proxyEnabled === true || proxyEnabled === 'enabled') && shouldProxy) {
    const proxyProtocol = interpolateString(get(proxyConfig, 'protocol'), interpolationOptions);
    const proxyHostname = interpolateString(get(proxyConfig, 'hostname'), interpolationOptions);
    const proxyPort = interpolateString(get(proxyConfig, 'port'), interpolationOptions);
    const proxyAuthEnabled = get(proxyConfig, 'auth.enabled', false);
    const socksEnabled = proxyProtocol.includes('socks');

    let proxyUri;
    if (proxyAuthEnabled) {
      const proxyAuthUsername = interpolateString(get(proxyConfig, 'auth.username'), interpolationOptions);
      const proxyAuthPassword = interpolateString(get(proxyConfig, 'auth.password'), interpolationOptions);

      proxyUri = `${proxyProtocol}://${proxyAuthUsername}:${proxyAuthPassword}@${proxyHostname}:${proxyPort}`;
    } else {
      proxyUri = `${proxyProtocol}://${proxyHostname}:${proxyPort}`;
    }

    if (socksEnabled) {
      const socksProxyAgent = new SocksProxyAgent(proxyUri);
      request.httpsAgent = socksProxyAgent;
      request.httpAgent = socksProxyAgent;
    } else {
      request.httpsAgent = new HttpsProxyAgent(
        proxyUri,
        Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
      );
      request.httpAgent = new HttpProxyAgent(proxyUri);
    }
  } else if (Object.keys(httpsAgentRequestFields).length > 0) {
    request.httpsAgent = new https.Agent({
      ...httpsAgentRequestFields
    });
  }

  const axiosInstance = makeAxiosInstance();

  if (request.awsv4config) {
    request.awsv4config = await resolveCredentials(request);
    addAwsV4Interceptor(axiosInstance, request);
    delete request.awsv4config;
  }

  request.timeout = preferences.getTimeout();

  return axiosInstance;
};

const registerNetworkIpc = (mainWindow) => {
  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, item, collection, environment, collectionVariables) => {
    const collectionUid = collection.uid;
    const collectionPath = collection.pathname;
    const cancelTokenUid = uuid();
    const requestUid = uuid();

    const onConsoleLog = (type, args) => {
      console[type](...args);

      mainWindow.webContents.send('main:console-log', {
        type,
        args
      });
    };

    mainWindow.webContents.send('main:run-request-event', {
      type: 'request-queued',
      requestUid,
      collectionUid,
      itemUid: item.uid,
      cancelTokenUid
    });

    const collectionRoot = get(collection, 'root', {});
    const _request = item.draft ? item.draft.request : item.request;
    const request = prepareRequest(_request, collectionRoot);
    const envVars = getEnvVars(environment);
    const processEnvVars = getProcessEnvVars(collectionUid);
    const brunoConfig = getBrunoConfig(collectionUid);
    const scriptingConfig = get(brunoConfig, 'scripts', {});

    try {
      // make axios work in node using form data
      // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
      if (request.headers && request.headers['content-type'] === 'multipart/form-data') {
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

      // run pre-request vars
      const preRequestVars = get(request, 'vars.req', []);
      if (preRequestVars?.length) {
        const varsRuntime = new VarsRuntime();
        const result = varsRuntime.runPreRequestVars(
          preRequestVars,
          request,
          envVars,
          collectionVariables,
          collectionPath,
          processEnvVars
        );

        if (result) {
          mainWindow.webContents.send('main:script-environment-update', {
            envVariables: result.envVariables,
            collectionVariables: result.collectionVariables,
            requestUid,
            collectionUid
          });
        }
      }

      // run pre-request script
      const requestScript = compact([get(collectionRoot, 'request.script.req'), get(request, 'script.req')]).join(
        os.EOL
      );
      if (requestScript?.length) {
        const scriptRuntime = new ScriptRuntime();
        const result = await scriptRuntime.runRequestScript(
          decomment(requestScript),
          request,
          envVars,
          collectionVariables,
          collectionPath,
          onConsoleLog,
          processEnvVars,
          scriptingConfig
        );

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: result.envVariables,
          collectionVariables: result.collectionVariables,
          requestUid,
          collectionUid
        });
      }

      interpolateVars(request, envVars, collectionVariables, processEnvVars);

      // stringify the request url encoded params
      if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
        request.data = qs.stringify(request.data);
      }

      // todo:
      // i have no clue why electron can't send the request object
      // without safeParseJSON(safeStringifyJSON(request.data))
      mainWindow.webContents.send('main:run-request-event', {
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

      const axiosInstance = await configureRequest(
        collectionUid,
        request,
        envVars,
        collectionVariables,
        processEnvVars
      );

      /** @type {import('axios').AxiosResponse} */
      const response = await axiosInstance(request);

      // run post-response vars
      const postResponseVars = get(request, 'vars.res', []);
      if (postResponseVars?.length) {
        const varsRuntime = new VarsRuntime();
        const result = varsRuntime.runPostResponseVars(
          postResponseVars,
          request,
          response,
          envVars,
          collectionVariables,
          collectionPath,
          processEnvVars
        );

        if (result) {
          mainWindow.webContents.send('main:script-environment-update', {
            envVariables: result.envVariables,
            collectionVariables: result.collectionVariables,
            requestUid,
            collectionUid
          });
        }
      }

      // run post-response script
      const responseScript = compact([get(collectionRoot, 'request.script.res'), get(request, 'script.res')]).join(
        os.EOL
      );
      if (responseScript?.length) {
        const scriptRuntime = new ScriptRuntime();
        const result = await scriptRuntime.runResponseScript(
          decomment(responseScript),
          request,
          response,
          envVars,
          collectionVariables,
          collectionPath,
          onConsoleLog,
          processEnvVars,
          scriptingConfig
        );

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: result.envVariables,
          collectionVariables: result.collectionVariables,
          requestUid,
          collectionUid
        });
      }

      // run assertions
      const assertions = get(request, 'assertions');
      if (assertions) {
        const assertRuntime = new AssertRuntime();
        const results = assertRuntime.runAssertions(
          assertions,
          request,
          response,
          envVars,
          collectionVariables,
          collectionPath
        );

        mainWindow.webContents.send('main:run-request-event', {
          type: 'assertion-results',
          results: results,
          itemUid: item.uid,
          requestUid,
          collectionUid
        });
      }

      // run tests
      const testFile = compact([
        get(collectionRoot, 'request.tests'),
        item.draft ? get(item.draft, 'request.tests') : get(item, 'request.tests')
      ]).join(os.EOL);
      if (typeof testFile === 'string') {
        const testRuntime = new TestRuntime();
        const testResults = await testRuntime.runTests(
          decomment(testFile),
          request,
          response,
          envVars,
          collectionVariables,
          collectionPath,
          onConsoleLog,
          processEnvVars,
          scriptingConfig
        );

        mainWindow.webContents.send('main:run-request-event', {
          type: 'test-results',
          results: testResults.results,
          itemUid: item.uid,
          requestUid,
          collectionUid
        });

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: testResults.envVariables,
          collectionVariables: testResults.collectionVariables,
          requestUid,
          collectionUid
        });
      }

      deleteCancelToken(cancelTokenUid);
      // Prevents the duration on leaking to the actual result
      const requestDuration = response.headers.get('request-duration');
      response.headers.delete('request-duration');

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        duration: requestDuration
      };
    } catch (error) {
      // todo: better error handling
      // need to convey the error to the UI
      // and need not be always a network error
      deleteCancelToken(cancelTokenUid);

      if (axios.isCancel(error)) {
        let error = new Error('Request cancelled');
        error.isCancel = true;
        return Promise.reject(error);
      }

      if (error?.response) {
        // run assertions
        const assertions = get(request, 'assertions');
        if (assertions) {
          const assertRuntime = new AssertRuntime();
          const results = assertRuntime.runAssertions(
            assertions,
            request,
            error.response,
            envVars,
            collectionVariables,
            collectionPath
          );

          mainWindow.webContents.send('main:run-request-event', {
            type: 'assertion-results',
            results: results,
            itemUid: item.uid,
            requestUid,
            collectionUid
          });
        }

        // run tests
        const testFile = compact([
          get(collectionRoot, 'request.tests'),
          item.draft ? get(item.draft, 'request.tests') : get(item, 'request.tests')
        ]).join(os.EOL);
        if (typeof testFile === 'string') {
          const testRuntime = new TestRuntime();
          const testResults = await testRuntime.runTests(
            decomment(testFile),
            request,
            error.response,
            envVars,
            collectionVariables,
            collectionPath,
            onConsoleLog,
            processEnvVars,
            scriptingConfig
          );

          mainWindow.webContents.send('main:run-request-event', {
            type: 'test-results',
            results: testResults.results,
            itemUid: item.uid,
            requestUid,
            collectionUid
          });

          mainWindow.webContents.send('main:script-environment-update', {
            envVariables: testResults.envVariables,
            collectionVariables: testResults.collectionVariables,
            requestUid,
            collectionUid
          });
        }

        // Prevents the duration from leaking to the actual result
        const requestDuration = error.response.headers.get('request-duration');
        error.response.headers.delete('request-duration');
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
          duration: requestDuration ?? 0
        };
      }

      return Promise.reject(error);
    }
  });

  ipcMain.handle('cancel-http-request', async (event, cancelTokenUid) => {
    return new Promise((resolve, reject) => {
      if (cancelTokenUid && cancelTokens[cancelTokenUid]) {
        cancelTokens[cancelTokenUid].cancel();
        deleteCancelToken(cancelTokenUid);
        resolve();
      } else {
        reject(new Error('cancel token not found'));
      }
    });
  });

  ipcMain.handle('fetch-gql-schema', async (event, endpoint, environment, request, collection) => {
    try {
      const envVars = getEnvVars(environment);
      const collectionRoot = get(collection, 'root', {});
      const preparedRequest = prepareGqlIntrospectionRequest(endpoint, envVars, request, collectionRoot);

      request.timeout = preferences.getTimeout();

      if (!preferences.isTlsVerification()) {
        request.httpsAgent = new https.Agent({
          rejectUnauthorized: false
        });
      }

      const processEnvVars = getProcessEnvVars(collection.uid);
      interpolateVars(preparedRequest, envVars, collection.collectionVariables, processEnvVars);

      const response = await axios(preparedRequest);

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
    async (event, folder, collection, environment, collectionVariables, recursive) => {
      const collectionUid = collection.uid;
      const collectionPath = collection.pathname;
      const folderUid = folder ? folder.uid : null;
      const brunoConfig = getBrunoConfig(collectionUid);
      const scriptingConfig = get(brunoConfig, 'scripts', {});
      const collectionRoot = get(collection, 'root', {});

      const onConsoleLog = (type, args) => {
        console[type](...args);

        mainWindow.webContents.send('main:console-log', {
          type,
          args
        });
      };

      if (!folder) {
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

        for (let item of folderRequests) {
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

          const _request = item.draft ? item.draft.request : item.request;
          const request = prepareRequest(_request, collectionRoot);
          const processEnvVars = getProcessEnvVars(collectionUid);

          try {
            // make axios work in node using form data
            // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
            if (request.headers && request.headers['content-type'] === 'multipart/form-data') {
              const form = new FormData();
              forOwn(request.data, (value, key) => {
                form.append(key, value);
              });
              extend(request.headers, form.getHeaders());
              request.data = form;
            }

            // run pre-request vars
            const preRequestVars = get(request, 'vars.req', []);
            if (preRequestVars && preRequestVars.length) {
              const varsRuntime = new VarsRuntime();
              const result = varsRuntime.runPreRequestVars(
                preRequestVars,
                request,
                envVars,
                collectionVariables,
                collectionPath
              );

              if (result) {
                mainWindow.webContents.send('main:script-environment-update', {
                  envVariables: result.envVariables,
                  collectionVariables: result.collectionVariables,
                  collectionUid
                });
              }
            }

            // run pre-request script
            const requestScript = compact([get(collectionRoot, 'request.script.req'), get(request, 'script.req')]).join(
              os.EOL
            );
            if (requestScript?.length) {
              const scriptRuntime = new ScriptRuntime();
              const result = await scriptRuntime.runRequestScript(
                decomment(requestScript),
                request,
                envVars,
                collectionVariables,
                collectionPath,
                onConsoleLog,
                processEnvVars,
                scriptingConfig
              );

              mainWindow.webContents.send('main:script-environment-update', {
                envVariables: result.envVariables,
                collectionVariables: result.collectionVariables,
                collectionUid
              });
            }

            // interpolate variables inside request
            interpolateVars(request, envVars, collectionVariables, processEnvVars);

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

            const axiosInstance = await configureRequest(
              collectionUid,
              request,
              envVars,
              collectionVariables,
              processEnvVars
            );

            timeStart = Date.now();
            /** @type {import('axios').AxiosResponse} */
            const response = await axiosInstance(request);
            timeEnd = Date.now();

            // run post-response vars
            const postResponseVars = get(request, 'vars.res', []);
            if (postResponseVars?.length) {
              const varsRuntime = new VarsRuntime();
              const result = varsRuntime.runPostResponseVars(
                postResponseVars,
                request,
                response,
                envVars,
                collectionVariables,
                collectionPath,
                processEnvVars
              );

              if (result) {
                mainWindow.webContents.send('main:script-environment-update', {
                  envVariables: result.envVariables,
                  collectionVariables: result.collectionVariables,
                  collectionUid
                });
              }
            }

            // run response script
            const responseScript = compact([
              get(collectionRoot, 'request.script.res'),
              get(request, 'script.res')
            ]).join(os.EOL);
            if (responseScript && responseScript.length) {
              const scriptRuntime = new ScriptRuntime();
              const result = await scriptRuntime.runResponseScript(
                decomment(responseScript),
                request,
                response,
                envVars,
                collectionVariables,
                collectionPath,
                onConsoleLog,
                processEnvVars,
                scriptingConfig
              );

              mainWindow.webContents.send('main:script-environment-update', {
                envVariables: result.envVariables,
                collectionVariables: result.collectionVariables,
                collectionUid
              });
            }

            // run assertions
            const assertions = get(item, 'request.assertions');
            if (assertions) {
              const assertRuntime = new AssertRuntime();
              const results = assertRuntime.runAssertions(
                assertions,
                request,
                response,
                envVars,
                collectionVariables,
                collectionPath
              );

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'assertion-results',
                assertionResults: results,
                itemUid: item.uid,
                collectionUid
              });
            }

            // run tests
            const testFile = compact([
              get(collectionRoot, 'request.tests'),
              item.draft ? get(item.draft, 'request.tests') : get(item, 'request.tests')
            ]).join(os.EOL);
            if (typeof testFile === 'string') {
              const testRuntime = new TestRuntime();
              const testResults = await testRuntime.runTests(
                decomment(testFile),
                request,
                response,
                envVars,
                collectionVariables,
                collectionPath,
                onConsoleLog,
                processEnvVars,
                scriptingConfig
              );

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'test-results',
                testResults: testResults.results,
                ...eventData
              });

              mainWindow.webContents.send('main:script-environment-update', {
                envVariables: testResults.envVariables,
                collectionVariables: testResults.collectionVariables,
                collectionUid
              });
            }

            mainWindow.webContents.send('main:run-folder-event', {
              type: 'response-received',
              ...eventData,
              responseReceived: {
                status: response.status,
                statusText: response.statusText,
                headers: Object.entries(response.headers),
                duration: timeEnd - timeStart,
                size: response.headers['content-length'] || getSize(response.data),
                data: response.data
              }
            });
          } catch (error) {
            let responseReceived = {};
            let duration = 0;

            if (timeStart && timeEnd) {
              duration = timeEnd - timeStart;
            }

            if (error?.response) {
              responseReceived = {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: Object.entries(error.response.headers),
                duration: duration,
                size: error.response.headers['content-length'] || getSize(error.response.data),
                data: error.response.data
              };

              // run assertions
              const assertions = get(item, 'request.assertions');
              if (assertions) {
                const assertRuntime = new AssertRuntime();
                const results = assertRuntime.runAssertions(
                  assertions,
                  request,
                  error.response,
                  envVars,
                  collectionVariables,
                  collectionPath
                );

                mainWindow.webContents.send('main:run-folder-event', {
                  type: 'assertion-results',
                  assertionResults: results,
                  itemUid: item.uid,
                  collectionUid
                });
              }

              // run tests
              const testFile = compact([
                get(collectionRoot, 'request.tests'),
                item.draft ? get(item.draft, 'request.tests') : get(item, 'request.tests')
              ]).join(os.EOL);
              if (typeof testFile === 'string') {
                const testRuntime = new TestRuntime();
                const testResults = await testRuntime.runTests(
                  decomment(testFile),
                  request,
                  error.response,
                  envVars,
                  collectionVariables,
                  collectionPath,
                  onConsoleLog,
                  processEnvVars,
                  scriptingConfig
                );

                mainWindow.webContents.send('main:run-folder-event', {
                  type: 'test-results',
                  testResults: testResults.results,
                  ...eventData
                });

                mainWindow.webContents.send('main:script-environment-update', {
                  envVariables: testResults.envVariables,
                  collectionVariables: testResults.collectionVariables,
                  collectionUid
                });
              }

              // if we get a response from the server, we consider it as a success
              mainWindow.webContents.send('main:run-folder-event', {
                type: 'response-received',
                error: error ? error.message : 'An error occurred while running the request',
                responseReceived: responseReceived,
                ...eventData
              });

              continue;
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
    }
  );
};

module.exports = registerNetworkIpc;
