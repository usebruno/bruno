const fs = require('fs');
const chalk = require('chalk');
const { forOwn, each, extend, get } = require('lodash');
const FormData = require('form-data');
const axios = require('axios');
const prepareRequest = require('./prepare-request');
const interpolateVars = require('./interpolate-vars');
const { ScriptRuntime, TestRuntime, VarsRuntime } = require('@usebruno/js');
const { bruToJson } = require('../utils/bru');
const { stripExtension } = require('../utils/filesystem');

const runSingleRequest = async function (filename, collectionPath, collectionVariables, envVariables) {
  try {
    const bruContent = fs.readFileSync(filename, 'utf8');

    const bruJson = bruToJson(bruContent);
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

    // run request
    const response = await axios(request);

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
      scriptRuntime.runResponseScript(responseScriptFile, response, envVariables, collectionVariables, collectionPath);
    }

    // run tests
    let testResults = [];
    const testFile = get(bruJson, 'request.tests');
    if(testFile && testFile.length) {
      const testRuntime = new TestRuntime();
      const result = testRuntime.runTests(testFile, request, response, envVariables, collectionVariables, collectionPath);
      testResults = get(result, 'results', []);
    }

    console.log(chalk.green(stripExtension(filename)) + chalk.dim(` (${response.status} ${response.statusText})`));
    if(testResults && testResults.length) {
      each(testResults, (testResult) => {
        if(testResult.status === 'pass') {
          console.log(chalk.green(`   ✓ `) + chalk.dim(testResult.description));
        } else {
          console.log(chalk.red(`   ✕ `) + chalk.red(testResult.description));
        }
      });
    }
  } catch (err) {
    console.log(chalk.red(stripExtension(filename)) + chalk.dim(` (${err.message})`));
  }
};

module.exports = {
  runSingleRequest
};
