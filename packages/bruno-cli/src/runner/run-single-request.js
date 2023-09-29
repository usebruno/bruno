const qs = require('qs');
const chalk = require('chalk');
const fs = require('fs');
const { forOwn, each, extend, get } = require('lodash');
const FormData = require('form-data');
const axios = require('axios');
const https = require('https');
const prepareRequest = require('./prepare-request');
const interpolateVars = require('./interpolate-vars');
const { ScriptRuntime, TestRuntime, VarsRuntime, AssertRuntime } = require('@usebruno/js');
const { stripExtension } = require('../utils/filesystem');
const { getOptions } = require('../utils/bru');

const runSingleRequest = async function (
  filename,
  bruJson,
  collectionPath,
  collectionVariables,
  envVariables,
  processEnvVars,
  brunoConfig
) {
  let request;

  try {
    request = prepareRequest(bruJson.request);

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
    const requestScriptFile = get(bruJson, 'request.script.req');
    if (requestScriptFile && requestScriptFile.length) {
      const scriptRuntime = new ScriptRuntime();
      await scriptRuntime.runRequestScript(
        requestScriptFile,
        request,
        envVariables,
        collectionVariables,
        collectionPath,
        null,
        processEnvVars
      );
    }

    // set proxy if enabled
    const proxyEnabled = get(brunoConfig, 'proxy.enabled', false);
    if (proxyEnabled) {
      const proxyProtocol = get(brunoConfig, 'proxy.protocol');
      const proxyHostname = get(brunoConfig, 'proxy.hostname');
      const proxyPort = get(brunoConfig, 'proxy.port');
      const proxyAuthEnabled = get(brunoConfig, 'proxy.auth.enabled', false);

      const proxyConfig = {
        protocol: proxyProtocol,
        hostname: proxyHostname,
        port: proxyPort
      };
      if (proxyAuthEnabled) {
        const proxyAuthUsername = get(brunoConfig, 'proxy.auth.username');
        const proxyAuthPassword = get(brunoConfig, 'proxy.auth.password');
        proxyConfig.auth = {
          username: proxyAuthUsername,
          password: proxyAuthPassword
        };
      }

      request.proxy = proxyConfig;
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

    if (Object.keys(httpsAgentRequestFields).length > 0) {
      request.httpsAgent = new https.Agent({
        ...httpsAgentRequestFields
      });
    }

    // stringify the request url encoded params
    if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
      request.data = qs.stringify(request.data);
    }

    // run request
    const response = await axios(request);

    console.log(chalk.green(stripExtension(filename)) + chalk.dim(` (${response.status} ${response.statusText})`));

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
    const responseScriptFile = get(bruJson, 'request.script.res');
    if (responseScriptFile && responseScriptFile.length) {
      const scriptRuntime = new ScriptRuntime();
      await scriptRuntime.runResponseScript(
        responseScriptFile,
        request,
        response,
        envVariables,
        collectionVariables,
        collectionPath,
        null,
        processEnvVars
      );
    }

    // run assertions
    let assertionResults = [];
    const assertions = get(bruJson, 'request.assertions');
    if (assertions && assertions.length) {
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
    const testFile = get(bruJson, 'request.tests');
    if (testFile && testFile.length) {
      const testRuntime = new TestRuntime();
      const result = await testRuntime.runTests(
        testFile,
        request,
        response,
        envVariables,
        collectionVariables,
        collectionPath,
        null,
        processEnvVars
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
        data: response.data
      },
      assertionResults,
      testResults
    };
  } catch (err) {
    if (err && err.response) {
      console.log(
        chalk.green(stripExtension(filename)) + chalk.dim(` (${err.response.status} ${err.response.statusText})`)
      );

      // run post-response vars
      const postResponseVars = get(bruJson, 'request.vars.res');
      if (postResponseVars && postResponseVars.length) {
        const varsRuntime = new VarsRuntime();
        varsRuntime.runPostResponseVars(
          postResponseVars,
          request,
          err.response,
          envVariables,
          collectionVariables,
          collectionPath,
          processEnvVars
        );
      }

      // run post response script
      const responseScriptFile = get(bruJson, 'request.script.res');
      if (responseScriptFile && responseScriptFile.length) {
        const scriptRuntime = new ScriptRuntime();
        await scriptRuntime.runResponseScript(
          responseScriptFile,
          request,
          err.response,
          envVariables,
          collectionVariables,
          collectionPath,
          null,
          processEnvVars
        );
      }

      // run assertions
      let assertionResults = [];
      const assertions = get(bruJson, 'request.assertions');
      if (assertions && assertions.length) {
        const assertRuntime = new AssertRuntime();
        assertionResults = assertRuntime.runAssertions(
          assertions,
          request,
          err.response,
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
      const testFile = get(bruJson, 'request.tests');
      if (testFile && testFile.length) {
        const testRuntime = new TestRuntime();
        const result = await testRuntime.runTests(
          testFile,
          request,
          err.response,
          envVariables,
          collectionVariables,
          collectionPath,
          null,
          processEnvVars
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
    } else {
      console.log(chalk.red(stripExtension(filename)) + chalk.dim(` (${err.message})`));
    }
  }
};

module.exports = {
  runSingleRequest
};
