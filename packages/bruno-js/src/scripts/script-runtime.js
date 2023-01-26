const { NodeVM } = require('vm2');
const Bru = require('./bru');
const BrunoRequest = require('./bruno-request');

class ScriptRuntime {
  constructor() {
  }

  run(script, request, environment) {
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

    return request;
  }
}

module.exports = {
  ScriptRuntime
};