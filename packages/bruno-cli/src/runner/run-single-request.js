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
const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;

const onConsoleLog = (type, args) => {
  console[type](...args);
};

const runSingleRequest = async function (
  filename,
  bruJson,
  collectionPath,
  runtimeVariables,
  envVariables,
  processEnvVars,
  brunoConfig,
  collectionRoot,
  runtime,
  collection
) {
  try {
    let request;
    let nextRequestName;
    let item = {
      pathname: path.join(collectionPath, filename),
      ...bruJson
    }
    request = prepareRequest(item, collection);

    request.__bruno__executionMode = 'cli';

    const scriptingConfig = get(brunoConfig, 'scripts', {});
    scriptingConfig.runtime = runtime;

    // run pre request script
    const requestScriptFile = get(request, 'script.req');
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
        scriptingConfig
      );
      if (result?.nextRequestName !== undefined) {
        nextRequestName = result.nextRequestName;
      }
    }

    // interpolate variables inside request
    interpolateVars(request, envVariables, runtimeVariables, processEnvVars);

    if (!protocolRegex.test(request.url)) {
      request.url = `http://${request.url}`;
    }

    const options = getOptions();
    const insecure = get(options, 'insecure', false);
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
    if (collectionProxyEnabled === true) {
      proxyConfig = collectionProxyConfig;
      proxyMode = 'on';
    } else {
      // if the collection level proxy is not set, pick the system level proxy by default, to maintain backward compatibility
      const { http_proxy, https_proxy } = getSystemProxyEnvVariables();
      if (http_proxy?.length || https_proxy?.length) {
        proxyMode = 'system';
      }
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
          const proxyAuthUsername = interpolateString(get(proxyConfig, 'auth.username'), interpolationOptions);
          const proxyAuthPassword = interpolateString(get(proxyConfig, 'auth.password'), interpolationOptions);

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
        request.headers['cookie'] = cookieString;
      }
    }

    // stringify the request url encoded params
    if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
      request.data = qs.stringify(request.data);
    }

    if (request?.headers?.['content-type'] === 'multipart/form-data') {
      if (!(request?.data instanceof FormData)) {
        let form = createFormData(request.data, collectionPath);
        request.data = form;
        extend(request.headers, form.getHeaders());
      }
    }

    let response, responseTime;
    try {
      // run request
      const axiosInstance = makeAxiosInstance();

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

      /** @type {import('axios').AxiosResponse} */
      response = await axiosInstance(request);

      const { data } = parseDataFromResponse(response, request.__brunoDisableParsingResponseJson);
      response.data = data;

      // Prevents the duration on leaking to the actual result
      responseTime = response.headers.get('request-duration');
      response.headers.delete('request-duration');

      //save cookies if enabled
      if (!options.disableCookies) {
        saveCookies(request.url, response.headers);
      }
    } catch (err) {
      if (err?.response) {
        const { data } = parseDataFromResponse(err?.response);
        err.response.data = data;
        response = err.response;

        // Prevents the duration on leaking to the actual result
        responseTime = response.headers.get('request-duration');
        response.headers.delete('request-duration');
      } else {
        console.log(chalk.red(stripExtension(filename)) + chalk.dim(` (${err.message})`));
        return {
          test: {
            filename: filename
          },
          request: {
            method: request.method,
            url: request.url,
            headers: request.headers,
            data: request.data
          },
          response: {
            status: null,
            statusText: null,
            headers: null,
            data: null,
            responseTime: 0
          },
          error: err?.message || err?.errors?.map(e => e?.message)?.at(0) || err?.code || 'Request Failed!',
          assertionResults: [],
          testResults: [],
          nextRequestName: nextRequestName
        };
      }
    }

    response.responseTime = responseTime;

    console.log(
      chalk.green(stripExtension(filename)) +
      chalk.dim(` (${response.status} ${response.statusText}) - ${responseTime} ms`)
    );

    // run post-response vars
    const postResponseVars = get(bruJson, 'request.vars.res');
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
      const result = await scriptRuntime.runResponseScript(
        decomment(responseScriptFile),
        request,
        response,
        envVariables,
        runtimeVariables,
        collectionPath,
        null,
        processEnvVars,
        scriptingConfig
      );
      if (result?.nextRequestName !== undefined) {
        nextRequestName = result.nextRequestName;
      }
    }

    // run assertions
    let assertionResults = [];
    const assertions = get(bruJson, 'request.assertions');
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

      each(assertionResults, (r) => {
        if (r.status === 'pass') {
          console.log(chalk.green(`   ✓ `) + chalk.dim(`assert: ${r.lhsExpr}: ${r.rhsExpr}`));
        } else {
          console.log(chalk.red(`   ✕ `) + chalk.red(`assert: ${r.lhsExpr}: ${r.rhsExpr}`));
          console.log(chalk.red(`      ${r.error}`));
        }
      });
    }

    // run tests
    let testResults = [];
    const testFile = get(request, 'tests');
    if (typeof testFile === 'string') {
      const testRuntime = new TestRuntime({ runtime: scriptingConfig?.runtime });
      const result = await testRuntime.runTests(
        decomment(testFile),
        request,
        response,
        envVariables,
        runtimeVariables,
        collectionPath,
        null,
        processEnvVars,
        scriptingConfig
      );
      testResults = get(result, 'results', []);

      if (result?.nextRequestName !== undefined) {
        nextRequestName = result.nextRequestName;
      }
    }

    if (testResults?.length) {
      each(testResults, (testResult) => {
        if (testResult.status === 'pass') {
          console.log(chalk.green(`   ✓ `) + chalk.dim(testResult.description));
        } else {
          console.log(chalk.red(`   ✕ `) + chalk.red(testResult.description));
        }
      });
    }

    return {
      test: {
        filename: filename
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
      assertionResults,
      testResults,
      nextRequestName: nextRequestName
    };
  } catch (err) {
    console.log(chalk.red(stripExtension(filename)) + chalk.dim(` (${err.message})`));
    return {
      test: {
        filename: filename
      },
      request: {
        method: null,
        url: null,
        headers: null,
        data: null
      },
      response: {
        status: null,
        statusText: null,
        headers: null,
        data: null,
        responseTime: 0
      },
      error: err.message,
      assertionResults: [],
      testResults: []
    };
  }
};

module.exports = {
  runSingleRequest
};
