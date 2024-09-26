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
const { shouldUseProxy, PatchedHttpsProxyAgent } = require('../utils/proxy-util');
const path = require('path');
const { createFormData } = require('../utils/common');
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
  runtime
) {
  try {
    let request;
    let nextRequestName;

    request = prepareRequest(bruJson.request, collectionRoot);

    request.__bruno__executionMode = 'cli';

    const scriptingConfig = get(brunoConfig, 'scripts', {});
    scriptingConfig.runtime = runtime;

    // run pre request script
    const requestScriptFile = compact([
      get(collectionRoot, 'request.script.req'),
      get(bruJson, 'request.script.req')
    ]).join(os.EOL);
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

    // set proxy if enabled
    const proxyEnabled = get(brunoConfig, 'proxy.enabled', false);
    const shouldProxy = shouldUseProxy(request.url, get(brunoConfig, 'proxy.bypassProxy', ''));
    if (proxyEnabled && shouldProxy) {
      const proxyProtocol = interpolateString(get(brunoConfig, 'proxy.protocol'), interpolationOptions);
      const proxyHostname = interpolateString(get(brunoConfig, 'proxy.hostname'), interpolationOptions);
      const proxyPort = interpolateString(get(brunoConfig, 'proxy.port'), interpolationOptions);
      const proxyAuthEnabled = get(brunoConfig, 'proxy.auth.enabled', false);
      const socksEnabled = proxyProtocol.includes('socks');

      let uriPort = isUndefined(proxyPort) || isNull(proxyPort) ? '' : `:${proxyPort}`;
      let proxyUri;
      if (proxyAuthEnabled) {
        const proxyAuthUsername = interpolateString(get(brunoConfig, 'proxy.auth.username'), interpolationOptions);
        const proxyAuthPassword = interpolateString(get(brunoConfig, 'proxy.auth.password'), interpolationOptions);

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
    } else if (Object.keys(httpsAgentRequestFields).length > 0) {
      request.httpsAgent = new https.Agent({
        ...httpsAgentRequestFields
      });
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

      // Prevents the duration on leaking to the actual result
      responseTime = response.headers.get('request-duration');
      response.headers.delete('request-duration');
    } catch (err) {
      if (err?.response) {
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
          error: err.message,
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
    const responseScriptFile = compact([
      get(collectionRoot, 'request.script.res'),
      get(bruJson, 'request.script.res')
    ]).join(os.EOL);
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
    const testFile = compact([get(collectionRoot, 'request.tests'), get(bruJson, 'request.tests')]).join(os.EOL);
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
