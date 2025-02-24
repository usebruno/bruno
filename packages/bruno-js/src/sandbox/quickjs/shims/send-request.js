const { marshallToVm } = require('../utils');
const { cleanJson } = require('../../../utils');

const addSendRequestShimToContext = (vm, bru) => {
  let handleRequestPromise = vm.newFunction('handleRequestPromise', function(requestConfig) {
    const promise = vm.newPromise();
    bru.sendRequest(vm.dump(requestConfig))
      .then((response) => {
        promise.resolve(marshallToVm(cleanJson(response), vm));
      })
      .catch((error) => {
        promise.reject(marshallToVm(cleanJson({
          message: error.message,
          stack: error.stack
        }), vm));
      });
    promise.settled.then(() => vm.runtime.executePendingJobs());
    return promise.handle;
  });
  vm.setProp(vm.global, '__bruno__handleRequestPromise', handleRequestPromise);
  handleRequestPromise.dispose();

  vm.evalCode(`
    globalThis.bru.sendRequest = async (requestConfig, callback) => {
      if (typeof callback === 'function') {
        try {
          const response = await globalThis.__bruno__handleRequestPromise(requestConfig);
          callback(null, response);
        } catch (error) {
          callback(error, null);
        }
        return;
      }
      return globalThis.__bruno__handleRequestPromise(requestConfig);
    };
  `);
};

module.exports = addSendRequestShimToContext;
