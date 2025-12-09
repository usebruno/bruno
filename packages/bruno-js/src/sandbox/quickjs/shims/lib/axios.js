const axios = require('axios');
const { cleanJson } = require('../../../../utils');
const { marshallToVm } = require('../../utils');

const methods = ['get', 'post', 'put', 'patch', 'delete'];

const buildAxiosErrorData = (err) => {
  return {
    message: err.message,
    ...(err.response && {
      response: {
        status: err.response.status,
        statusText: err.response.statusText,
        headers: err.response.headers,
        data: err.response.data
      }
    }),
    ...(err.config && {
      config: {
        url: err.config.url,
        method: err.config.method,
        headers: err.config.headers,
        data: err.config.data
      }
    })
  };
};

const addAxiosShimToContext = async (vm) => {
  methods?.forEach((method) => {
    const axiosHandle = vm.newFunction(method, (...args) => {
      const nativeArgs = args.map(vm.dump);
      const promise = vm.newPromise();
      axios[method](...nativeArgs)
        .then((response) => {
          const { status, headers, data } = response || {};
          promise.resolve(marshallToVm(cleanJson({ status, headers, data }), vm));
        })
        .catch((err) => {
          promise.reject(marshallToVm(cleanJson(buildAxiosErrorData(err)), vm));
        });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    axiosHandle.consume((handle) => vm.setProp(vm.global, `__bruno__axios__${method}`, handle));
  });

  const axiosHandle = vm.newFunction('axios', (...args) => {
    const nativeArgs = args.map(vm.dump);
    const promise = vm.newPromise();
    axios(...nativeArgs)
      .then((response) => {
        const { status, headers, data } = response || {};
        promise.resolve(marshallToVm(cleanJson({ status, headers, data }), vm));
      })
      .catch((err) => {
        promise.reject(marshallToVm(cleanJson(buildAxiosErrorData(err)), vm));
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  axiosHandle.consume((handle) => vm.setProp(vm.global, `__bruno__axios`, handle));

  vm.evalCode(
    `
        globalThis.axios = __bruno__axios;
        ${methods
          ?.map((method) => {
            return `globalThis.axios.${method} = __bruno__axios__${method};`;
          })
          ?.join('\n')}
        globalThis.requireObject = {
          ...globalThis.requireObject,
          axios: globalThis.axios,
        }
    `
  );
};

module.exports = addAxiosShimToContext;
