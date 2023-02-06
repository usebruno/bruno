const { NodeVM } = require('vm2');
const path = require('path');
const Bru = require('./bru');
const BrunoRequest = require('./bruno-request');
const BrunoResponse = require('./bruno-response');

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

  runRequestScript(script, request, environment, collectionVariables, collectionPath) {
    const $bru = new Bru(environment, collectionVariables);
    const $req = new BrunoRequest(request);

    const context = {
      $bru,
      $req
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
      environment,
      collectionVariables
    };
  }

  runResponseScript(script, response, environment, collectionVariables, collectionPath) {
    const $bru = new Bru(environment, collectionVariables);
    const $res = new BrunoResponse(response);

    const context = {
      $bru,
      $res
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
      environment,
      collectionVariables
    };
  }
}

module.exports = {
  ScriptRuntime
};