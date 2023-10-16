const os = require('os');
const qs = require('qs');
const chalk = require('chalk');
const decomment = require('decomment');
const fs = require('fs');
const { forOwn, each, extend, get, compact } = require('lodash');
const FormData = require('form-data');
const prepareRequest = require('./prepare-request');
const interpolateVars = require('./interpolate-vars');
const { interpolateString } = require('./interpolate-string');
const { ScriptRuntime, TestRuntime, VarsRuntime, AssertRuntime } = require('@usebruno/js');
const { stripExtension } = require('../utils/filesystem');
const { getOptions } = require('../utils/bru');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { makeAxiosInstance } = require('../utils/axios-instance');

const runSingleRequest = async function (
  filename,
  bruJson,
  collectionPath,
  collectionVariables,
  envVariables,
  processEnvVars,
  brunoConfig,
  collectionRoot
) {
  try {
    let request;
    let nextRequestName;

    request = prepareRequest(bruJson.request, collectionRoot);

    const scriptingConfig = get(brunoConfig, 'scripts', {});

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
    const preRequestVars = get(bruJson, 'request.vars.req');
    if (preRequestVars && preRequestVars.length) {
      const varsRuntime = new VarsRuntime();
      varsRuntime.runPreRequestVars(
        preRequestVars,
        request,
        envVariables,
        collectionVariables,
        collectionPath,
        processEnvVars
      );
    }

    // run pre request script
    const requestScriptFile = compact([
      get(collectionRoot, 'request.script.req'),
      get(bruJson, 'request.script.req')
    ]).join(os.EOL);
    if (requestScriptFile && requestScriptFile.length) {
      const scriptRuntime = new ScriptRuntime();
      const result = await scriptRuntime.runRequestScript(
        decomment(requestScriptFile),
        request,
        envVariables,
        collectionVariables,
        collectionPath,
        null,
        processEnvVars,
        scriptingConfig
      );
      if (result?.nextRequestName) {
        nextRequestName = result.nextRequestName;
      }
    }

    // interpolate variables inside request
    interpolateVars(request, envVariables, collectionVariables, processEnvVars);

    const options = getOptions();
    const insecure = get(options, 'insecure', false);
    const httpsAgentRequestFields = {};
    if (insecure) {
      httpsAgentRequestFields['rejectUnauthorized'] = false;
    } else {
      const cacertArray = [options['cacert'], process.env.SSL_CERT_FILE, process.env.NODE_EXTRA_CA_CERTS];
      const cacert = cacertArray.find((el) => el);
      if (cacert && cacert.length > 1) {
        try {
          caCrt = fs.readFileSync(cacert);
          httpsAgentRequestFields['ca'] = caCrt;
        } catch (err) {
          console.log('Error reading CA cert file:' + cacert, err);
        }
      }
    }

    // set proxy if enabled
    const proxyEnabled = get(brunoConfig, 'proxy.enabled', false);
    if (proxyEnabled) {
      let proxyUri;
      const interpolationOptions = {
        envVars: envVariables,
        collectionVariables,
        processEnvVars
      };

      const proxyProtocol = interpolateString(get(brunoConfig, 'proxy.protocol'), interpolationOptions);
      const proxyHostname = interpolateString(get(brunoConfig, 'proxy.hostname'), interpolationOptions);
      const proxyPort = interpolateString(get(brunoConfig, 'proxy.port'), interpolationOptions);
      const proxyAuthEnabled = get(brunoConfig, 'proxy.auth.enabled', false);
      const socksEnabled = proxyProtocol.includes('socks');

      interpolateString;

      if (proxyAuthEnabled) {
        const proxyAuthUsername = interpolateString(get(brunoConfig, 'proxy.auth.username'), interpolationOptions);
        const proxyAuthPassword = interpolateString(get(brunoConfig, 'proxy.auth.password'), interpolationOptions);

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

    // stringify the request url encoded params
    if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
      request.data = qs.stringify(request.data);
    }

    let response, responseTime;
    try {
      // run request
      const axiosInstance = makeAxiosInstance();

      /** @type {import('axios').AxiosResponse} */
      response = await axiosInstance(request);

      // Prevents the duration on leaking to the actual result
      responseTime = response.headers.get('request-duration');
      response.headers.delete('request-duration');
    } catch (err) {
      if (err && err.response) {
        response = err.response;

        // Prevents the duration on leaking to the actual result
        responseTime = response.headers.get('request-duration');
        response.headers.delete('request-duration');
      } else {
        console.log(chalk.red(stripExtension(filename)) + chalk.dim(` (${err.message})`));
        return {
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

    console.log(
      chalk.green(stripExtension(filename)) +
        chalk.dim(` (${response.status} ${response.statusText}) - ${responseTime} ms`)
    );

    // run post-response vars
    const postResponseVars = get(bruJson, 'request.vars.res');
    if (postResponseVars && postResponseVars.length) {
      const varsRuntime = new VarsRuntime();
      varsRuntime.runPostResponseVars(
        postResponseVars,
        request,
        response,
        envVariables,
        collectionVariables,
        collectionPath,
        processEnvVars
      );
    }

    // run post response script
    const responseScriptFile = compact([
      get(collectionRoot, 'request.script.res'),
      get(bruJson, 'request.script.res')
    ]).join(os.EOL);
    if (responseScriptFile && responseScriptFile.length) {
      const scriptRuntime = new ScriptRuntime();
      const result = await scriptRuntime.runResponseScript(
        decomment(responseScriptFile),
        request,
        response,
        envVariables,
        collectionVariables,
        collectionPath,
        null,
        processEnvVars,
        scriptingConfig
      );
      if (result?.nextRequestName) {
        nextRequestName = result.nextRequestName;
      }
    }

    // run assertions
    let assertionResults = [];
    const assertions = get(bruJson, 'request.assertions');
    if (assertions) {
      const assertRuntime = new AssertRuntime();
      assertionResults = assertRuntime.runAssertions(
        assertions,
        request,
        response,
        envVariables,
        collectionVariables,
        collectionPath
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
      const testRuntime = new TestRuntime();
      const result = await testRuntime.runTests(
        decomment(testFile),
        request,
        response,
        envVariables,
        collectionVariables,
        collectionPath,
        null,
        processEnvVars,
        scriptingConfig
      );
      testResults = get(result, 'results', []);
    }

    if (testResults && testResults.length) {
      each(testResults, (testResult) => {
        if (testResult.status === 'pass') {
          console.log(chalk.green(`   ✓ `) + chalk.dim(testResult.description));
        } else {
          console.log(chalk.red(`   ✕ `) + chalk.red(testResult.description));
        }
      });
    }

    return {
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
