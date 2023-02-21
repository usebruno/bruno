const { NodeVM } = require('vm2');
const path = require('path');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const BrunoResponse = require('../bruno-response');

// Inbuilt Library Support
const atob = require('atob');
const btoa = require('btoa');
const lodash = require('lodash');
const moment = require('moment');
const uuid = require('uuid');
const nanoid = require('nanoid');
const CryptoJS = require('crypto-js');

class ScriptRuntime {
  constructor() {
  }

  runRequestScript(script, request, envVariables, collectionVariables, collectionPath) {
    const bru = new Bru(envVariables, collectionVariables);
    const req = new BrunoRequest(request);

    const context = {
      bru,
      req
    };
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

    vm.run(script, path.join(collectionPath, 'vm.js'));

    return {
      request,
      envVariables,
      collectionVariables
    };
  }

  runResponseScript(script, request, response, envVariables, collectionVariables, collectionPath) {
    const bru = new Bru(envVariables, collectionVariables);
    const req = new BrunoRequest(request);
    const res = new BrunoResponse(response);

    const context = {
      bru,
      req,
      res
    };
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

    vm.run(script, path.join(collectionPath, 'vm.js'));

    return {
      response,
      envVariables,
      collectionVariables
    };
  }
}

module.exports = ScriptRuntime;
