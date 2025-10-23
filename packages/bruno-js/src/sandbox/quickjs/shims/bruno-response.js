const { marshallToVm } = require('../utils');

const addBrunoResponseShimToContext = (vm, res) => {
  let resFn = vm.newFunction('res', function (exprStr) {
    return marshallToVm(res(vm.dump(exprStr)), vm);
  });

  const status = marshallToVm(res?.status, vm);
  const statusText = marshallToVm(res?.statusText, vm);
  const headers = marshallToVm(res?.headers, vm);
  const body = marshallToVm(res?.body, vm);
  const responseTime = marshallToVm(res?.responseTime, vm);
  const url = marshallToVm(res?.url, vm);

  vm.setProp(resFn, 'status', status);
  vm.setProp(resFn, 'statusText', statusText);
  vm.setProp(resFn, 'headers', headers);
  vm.setProp(resFn, 'body', body);
  vm.setProp(resFn, 'responseTime', responseTime);
  vm.setProp(resFn, 'url', url);

  status.dispose();
  headers.dispose();
  body.dispose();
  responseTime.dispose();
  url.dispose();
  statusText.dispose();

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
};

module.exports = addBrunoResponseShimToContext;
