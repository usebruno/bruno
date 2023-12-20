const os = require('os');
const fs = require('fs');
const qs = require('qs');
const https = require('https');
const axios = require('axios');
const path = require('path');
const decomment = require('decomment');
const Mustache = require('mustache');
const contentDispositionParser = require('content-disposition');
const mime = require('mime-types');
const { ipcMain } = require('electron');
const { isUndefined, isNull, each, get, compact } = require('lodash');
const { VarsRuntime, AssertRuntime, ScriptRuntime, TestRuntime } = require('@usebruno/js');
const prepareRequest = require('./prepare-request');
const prepareGqlIntrospectionRequest = require('./prepare-gql-introspection-request');
const { cancelTokens, saveCancelToken, deleteCancelToken } = require('../../utils/cancel-token');
const { uuid } = require('../../utils/common');
const interpolateVars = require('./interpolate-vars');
const { interpolateString } = require('./interpolate-string');
const { sortFolder, getAllRequestsInFolderRecursively } = require('./helper');
const { preferencesUtil } = require('../../store/preferences');
const { getProcessEnvVars } = require('../../store/process-env');
const { getBrunoConfig } = require('../../store/bruno-config');
const { HttpProxyAgent } = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { makeAxiosInstance } = require('./axios-instance');
const { addAwsV4Interceptor, resolveAwsV4Credentials } = require('./awsv4auth-helper');
const { addDigestInterceptor } = require('./digestauth-helper');
const { shouldUseProxy, PatchedHttpsProxyAgent } = require('../../utils/proxy-util');
const { chooseFileToSave, writeBinaryFile } = require('../../utils/filesystem');
const { getCookieStringForUrl, addCookieToJar, getDomainsWithCookies } = require('../../utils/cookies');

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

const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;

