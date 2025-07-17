const os = require('os');
const qs = require('qs');
const chalk = require('chalk');
const decomment = require('decomment');
const fs = require('fs');
const tls = require('tls');
const { forOwn, isUndefined, isNull, each, extend, get, compact } = require('lodash');
const FormData = require('form-data');
const prepareRequest = require('./prepare-request');
const interpolateVars = require('./interpolate-vars');
const { interpolateString } = require('./interpolate-string');
const { ScriptRuntime, TestRuntime, VarsRuntime, AssertRuntime } = require('@usebruno/js');
const { stripExtension } = require('../utils/filesystem');
const { getOptions } = require('../utils/bru');
const https = require('https');
const { HttpProxyAgent } = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { makeAxiosInstance } = require('../utils/axios-instance');
const { addAwsV4Interceptor, resolveAwsV4Credentials } = require('./awsv4auth-helper');
const { shouldUseProxy, PatchedHttpsProxyAgent, getSystemProxyEnvVariables } = require('../utils/proxy-util');
const path = require('path');
const { parseDataFromResponse } = require('../utils/common');
const { getCookieStringForUrl, saveCookies, shouldUseCookies } = require('../utils/cookies');
const { createFormData } = require('../utils/form-data');
const { getOAuth2Token } = require('./oauth2');
const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
const { NtlmClient } = require('axios-ntlm');
const { addDigestInterceptor } = require('@usebruno/requests');
const { encodeUrl } = require('@usebruno/requests').utils;

const onConsoleLog = (type, args) => {
  console[type](...args);
};

