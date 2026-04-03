const { marshallToVm } = require('../utils');
const { createPropertyListBridge } = require('../utils/property-list-bridge');

// Marshal a QuickJS query argument to a host-compatible value.
// Function handles are wrapped as native callbacks; other values are dumped as-is.
// Safe because @usebruno/query's get() invokes filters synchronously,
// so the borrowed arg handle is still valid.
const toHostQueryArg = (vm, arg) => {
  if (vm.typeof(arg) === 'function') {
    return (item) => {
      const itemHandle = marshallToVm(item, vm);
      const result = vm.callFunction(arg, vm.undefined, itemHandle);
      itemHandle.dispose();

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw error;
      }

      const value = vm.dump(result.value);
      result.value.dispose();
      return value;
    };
  }

  return vm.dump(arg);
};

const addBrunoResponseShimToContext = (vm, res) => {
  let resFn = vm.newFunction('res', function (exprStr, ...queryArgs) {
    const nativeArgs = queryArgs.map((arg) => toHostQueryArg(vm, arg));
    return marshallToVm(res(vm.dump(exprStr), ...nativeArgs), vm);
  });

  const status = marshallToVm(res?.status, vm);
  const statusText = marshallToVm(res?.statusText, vm);
  const body = marshallToVm(res?.body, vm);
  const responseTime = marshallToVm(res?.responseTime, vm);
  const url = marshallToVm(res?.url, vm);

  vm.setProp(resFn, 'status', status);
  vm.setProp(resFn, 'statusText', statusText);
  vm.setProp(resFn, 'body', body);
  vm.setProp(resFn, 'responseTime', responseTime);
  vm.setProp(resFn, 'url', url);

  status.dispose();
  body.dispose();
  responseTime.dispose();
  url.dispose();
  statusText.dispose();

  // Wire res.headers as a read-only PropertyList bridge
  const headersObj = vm.newObject();
  const { evalCode: resHeadersEvalCode } = createPropertyListBridge(vm, res.headers, headersObj, {
    globalPath: 'globalThis.res.headers',
    syncReadMethods: ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'],
    syncReadObjectMethods: ['one', 'all', 'idx', 'toJSON'],
    withIterators: true
  });
  vm.setProp(resFn, 'headers', headersObj);
  headersObj.dispose();

  let getStatusText = vm.newFunction('getStatusText', function () {
    return marshallToVm(res.getStatusText(), vm);
  });
  vm.setProp(resFn, 'getStatusText', getStatusText);
  getStatusText.dispose();

  let getStatus = vm.newFunction('getStatus', function () {
    return marshallToVm(res.getStatus(), vm);
  });
  vm.setProp(resFn, 'getStatus', getStatus);
  getStatus.dispose();

  let getHeader = vm.newFunction('getHeader', function (name) {
    return marshallToVm(res.getHeader(vm.dump(name)), vm);
  });
  vm.setProp(resFn, 'getHeader', getHeader);
  getHeader.dispose();

  let getHeaders = vm.newFunction('getHeaders', function () {
    return marshallToVm(res.getHeaders(), vm);
  });
  vm.setProp(resFn, 'getHeaders', getHeaders);
  getHeaders.dispose();

  let getBody = vm.newFunction('getBody', function () {
    return marshallToVm(res.getBody(), vm);
  });
  vm.setProp(resFn, 'getBody', getBody);
  getBody.dispose();

  let getResponseTime = vm.newFunction('getResponseTime', function () {
    return marshallToVm(res.getResponseTime(), vm);
  });
  vm.setProp(resFn, 'getResponseTime', getResponseTime);
  getResponseTime.dispose();

  let getUrl = vm.newFunction('getUrl', function () {
    return marshallToVm(res.getUrl(), vm);
  });
  vm.setProp(resFn, 'getUrl', getUrl);
  getUrl.dispose();

  let setBody = vm.newFunction('setBody', function (data) {
    res.setBody(vm.dump(data));
  });
  vm.setProp(resFn, 'setBody', setBody);
  setBody.dispose();

  let getSize = vm.newFunction('getSize', function () {
    return marshallToVm(res.getSize(), vm);
  });
  vm.setProp(resFn, 'getSize', getSize);
  getSize.dispose();

  vm.setProp(vm.global, 'res', resFn);
  resFn.dispose();

  // Evaluate iterator code after res is on global (iterators reference globalThis.res.headers)
  if (resHeadersEvalCode) {
    vm.evalCode(resHeadersEvalCode);
  }
};

module.exports = addBrunoResponseShimToContext;
