const { NodeVM } = require('vm2');
const BrunoRequest = require('./bruno-request');

class ScriptRuntime {
  constructor() {
  }

  run(script, request) {
    const brunoRequest = new BrunoRequest(request);

    const context = {
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