const configureRequest = async (
  collectionUid,
  request,
  envVars,
  collectionVariables,
  processEnvVars,
  collectionPath
) => {
  if (!protocolRegex.test(request.url)) {
    request.url = `http://${request.url}`;
  }

  const httpsAgentRequestFields = {};
  if (!preferencesUtil.shouldVerifyTls()) {
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

    let certFilePath = interpolateString(clientCert.certFilePath, interpolationOptions);
    certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collectionPath, certFilePath);

    let keyFilePath = interpolateString(clientCert.keyFilePath, interpolationOptions);
    keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collectionPath, keyFilePath);

    if (domain && certFilePath && keyFilePath) {
      const hostRegex = '^https:\\/\\/' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');

      if (request.url.match(hostRegex)) {
        try {
          httpsAgentRequestFields['cert'] = fs.readFileSync(certFilePath);
        } catch (err) {
          console.log('Error reading cert file', err);
        }

        try {
          httpsAgentRequestFields['key'] = fs.readFileSync(keyFilePath);
        } catch (err) {
          console.log('Error reading key file', err);
        }

        httpsAgentRequestFields['passphrase'] = interpolateString(clientCert.passphrase, interpolationOptions);
        break;
      }
    }
  }

  // proxy configuration
  let proxyConfig = get(brunoConfig, 'proxy', {});
  let proxyEnabled = get(proxyConfig, 'enabled', 'global');
  if (proxyEnabled === 'global') {
    proxyConfig = preferencesUtil.getGlobalProxyConfig();
    proxyEnabled = get(proxyConfig, 'enabled', false);
  }
  const shouldProxy = shouldUseProxy(request.url, get(proxyConfig, 'bypassProxy', ''));
  if (proxyEnabled === true && shouldProxy) {
    const proxyProtocol = interpolateString(get(proxyConfig, 'protocol'), interpolationOptions);
    const proxyHostname = interpolateString(get(proxyConfig, 'hostname'), interpolationOptions);
    const proxyPort = interpolateString(get(proxyConfig, 'port'), interpolationOptions);
    const proxyAuthEnabled = get(proxyConfig, 'auth.enabled', false);
    const socksEnabled = proxyProtocol.includes('socks');

    let uriPort = isUndefined(proxyPort) || isNull(proxyPort) ? '' : `:${proxyPort}`;
    let proxyUri;
    if (proxyAuthEnabled) {
      const proxyAuthUsername = interpolateString(get(proxyConfig, 'auth.username'), interpolationOptions);
      const proxyAuthPassword = interpolateString(get(proxyConfig, 'auth.password'), interpolationOptions);

      proxyUri = `${proxyProtocol}://${proxyAuthUsername}:${proxyAuthPassword}@${proxyHostname}${uriPort}`;
    } else {
      proxyUri = `${proxyProtocol}://${proxyHostname}${uriPort}`;
    }

    if (socksEnabled) {
      const socksProxyAgent = new SocksProxyAgent(proxyUri);
      request.httpsAgent = socksProxyAgent;
      request.httpAgent = socksProxyAgent;
    } else {
      request.httpsAgent = new PatchedHttpsProxyAgent(
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
    request.awsv4config = await resolveAwsV4Credentials(request);
    addAwsV4Interceptor(axiosInstance, request);
    delete request.awsv4config;
  }

  if (request.digestConfig) {
    addDigestInterceptor(axiosInstance, request);
  }

  request.timeout = preferencesUtil.getRequestTimeout();

  // add cookies to request
  if (preferencesUtil.shouldSendCookies()) {
    const cookieString = getCookieStringForUrl(request.url);
    if (cookieString && typeof cookieString === 'string' && cookieString.length) {
      request.headers['cookie'] = cookieString;
    }
  }

  return axiosInstance;
};

const parseDataFromResponse = (response) => {
  const dataBuffer = Buffer.from(response.data);
  // Parse the charset from content type: https://stackoverflow.com/a/33192813
  const charset = /charset=([^()<>@,;:"/[\]?.=\s]*)/i.exec(response.headers['Content-Type'] || '');
  // Overwrite the original data for backwards compatability
  let data = dataBuffer.toString(charset || 'utf-8');
  // Try to parse response to JSON, this can quietly fail
  try {
    data = JSON.parse(response.data);
  } catch {}

  return { data, dataBuffer };
};

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
    collectionVariables,
    processEnvVars,
    scriptingConfig
  ) => {
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
    let scriptResult;
    const requestScript = compact([get(collectionRoot, 'request.script.req'), get(request, 'script.req')]).join(os.EOL);
    if (requestScript?.length) {
      const scriptRuntime = new ScriptRuntime();
      scriptResult = await scriptRuntime.runRequestScript(
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
        envVariables: scriptResult.envVariables,
        collectionVariables: scriptResult.collectionVariables,
        requestUid,
        collectionUid
      });
    }

    // interpolate variables inside request
    interpolateVars(request, envVars, collectionVariables, processEnvVars);

    // if this is a graphql request, parse the variables, only after interpolation
    // https://github.com/usebruno/bruno/issues/884
    if (request.mode === 'graphql') {
      request.data.variables = JSON.parse(request.data.variables);
    }

    // stringify the request url encoded params
    if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
      request.data = qs.stringify(request.data);
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
    collectionVariables,
    processEnvVars,
    scriptingConfig
  ) => {
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
    let scriptResult;
    const responseScript = compact([get(collectionRoot, 'request.script.res'), get(request, 'script.res')]).join(
      os.EOL
    );
    if (responseScript?.length) {
      const scriptRuntime = new ScriptRuntime();
      scriptResult = await scriptRuntime.runResponseScript(
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
        envVariables: scriptResult.envVariables,
        collectionVariables: scriptResult.collectionVariables,
        requestUid,
        collectionUid
      });
    }
    return scriptResult;
  };

  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, item, collection, environment, collectionVariables) => {
    const collectionUid = collection.uid;
    const collectionPath = collection.pathname;
    const cancelTokenUid = uuid();
    const requestUid = uuid();

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
      const cancelToken = axios.CancelToken.source();
      request.cancelToken = cancelToken.token;
      saveCancelToken(cancelTokenUid, cancelToken);

      await runPreRequest(
        request,
        requestUid,
        envVars,
        collectionPath,
        collectionRoot,
        collectionUid,
        collectionVariables,
        processEnvVars,
        scriptingConfig
      );

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
        processEnvVars,
        collectionPath
      );

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

      const { data, dataBuffer } = parseDataFromResponse(response);
      response.data = data;

      response.responseTime = responseTime;

      // save cookies
      if (preferencesUtil.shouldStoreCookies()) {
        let setCookieHeaders = [];
        if (response.headers['set-cookie']) {
          setCookieHeaders = Array.isArray(response.headers['set-cookie'])
            ? response.headers['set-cookie']
            : [response.headers['set-cookie']];

          for (let setCookieHeader of setCookieHeaders) {
            if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
              addCookieToJar(setCookieHeader, request.url);
            }
          }
        }
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
        collectionVariables,
        processEnvVars,
        scriptingConfig
      );

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

      request.timeout = preferencesUtil.getRequestTimeout();

      if (!preferencesUtil.shouldVerifyTls()) {
        request.httpsAgent = new https.Agent({
          rejectUnauthorized: false
        });
      }

      const requestUid = uuid();
      const collectionPath = collection.pathname;
      const collectionUid = collection.uid;
      const collectionVariables = collection.collectionVariables;
      const processEnvVars = getProcessEnvVars(collectionUid);
      const brunoConfig = getBrunoConfig(collection.uid);
      const scriptingConfig = get(brunoConfig, 'scripts', {});

      await runPreRequest(
        request,
        requestUid,
        envVars,
        collectionPath,
        collectionRoot,
        collectionUid,
        collectionVariables,
        processEnvVars,
        scriptingConfig
      );

      interpolateVars(preparedRequest, envVars, collection.collectionVariables, processEnvVars);
      const axiosInstance = await configureRequest(
        collection.uid,
        preparedRequest,
        envVars,
        collection.collectionVariables,
        processEnvVars,
        collectionPath
      );
      const response = await axiosInstance(preparedRequest);

      await runPostResponse(
        request,
        response,
        requestUid,
        envVars,
        collectionPath,
        collectionRoot,
        collectionUid,
        collectionVariables,
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
    async (event, folder, collection, environment, collectionVariables, recursive) => {
      const collectionUid = collection.uid;
      const collectionPath = collection.pathname;
      const folderUid = folder ? folder.uid : null;
      const brunoConfig = getBrunoConfig(collectionUid);
      const scriptingConfig = get(brunoConfig, 'scripts', {});
      const collectionRoot = get(collection, 'root', {});

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

        let currentRequestIndex = 0;
        let nJumps = 0; // count the number of jumps to avoid infinite loops
        while (currentRequestIndex < folderRequests.length) {
          const item = folderRequests[currentRequestIndex];
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

          const _request = item.draft ? item.draft.request : item.request;
          const request = prepareRequest(_request, collectionRoot);
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
              collectionVariables,
              processEnvVars,
              scriptingConfig
            );

            if (preRequestScriptResult?.nextRequestName !== undefined) {
              nextRequestName = preRequestScriptResult.nextRequestName;
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

            const axiosInstance = await configureRequest(
              collectionUid,
              request,
              envVars,
              collectionVariables,
              processEnvVars,
              collectionPath
            );

            timeStart = Date.now();
            let response;
            try {
              /** @type {import('axios').AxiosResponse} */
              response = await axiosInstance(request);
              timeEnd = Date.now();

              const { data, dataBuffer } = parseDataFromResponse(response);
              response.data = data;

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'response-received',
                responseReceived: {
                  status: response.status,
                  statusText: response.statusText,
                  headers: Object.entries(response.headers),
                  duration: timeEnd - timeStart,
                  dataBuffer: dataBuffer.toString('base64'),
                  size: Buffer.byteLength(dataBuffer),
                  data: response.data
                },
                ...eventData
              });
            } catch (error) {
              if (error?.response) {
                const { data, dataBuffer } = parseDataFromResponse(error.response);
                error.response.data = data;

                timeEnd = Date.now();
                response = {
                  status: error.response.status,
                  statusText: error.response.statusText,
                  headers: Object.entries(error.response.headers),
                  duration: timeEnd - timeStart,
                  dataBuffer: dataBuffer.toString('base64'),
                  size: Buffer.byteLength(dataBuffer),
                  data: error.response.data
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
              collectionVariables,
              processEnvVars,
              scriptingConfig
            );

            if (postRequestScriptResult?.nextRequestName !== undefined) {
              nextRequestName = postRequestScriptResult.nextRequestName;
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
          } catch (error) {
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'error',
              error: error ? error.message : 'An error occurred while running the request',
              responseReceived: {},
              ...eventData
            });
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

  // save response to file
  ipcMain.handle('renderer:save-response-to-file', async (event, response, url) => {
    try {
      const getHeaderValue = (headerName) => {
        if (response.headers) {
          const header = response.headers.find((header) => header[0] === headerName);
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
        } catch (error) {}
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

      const fileName =
        getFileNameFromContentDispositionHeader() || getFileNameFromUrlPath() || getFileNameBasedOnContentTypeHeader();

      const filePath = await chooseFileToSave(mainWindow, fileName);
      if (filePath) {
        await writeBinaryFile(filePath, Buffer.from(response.dataBuffer, 'base64'));
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerNetworkIpc;
module.exports.configureRequest = configureRequest;
