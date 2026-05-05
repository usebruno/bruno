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

  // res.headers — plain headers object for backward-compatible bracket access
  const headersVal = marshallToVm(res?.headers || {}, vm);
  vm.setProp(resFn, 'headers', headersVal);
  headersVal.dispose();

  // res.headerList — read-only PropertyList bridge for structured header operations
  let resHeadersEvalCode = '';
  if (res?.headerList) {
    const headerListObj = vm.newObject();
    const bridge = createPropertyListBridge(vm, res.headerList, headerListObj, {
      globalPath: 'globalThis.res.headerList',
      syncReadMethods: ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'],
      syncReadObjectMethods: ['one', 'all', 'idx', 'toJSON', 'entries', 'keys', 'values'],
      syncWriteMethods: ['append', 'set', 'delete', 'clear', 'populate', 'repopulate', 'assimilate'],
      withIterators: true
    });
    resHeadersEvalCode = bridge.evalCode;
    vm.setProp(resFn, 'headerList', headerListObj);
    headerListObj.dispose();
  }

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

  // Evaluate iterator code after res is on global (iterators reference globalThis.res.headerList)
  // Wrapped in a block to avoid const redeclaration conflicts with req.headerList's evalCode
  // The bridge generates `each` (shared with CookieList); alias `forEach` for HeaderList's MDN-style API
  if (resHeadersEvalCode) {
    vm.evalCode(`{ ${resHeadersEvalCode} globalThis.res.headerList.forEach = globalThis.res.headerList.each; }`);
  }
};

module.exports = addBrunoResponseShimToContext;
