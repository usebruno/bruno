const { marshallToVm } = require('../utils');

const addBrunoResponseShimToContext = (vm, res) => {
  const resObject = vm.newObject();

  const status = marshallToVm(res?.status, vm);
  const headers = marshallToVm(res?.headers, vm);
  const body = marshallToVm(res?.body, vm);
  const responseTime = marshallToVm(res?.responseTime, vm);
  const url = marshallToVm(res?.url, vm);

  vm.setProp(resObject, 'status', status);
  vm.setProp(resObject, 'headers', headers);
  vm.setProp(resObject, 'body', body);
  vm.setProp(resObject, 'responseTime', responseTime);
  vm.setProp(resObject, 'url', url);

  status.dispose();
  headers.dispose();
  body.dispose();
  responseTime.dispose();
  url.dispose();

  let getStatus = vm.newFunction('getStatus', function () {
    return marshallToVm(res.getStatus(), vm);
  });
  vm.setProp(resObject, 'getStatus', getStatus);
  getStatus.dispose();

  let getHeader = vm.newFunction('getHeader', function (name) {
    return marshallToVm(res.getHeader(vm.dump(name)), vm);
  });
  vm.setProp(resObject, 'getHeader', getHeader);
  getHeader.dispose();

  let getHeaders = vm.newFunction('getHeaders', function () {
    return marshallToVm(res.getHeaders(), vm);
  });
  vm.setProp(resObject, 'getHeaders', getHeaders);
  getHeaders.dispose();

  let getBody = vm.newFunction('getBody', function () {
    return marshallToVm(res.getBody(), vm);
  });
  vm.setProp(resObject, 'getBody', getBody);
  getBody.dispose();

  let getResponseTime = vm.newFunction('getResponseTime', function () {
    return marshallToVm(res.getResponseTime(), vm);
  });
  vm.setProp(resObject, 'getResponseTime', getResponseTime);
  getResponseTime.dispose();

  let getUrl = vm.newFunction('getUrl', function () {
    return marshallToVm(res.getUrl(), vm);
  });
  vm.setProp(resObject, 'getUrl', getUrl);
  getUrl.dispose();

  vm.setProp(vm.global, 'res', resObject);
  resObject.dispose();
};

module.exports = addBrunoResponseShimToContext;
