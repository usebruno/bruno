const { marshallToVm } = require('../utils');

const addBrunoRequestShimToContext = (vm, req) => {
  const url = marshallToVm(req.getUrl(), vm);
  const method = marshallToVm(req.getMethod(), vm);
  const headers = marshallToVm(req.getHeaders(), vm);
  const body = marshallToVm(req.getBody(), vm);
  const timeout = marshallToVm(req.getTimeout(), vm);

  vm.setProp(vm.global, '__bruno__req__url', url);
  vm.setProp(vm.global, '__bruno__req__method', method);
  vm.setProp(vm.global, '__bruno__req__headers', headers);
  vm.setProp(vm.global, '__bruno__req__body', body);
  vm.setProp(vm.global, '__bruno__req__timeout', timeout);

  url.dispose();
  method.dispose();
  headers.dispose();
  body.dispose();
  timeout.dispose();

  let getUrl = vm.newFunction('getUrl', function () {
    return marshallToVm(req.getUrl(), vm);
  });
  vm.setProp(vm.global, '__bruno__req__getUrl', getUrl);
  getUrl.dispose();

  let setUrl = vm.newFunction('setUrl', function (url) {
    req.setUrl(vm.dump(url));
  });
  vm.setProp(vm.global, '__bruno__req__setUrl', setUrl);
  setUrl.dispose();

  let getMethod = vm.newFunction('getMethod', function () {
    return marshallToVm(req.getMethod(), vm);
  });
  vm.setProp(vm.global, '__bruno__req__getMethod', getMethod);
  getMethod.dispose();

  let getAuthMode = vm.newFunction('getAuthMode', function () {
    return marshallToVm(req.getAuthMode(), vm);
  });
  vm.setProp(vm.global, '__bruno__req__getAuthMode', getAuthMode);
  getAuthMode.dispose();

  let setMethod = vm.newFunction('setMethod', function (method) {
    req.setMethod(vm.dump(method));
  });
  vm.setProp(vm.global, '__bruno__req__setMethod', setMethod);
  setMethod.dispose();

  let getHeaders = vm.newFunction('getHeaders', function () {
    return marshallToVm(req.getHeaders(), vm);
  });
  vm.setProp(vm.global, '__bruno__req__getHeaders', getHeaders);
  getHeaders.dispose();

  let setHeaders = vm.newFunction('setHeaders', function (headers) {
    req.setHeaders(vm.dump(headers));
  });
  vm.setProp(vm.global, '__bruno__req__setHeaders', setHeaders);
  setHeaders.dispose();

  let getHeader = vm.newFunction('getHeader', function (name) {
    return marshallToVm(req.getHeader(vm.dump(name)), vm);
  });
  vm.setProp(vm.global, '__bruno__req__getHeader', getHeader);
  getHeader.dispose();

  let setHeader = vm.newFunction('setHeader', function (name, value) {
    req.setHeader(vm.dump(name), vm.dump(value));
  });
  vm.setProp(vm.global, '__bruno__req__setHeader', setHeader);
  setHeader.dispose();

  let getBody = vm.newFunction('getBody', function () {
    return marshallToVm(req.getBody(), vm);
  });
  vm.setProp(vm.global, '__bruno__req__getBody', getBody);
  getBody.dispose();

  let setBody = vm.newFunction('setBody', function (data) {
    req.setBody(vm.dump(data));
  });
  vm.setProp(vm.global, '__bruno__req__setBody', setBody);
  setBody.dispose();

  let setMaxRedirects = vm.newFunction('setMaxRedirects', function (maxRedirects) {
    req.setMaxRedirects(vm.dump(maxRedirects));
  });
  vm.setProp(vm.global, '__bruno__req__setMaxRedirects', setMaxRedirects);
  setMaxRedirects.dispose();

  let getTimeout = vm.newFunction('getTimeout', function () {
    return marshallToVm(req.getTimeout(), vm);
  });
  vm.setProp(vm.global, '__bruno__req__getTimeout', getTimeout);
  getTimeout.dispose();

  let setTimeout = vm.newFunction('setTimeout', function (timeout) {
    req.setTimeout(vm.dump(timeout));
  });
  vm.setProp(vm.global, '__bruno__req__setTimeout', setTimeout);
  setTimeout.dispose();
};

module.exports = addBrunoRequestShimToContext;
