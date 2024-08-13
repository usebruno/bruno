
const { marshallToVm } = require('../utils');

const addBrunoResponseShimToContext = (vm, res) => {
  const status = marshallToVm(res?.status, vm);
  const headers = marshallToVm(res?.headers, vm);
  const body = marshallToVm(res?.body, vm);
  const responseTime = marshallToVm(res?.responseTime, vm);

  vm.setProp(vm.global, '__bruno__res__status', status);
  vm.setProp(vm.global, '__bruno__res__headers', headers);
  vm.setProp(vm.global, '__bruno__res__body', body);
  vm.setProp(vm.global, '__bruno__res__responseTime', responseTime);

  status.dispose();
  headers.dispose();
  body.dispose();
  responseTime.dispose();

  let getStatus = vm.newFunction('getStatus', function () {
    return marshallToVm(res.getStatus(), vm);
  });
  vm.setProp(vm.global, '__bruno__res__getStatus', getStatus);
  getStatus.dispose();

  let getHeader = vm.newFunction('getHeader', function (name) {
    return marshallToVm(res.getHeader(vm.dump(name)), vm);
  });
  vm.setProp(vm.global, '__bruno__res__getHeader', getHeader);
  getHeader.dispose();

  let getHeaders = vm.newFunction('getHeaders', function () {
    return marshallToVm(res.getHeaders(), vm);
  });
  vm.setProp(vm.global, '__bruno__res__getHeaders', getHeaders);
  getHeaders.dispose();

  let getBody = vm.newFunction('getBody', function () {
    return marshallToVm(res.getBody(), vm);
  });
  vm.setProp(vm.global, '__bruno__res__getBody', getBody);
  getBody.dispose();

  let getResponseTime = vm.newFunction('getResponseTime', function () {
    return marshallToVm(res.getResponseTime(), vm);
  });
  vm.setProp(vm.global, '__bruno__res__getResponseTime', getResponseTime);
  getResponseTime.dispose();
};

module.exports = addBrunoResponseShimToContext;
