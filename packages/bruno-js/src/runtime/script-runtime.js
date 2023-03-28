const { NodeVM } = require('vm2');
const path = require('path');
const http = require('http');
const https = require('https');
const stream = require('stream');
const util = require('util');
const zlib = require('zlib');
const url = require('url');
const punycode = require('punycode');
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
const axios = require('axios');
const CryptoJS = require('crypto-js');

class ScriptRuntime {
  constructor() {
  }

  async runRequestScript(script, request, envVariables, collectionVariables, collectionPath) {
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
          // node libs
          path,
          stream,
          util,
          url,
          http,
          https,
          punycode,
          zlib,
          // 3rd party libs
          atob,
          btoa,
          lodash,
          moment,
          uuid,
          nanoid,
          axios,
          'crypto-js': CryptoJS
        }
      }
    });

    // wrap script inside a async function that gets called
    script = `return (async () => { ${script} })()`;

    // bug that needs to be fixed
    // vm.run is not awaiting the async function
    // created an issue in vm2 repo: https://github.com/patriksimek/vm2/issues/513
    const result = await vm.run(script, path.join(collectionPath, 'vm.js'));
    console.log(result);

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
