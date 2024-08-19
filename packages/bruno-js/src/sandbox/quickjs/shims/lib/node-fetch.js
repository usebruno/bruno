const fetch = require('node-fetch');
const { cleanJson } = require('../../../../utils');
const { marshallToVm } = require('../../utils');

const addNodeFetchShimToContext = async (vm) => {
  const nodeFetchHandle = vm.newFunction('node_fetch', (...args) => {
    const nativeArgs = args.map(vm.dump);
    const promise = vm.newPromise();
    fetch(...nativeArgs)
      .then(async (response) => {
        const { status, headers } = response || {};
        const data = await response.json();
        promise.resolve(marshallToVm(cleanJson({ status, headers, data }), vm));
      })
      .catch((err) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });

  nodeFetchHandle.consume((handle) => vm.setProp(vm.global, `__bruno__node_fetch`, handle));
  vm.evalCode(
    `
        globalThis.nodeFetch = __bruno__node_fetch;
        globalThis.requireObject = {
            ...globalThis.requireObject,
            'node-fetch': globalThis.nodeFetch,
        }
    `
  );
};

module.exports = addNodeFetchShimToContext;