const runSingleRequest = async function (
  item,
  collectionPath,
  runtimeVariables,
  envVariables,
  processEnvVars,
  brunoConfig,
  collectionRoot,
  runtime,
  collection,
  runSingleRequestByPathname
) {
  const { pathname: itemPathname } = item;
  const relativeItemPathname = path.relative(collectionPath, itemPathname);

  const logResults = (results, title) => {
    if (results?.length) {
      if (title) {
        console.log(chalk.dim(title));
      }
      each(results, (r) => {
        const message = r.description || `${r.lhsExpr}: ${r.rhsExpr}`;
        if (r.status === 'pass') {
          console.log(chalk.green(`   ✓ `) + chalk.dim(message));
        } else {
          console.log(chalk.red(`   ✕ `) + chalk.red(message));
          if (r.error) {
            console.log(chalk.red(`      ${r.error}`));
          }
        }
      });
    }
  };

  try {
    let request;
    let nextRequestName;
    let shouldStopRunnerExecution = false;
    let preRequestTestResults = [];
    let postResponseTestResults = [];

    request = prepareRequest(item, collection);

    request.__bruno__executionMode = 'cli';

    const scriptingConfig = get(brunoConfig, 'scripts', {});
    scriptingConfig.runtime = runtime;

    // run pre request script
    const requestScriptFile = get(request, 'script.req');
    const collectionName = collection?.brunoConfig?.name
    if (requestScriptFile?.length) {
      const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
      const result = await scriptRuntime.runRequestScript(
        decomment(requestScriptFile),
        request,
        envVariables,
        runtimeVariables,
        collectionPath,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        runSingleRequestByPathname,
        collectionName
      );
      if (result?.nextRequestName !== undefined) {
        nextRequestName = result.nextRequestName;
      }

      if (result?.stopExecution) {
        shouldStopRunnerExecution = true;
      }

      if (result?.skipRequest) {
        return {
          test: {
            filename: relativeItemPathname
          },
          request: {
            method: request.method,
            url: request.url,
            headers: request.headers,
            data: request.data
          },
          response: {
            status: 'skipped',
            statusText: 'request skipped via pre-request script',
            data: null,
            responseTime: 0
          },
          error: null,
          status: 'skipped',
          skipped: true,
          assertionResults: [],
          testResults: [],
          preRequestTestResults: result?.results || [],
          postResponseTestResults: [],
          shouldStopRunnerExecution
        };
      }

      preRequestTestResults = result?.results || [];
    }

    // interpolate variables inside request
    interpolateVars(request, envVariables, runtimeVariables, processEnvVars);

    if (request.settings?.encodeUrl) {
      request.url = encodeUrl(request.url);
    }

    if (!protocolRegex.test(request.url)) {
      request.url = `http://${request.url}`;
    }

    const options = getOptions();
    const insecure = get(options, 'insecure', false);
    const noproxy = get(options, 'noproxy', false);
    const httpsAgentRequestFields = {};
    if (insecure) {
      httpsAgentRequestFields['rejectUnauthorized'] = false;
    } else {
      const caCertArray = [options['cacert'], process.env.SSL_CERT_FILE, process.env.NODE_EXTRA_CA_CERTS];
      const caCert = caCertArray.find((el) => el);
      if (caCert && caCert.length > 1) {
        try {
          let caCertBuffer = fs.readFileSync(caCert);
          if (!options['ignoreTruststore']) {
            caCertBuffer += '\n' + tls.rootCertificates.join('\n'); // Augment default truststore with custom CA certificates
          }
          httpsAgentRequestFields['ca'] = caCertBuffer;
        } catch (err) {
          console.log('Error reading CA cert file:' + caCert, err);
        }
      }
    }

    const interpolationOptions = {
      envVars: envVariables,
      runtimeVariables,
      processEnvVars
    };

    // client certificate config
    const clientCertConfig = get(brunoConfig, 'clientCertificates.certs', []);
    for (let clientCert of clientCertConfig) {
      const domain = interpolateString(clientCert?.domain, interpolationOptions);
      const type = clientCert?.type || 'cert';
      if (domain) {
        const hostRegex = '^https:\\/\\/' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
        if (request.url.match(hostRegex)) {
          if (type === 'cert') {
            try {
              let certFilePath = interpolateString(clientCert?.certFilePath, interpolationOptions);
              certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collectionPath, certFilePath);
              let keyFilePath = interpolateString(clientCert?.keyFilePath, interpolationOptions);
              keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collectionPath, keyFilePath);
              httpsAgentRequestFields['cert'] = fs.readFileSync(certFilePath);
              httpsAgentRequestFields['key'] = fs.readFileSync(keyFilePath);
            } catch (err) {
              console.log(chalk.red('Error reading cert/key file'), chalk.red(err?.message));
            }
          } else if (type === 'pfx') {
            try {
              let pfxFilePath = interpolateString(clientCert?.pfxFilePath, interpolationOptions);
              pfxFilePath = path.isAbsolute(pfxFilePath) ? pfxFilePath : path.join(collectionPath, pfxFilePath);
              httpsAgentRequestFields['pfx'] = fs.readFileSync(pfxFilePath);
            } catch (err) {
              console.log(chalk.red('Error reading pfx file'), chalk.red(err?.message));
            }
          }
          httpsAgentRequestFields['passphrase'] = interpolateString(clientCert.passphrase, interpolationOptions);
          break;
        }
      }
    }

    let proxyMode = 'off';
    let proxyConfig = {};

    const collectionProxyConfig = get(brunoConfig, 'proxy', {});
    const collectionProxyEnabled = get(collectionProxyConfig, 'enabled', false);
    
    if (noproxy) {
      // If noproxy flag is set, don't use any proxy
      proxyMode = 'off';
    } else if (collectionProxyEnabled === true) {
      // If collection proxy is enabled, use it
      proxyConfig = collectionProxyConfig;
      proxyMode = 'on';
    } else if (collectionProxyEnabled === 'global') {
      // If collection proxy is set to 'global', use system proxy
      const { http_proxy, https_proxy } = getSystemProxyEnvVariables();
      if (http_proxy?.length || https_proxy?.length) {
        proxyMode = 'system';
      }
    } else {
      proxyMode = 'off';
    }

    if (proxyMode === 'on') {
      const shouldProxy = shouldUseProxy(request.url, get(proxyConfig, 'bypassProxy', ''));
      if (shouldProxy) {
        const proxyProtocol = interpolateString(get(proxyConfig, 'protocol'), interpolationOptions);
        const proxyHostname = interpolateString(get(proxyConfig, 'hostname'), interpolationOptions);
        const proxyPort = interpolateString(get(proxyConfig, 'port'), interpolationOptions);
        const proxyAuthEnabled = get(proxyConfig, 'auth.enabled', false);
        const socksEnabled = proxyProtocol.includes('socks');
        let uriPort = isUndefined(proxyPort) || isNull(proxyPort) ? '' : `:${proxyPort}`;
        let proxyUri;
        if (proxyAuthEnabled) {
          const proxyAuthUsername = encodeURIComponent(interpolateString(get(proxyConfig, 'auth.username'), interpolationOptions));
          const proxyAuthPassword = encodeURIComponent(interpolateString(get(proxyConfig, 'auth.password'), interpolationOptions));

          proxyUri = `${proxyProtocol}://${proxyAuthUsername}:${proxyAuthPassword}@${proxyHostname}${uriPort}`;
        } else {
          proxyUri = `${proxyProtocol}://${proxyHostname}${uriPort}`;
        }
        if (socksEnabled) {
          request.httpsAgent = new SocksProxyAgent(
            proxyUri,
            Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
          );
          request.httpAgent = new SocksProxyAgent(proxyUri);
        } else {
          request.httpsAgent = new PatchedHttpsProxyAgent(
            proxyUri,
            Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
          );
          request.httpAgent = new HttpProxyAgent(proxyUri);
        }
      } else {
        request.httpsAgent = new https.Agent({
          ...httpsAgentRequestFields
        });
      }
    } else if (proxyMode === 'system') {
      const { http_proxy, https_proxy, no_proxy } = getSystemProxyEnvVariables();
      const shouldUseSystemProxy = shouldUseProxy(request.url, no_proxy || '');
      if (shouldUseSystemProxy) {
        try {
          if (http_proxy?.length) {
            new URL(http_proxy);
            request.httpAgent = new HttpProxyAgent(http_proxy);
          }
        } catch (error) {
          throw new Error('Invalid system http_proxy');
        }
        try {
          if (https_proxy?.length) {
            new URL(https_proxy);
            request.httpsAgent = new PatchedHttpsProxyAgent(
              https_proxy,
              Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
            );
          }
        } catch (error) {
          throw new Error('Invalid system https_proxy');
        }
      } else {
        request.httpsAgent = new https.Agent({
          ...httpsAgentRequestFields
        });
      }
    } else if (Object.keys(httpsAgentRequestFields).length > 0) {
      request.httpsAgent = new https.Agent({
        ...httpsAgentRequestFields
      });
    }

    //set cookies if enabled
    if (!options.disableCookies) {
      const cookieString = getCookieStringForUrl(request.url);
      if (cookieString && typeof cookieString === 'string' && cookieString.length) {
        const existingCookieHeaderName = Object.keys(request.headers).find(
            name => name.toLowerCase() === 'cookie'
        );
        const existingCookieString = existingCookieHeaderName ? request.headers[existingCookieHeaderName] : '';
    
        // Helper function to parse cookies into an object
        const parseCookies = (str) => str.split(';').reduce((cookies, cookie) => {
            const [name, ...rest] = cookie.split('=');
            if (name && name.trim()) {
                cookies[name.trim()] = rest.join('=').trim();
            }
            return cookies;
        }, {});
    
        const mergedCookies = {
            ...parseCookies(existingCookieString),
            ...parseCookies(cookieString),
        };
    
        const combinedCookieString = Object.entries(mergedCookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    
        request.headers[existingCookieHeaderName || 'Cookie'] = combinedCookieString;
      }
    }

    // stringify the request url encoded params
    const contentTypeHeader = Object.keys(request.headers).find(
      name => name.toLowerCase() === 'content-type'
    );
    if (contentTypeHeader && request.headers[contentTypeHeader] === 'application/x-www-form-urlencoded') {
      request.data = qs.stringify(request.data, { arrayFormat: 'repeat' });
    }

    if (contentTypeHeader && request.headers[contentTypeHeader] === 'multipart/form-data') {
      if (!(request?.data instanceof FormData)) {
        let form = createFormData(request.data, collectionPath);
        request.data = form;
        extend(request.headers, form.getHeaders());
      }
    }

    let requestMaxRedirects = request.maxRedirects
    request.maxRedirects = 0
    
    // Set default value for requestMaxRedirects if not explicitly set
    if (requestMaxRedirects === undefined) {
      requestMaxRedirects = 5; // Default to 5 redirects
    }

    // Handle OAuth2 authentication
    if (request.oauth2) {
      try {
        const token = await getOAuth2Token(request.oauth2);
        if (token) {
          const { tokenPlacement = 'header', tokenHeaderPrefix = '', tokenQueryKey = 'access_token' } = request.oauth2;
          
          if (tokenPlacement === 'header' && token) {
            request.headers['Authorization'] = `${tokenHeaderPrefix} ${token}`.trim();
          } else if (tokenPlacement === 'url') {
            try {
              const url = new URL(request.url);
              url.searchParams.set(tokenQueryKey, token);
              request.url = url.toString();
            } catch (error) {
              console.error('Error applying OAuth2 token to URL:', error.message);
            }
          }
        }
      } catch (error) {
        console.error('OAuth2 token fetch error:', error.message);
      }
      
      // Remove oauth2 config from request to prevent it from being sent
      delete request.oauth2;
    }

    let response, responseTime;
    try {
      
      let axiosInstance = makeAxiosInstance({ requestMaxRedirects: requestMaxRedirects, disableCookies: options.disableCookies });
      if (request.ntlmConfig) {
        axiosInstance=NtlmClient(request.ntlmConfig,axiosInstance.defaults)
        delete request.ntlmConfig;
      }
    

      if (request.awsv4config) {
        // todo: make this happen in prepare-request.js
        // interpolate the aws v4 config
        request.awsv4config.accessKeyId = interpolateString(request.awsv4config.accessKeyId, interpolationOptions);
        request.awsv4config.secretAccessKey = interpolateString(
          request.awsv4config.secretAccessKey,
          interpolationOptions
        );
        request.awsv4config.sessionToken = interpolateString(request.awsv4config.sessionToken, interpolationOptions);
        request.awsv4config.service = interpolateString(request.awsv4config.service, interpolationOptions);
        request.awsv4config.region = interpolateString(request.awsv4config.region, interpolationOptions);
        request.awsv4config.profileName = interpolateString(request.awsv4config.profileName, interpolationOptions);

        request.awsv4config = await resolveAwsV4Credentials(request);
        addAwsV4Interceptor(axiosInstance, request);
        delete request.awsv4config;
      }

      if (request.digestConfig) {
        addDigestInterceptor(axiosInstance, request);
        delete request.digestConfig;
      }

      /** @type {import('axios').AxiosResponse} */
      response = await axiosInstance(request);

      const { data, dataBuffer } = parseDataFromResponse(response, request.__brunoDisableParsingResponseJson);
      response.data = data;
      response.dataBuffer = dataBuffer;

      // Prevents the duration on leaking to the actual result
      responseTime = response.headers.get('request-duration');
      response.headers.delete('request-duration');

      //save cookies if enabled
      if (!options.disableCookies) {
        saveCookies(request.url, response.headers);
      }
    } catch (err) {
      if (err?.response) {
        const { data, dataBuffer } = parseDataFromResponse(err?.response);
        err.response.data = data;
        err.response.dataBuffer = dataBuffer;
        response = err.response;

        // Prevents the duration on leaking to the actual result
        responseTime = response.headers.get('request-duration');
        response.headers.delete('request-duration');
      } else {
        console.log(chalk.red(stripExtension(relativeItemPathname)) + chalk.dim(` (${err.message})`));
        return {
          test: {
            filename: relativeItemPathname
          },
          request: {
            method: request.method,
            url: request.url,
            headers: request.headers,
            data: request.data
          },
          response: {
            status: 'error',
            statusText: null,
            headers: null,
            data: null,
            responseTime: 0
          },
          error: err?.message || err?.errors?.map(e => e?.message)?.at(0) || err?.code || 'Request Failed!',
          status: 'error',
          assertionResults: [],
          testResults: [],
          preRequestTestResults,
          postResponseTestResults,
          nextRequestName: nextRequestName,
          shouldStopRunnerExecution
        };
      }
    }

    response.responseTime = responseTime;

    console.log(
      chalk.green(stripExtension(relativeItemPathname)) +
      chalk.dim(` (${response.status} ${response.statusText}) - ${responseTime} ms`)
    );

    // Log pre-request test results
    logResults(preRequestTestResults, 'Pre-Request Tests');

    // run post-response vars
    const postResponseVars = get(item, 'request.vars.res');
    if (postResponseVars?.length) {
      const varsRuntime = new VarsRuntime({ runtime: scriptingConfig?.runtime });
      varsRuntime.runPostResponseVars(
        postResponseVars,
        request,
        response,
        envVariables,
        runtimeVariables,
        collectionPath,
        processEnvVars
      );
    }

    // run post response script
    const responseScriptFile = get(request, 'script.res');
    if (responseScriptFile?.length) {
      const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
      try {
        const result = await scriptRuntime.runResponseScript(
          decomment(responseScriptFile),
          request,
          response,
          envVariables,
          runtimeVariables,
          collectionPath,
          null,
          processEnvVars,
          scriptingConfig,
          runSingleRequestByPathname,
          collectionName
        );
        if (result?.nextRequestName !== undefined) {
          nextRequestName = result.nextRequestName;
        }

        if (result?.stopExecution) {
          shouldStopRunnerExecution = true;
        }

        postResponseTestResults = result?.results || [];
        logResults(postResponseTestResults, 'Post-Response Tests');
      } catch (error) {
        console.error('Post-response script execution error:', error);
      }
    }

    let assertionResults = [];
    const assertions = get(item, 'request.assertions');
    if (assertions) {
      const assertRuntime = new AssertRuntime({ runtime: scriptingConfig?.runtime });
      assertionResults = assertRuntime.runAssertions(
        assertions,
        request,
        response,
        envVariables,
        runtimeVariables,
        processEnvVars
      );
    }

    // run tests
    let testResults = [];
    const testFile = get(request, 'tests');
    if (typeof testFile === 'string') {
      const testRuntime = new TestRuntime({ runtime: scriptingConfig?.runtime });
      try {
        const result = await testRuntime.runTests(
          decomment(testFile),
          request,
          response,
          envVariables,
          runtimeVariables,
          collectionPath,
          null,
          processEnvVars,
          scriptingConfig,
          runSingleRequestByPathname,
          collectionName
        );
        testResults = get(result, 'results', []);

        if (result?.nextRequestName !== undefined) {
          nextRequestName = result.nextRequestName;
        }

        if (result?.stopExecution) {
          shouldStopRunnerExecution = true;
        }

        logResults(testResults, 'Tests');
      } catch (error) {
        console.error('Test script execution error:', error);
      }
    }


    logResults(assertionResults, 'Assertions');

    return {
      test: {
        filename: relativeItemPathname
      },
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        data: request.data
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        responseTime
      },
      error: null,
      status: 'pass',
      assertionResults,
      testResults,
      preRequestTestResults,
      postResponseTestResults,
      nextRequestName: nextRequestName,
      shouldStopRunnerExecution
    };
  } catch (err) {
    console.log(chalk.red(stripExtension(relativeItemPathname)) + chalk.dim(` (${err.message})`));
    return {
      test: {
        filename: relativeItemPathname
      },
      request: {
        method: null,
        url: null,
        headers: null,
        data: null
      },
      response: {
        status: 'error',
        statusText: null,
        headers: null,
        data: null,
        responseTime: 0
      },
      status: 'error',
      error: err.message,
      assertionResults: [],
      testResults: [],
      preRequestTestResults: [],
      postResponseTestResults: []
    };
  }
};

module.exports = {
  runSingleRequest
};
