const { NodeVM } = require('vm2');
const chai = require('chai');
const path = require('path');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const BrunoResponse = require('../bruno-response');
const Test = require('../test');
const TestResults = require('../test-results');

// Inbuilt Library Support
const atob = require('atob');
const btoa = require('btoa');
const lodash = require('lodash');
const moment = require('moment');
const uuid = require('uuid');
const nanoid = require('nanoid');
const CryptoJS = require('crypto-js');

class TestRuntime {
  constructor() {}

  runTests(testsFile, request, response, envVariables, collectionVariables, collectionPath, onConsoleLog) {
    const bru = new Bru(envVariables, collectionVariables);
    const req = new BrunoRequest(request);
    const res = new BrunoResponse(response);

    const __brunoTestResults = new TestResults();
    const test = Test(__brunoTestResults, chai);

    if (!testsFile || !testsFile.length) {
      return {
        request,
        envVariables,
        collectionVariables,
        results: __brunoTestResults.getResults()
      };
    }

    const context = {
      test,
      bru,
      req,
      res,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults
    };

    if (onConsoleLog && typeof onConsoleLog === 'function') {
      const customLogger = (type) => {
        return (...args) => {
          onConsoleLog(type, args);
        };
      };
      context.console = {
        log: customLogger('log'),
        info: customLogger('info'),
        warn: customLogger('warn'),
        error: customLogger('error')
      };
    }

    const vm = new NodeVM({
      sandbox: context,
      require: {
        context: 'sandbox',
        external: true,
        root: [collectionPath],
        mock: {
          atob,
          btoa,
          lodash,
          moment,
          uuid,
          nanoid,
          'crypto-js': CryptoJS
        }
      }
    });

    vm.run(testsFile, path.join(collectionPath, 'vm.js'));

    return {
      request,
      envVariables,
      collectionVariables,
      results: __brunoTestResults.getResults()
    };
  }
}

module.exports = TestRuntime;
