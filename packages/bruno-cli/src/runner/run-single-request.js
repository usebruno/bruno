const qs = require('qs');
const chalk = require('chalk');
const { forOwn, each, extend, get } = require('lodash');
const FormData = require('form-data');
const axios = require('axios');
const prepareRequest = require('./prepare-request');
const interpolateVars = require('./interpolate-vars');
const { ScriptRuntime, TestRuntime, VarsRuntime, AssertRuntime } = require('@usebruno/js');
const { stripExtension } = require('../utils/filesystem');

const runSingleRequest = async function (filename, bruJson, collectionPath, collectionVariables, envVariables) {
  try {
    const request = prepareRequest(bruJson.request);

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
    const preRequestVars = get(bruJson, 'request.vars.req');
    if(preRequestVars && preRequestVars.length) {
      const varsRuntime = new VarsRuntime();
      varsRuntime.runPreRequestVars(preRequestVars, request, envVariables, collectionVariables, collectionPath);
    }

    // run pre request script
    const requestScriptFile = get(bruJson, 'request.script.req');
    if(requestScriptFile && requestScriptFile.length) {
      const scriptRuntime = new ScriptRuntime();
      scriptRuntime.runRequestScript(requestScriptFile, request, envVariables, collectionVariables, collectionPath);
    }

    // interpolate variables inside request
    interpolateVars(request, envVariables, collectionVariables);

    // stringify the request url encoded params
    if(request.headers['content-type'] === 'application/x-www-form-urlencoded') {
      request.data = qs.stringify(request.data);
    }

    if((collectionVariables.certificateValidation && collectionVariables.certificateValidation == 'false') 
        || (!collectionVariables.certificateValidation && envVariables.certificateValidation && envVariables.certificateValidation == 'false')) {
      const https = require('https');
      request.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    // run request
    const response = await axios(request);

    console.log(chalk.green(stripExtension(filename)) + chalk.dim(` (${response.status} ${response.statusText})`));

    // run post-response vars
    const postResponseVars = get(bruJson, 'request.vars.res');
    if(postResponseVars && postResponseVars.length) {
      const varsRuntime = new VarsRuntime();
      varsRuntime.runPostResponseVars(postResponseVars, request, response, envVariables, collectionVariables, collectionPath);
    }

    // run post response script
    const responseScriptFile = get(bruJson, 'request.script.res');
    if(responseScriptFile && responseScriptFile.length) {
      const scriptRuntime = new ScriptRuntime();
      scriptRuntime.runResponseScript(responseScriptFile, request, response, envVariables, collectionVariables, collectionPath);
    }

    // run assertions
    let assertionResults = [];
    const assertions = get(bruJson, 'request.assertions');
    if(assertions && assertions.length) {
      const assertRuntime = new AssertRuntime();
      assertionResults = assertRuntime.runAssertions(assertions, request, response, envVariables, collectionVariables, collectionPath);

      each(assertionResults, (r) => {
        if(r.status === 'pass') {
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
    if(testFile && testFile.length) {
      const testRuntime = new TestRuntime();
      const result = testRuntime.runTests(testFile, request, response, envVariables, collectionVariables, collectionPath);
      testResults = get(result, 'results', []);
    }

    if(testResults && testResults.length) {
      each(testResults, (testResult) => {
        if(testResult.status === 'pass') {
          console.log(chalk.green(`   ✓ `) + chalk.dim(testResult.description));
        } else {
          console.log(chalk.red(`   ✕ `) + chalk.red(testResult.description));
        }
      });
    }

    return {
      assertionResults,
      testResults
    };
  } catch (err) {
    console.log(chalk.red(stripExtension(filename)) + chalk.dim(` (${err.message})`));
  }
};

module.exports = {
  runSingleRequest
};
