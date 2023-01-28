const { NodeVM } = require('vm2');
const Bru = require('./bru');
const BrunoRequest = require('./bruno-request');
const BrunoResponse = require('./bruno-response');

class ScriptRuntime {
  constructor() {
  }

  runRequestScript(script, request, environment) {
    const bru = new Bru(environment);
    const brunoRequest = new BrunoRequest(request);

    const context = {
      bru,
      brunoRequest
    };
    const vm = new NodeVM({
      sandbox: context
    });

    vm.run(script);

    return {
      request,
      environment
    };
  }

  runResponseScript(script, response, environment) {
    const bru = new Bru(environment);
    const brunoResponse = new BrunoResponse(response);

    const context = {
      bru,
      brunoResponse
    };
    const vm = new NodeVM({
      sandbox: context
    });

    vm.run(script);

    return {
      response,
      environment
    };
  }
}

module.exports = {
  ScriptRuntime
};