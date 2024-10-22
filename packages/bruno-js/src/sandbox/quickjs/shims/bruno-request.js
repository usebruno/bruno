const { marshallToVm } = require('../utils');

const addBrunoRequestShimToContext = (vm, req) => {
  const reqObject = vm.newObject();

  const url = marshallToVm(req.getUrl(), vm);
  const method = marshallToVm(req.getMethod(), vm);
  const headers = marshallToVm(req.getHeaders(), vm);
  const body = marshallToVm(req.getBody(), vm);
  const timeout = marshallToVm(req.getTimeout(), vm);

  vm.setProp(reqObject, 'url', url);
  vm.setProp(reqObject, 'method', method);
  vm.setProp(reqObject, 'headers', headers);
  vm.setProp(reqObject, 'body', body);
  vm.setProp(reqObject, 'timeout', timeout);

  url.dispose();
  method.dispose();
  headers.dispose();
  body.dispose();
  timeout.dispose();

  let getUrl = vm.newFunction('getUrl', function () {
    return marshallToVm(req.getUrl(), vm);
  });
  vm.setProp(reqObject, 'getUrl', getUrl);
  getUrl.dispose();

  let setUrl = vm.newFunction('setUrl', function (url) {
    req.setUrl(vm.dump(url));
  });
  vm.setProp(reqObject, 'setUrl', setUrl);
  setUrl.dispose();

  let getMethod = vm.newFunction('getMethod', function () {
    return marshallToVm(req.getMethod(), vm);
  });
  vm.setProp(reqObject, 'getMethod', getMethod);
  getMethod.dispose();

  let getAuthMode = vm.newFunction('getAuthMode', function () {
    return marshallToVm(req.getAuthMode(), vm);
  });
  vm.setProp(reqObject, 'getAuthMode', getAuthMode);
  getAuthMode.dispose();

  let setMethod = vm.newFunction('setMethod', function (method) {
    req.setMethod(vm.dump(method));
  });
  vm.setProp(reqObject, 'setMethod', setMethod);
  setMethod.dispose();

  let getHeaders = vm.newFunction('getHeaders', function () {
    return marshallToVm(req.getHeaders(), vm);
  });
  vm.setProp(reqObject, 'getHeaders', getHeaders);
  getHeaders.dispose();

  let setHeaders = vm.newFunction('setHeaders', function (headers) {
    req.setHeaders(vm.dump(headers));
  });
  vm.setProp(reqObject, 'setHeaders', setHeaders);
  setHeaders.dispose();

  let getHeader = vm.newFunction('getHeader', function (name) {
    return marshallToVm(req.getHeader(vm.dump(name)), vm);
  });
  vm.setProp(reqObject, 'getHeader', getHeader);
  getHeader.dispose();

  let setHeader = vm.newFunction('setHeader', function (name, value) {
    req.setHeader(vm.dump(name), vm.dump(value));
  });
  vm.setProp(reqObject, 'setHeader', setHeader);
  setHeader.dispose();

  let getBody = vm.newFunction('getBody', function () {
    return marshallToVm(req.getBody(), vm);
  });
  vm.setProp(reqObject, 'getBody', getBody);
  getBody.dispose();

  let setBody = vm.newFunction('setBody', function (data) {
    req.setBody(vm.dump(data));
  });
  vm.setProp(reqObject, 'setBody', setBody);
  setBody.dispose();

  let setMaxRedirects = vm.newFunction('setMaxRedirects', function (maxRedirects) {
    req.setMaxRedirects(vm.dump(maxRedirects));
  });
  vm.setProp(reqObject, 'setMaxRedirects', setMaxRedirects);
  setMaxRedirects.dispose();

  let getTimeout = vm.newFunction('getTimeout', function () {
    return marshallToVm(req.getTimeout(), vm);
  });
  vm.setProp(reqObject, 'getTimeout', getTimeout);
  getTimeout.dispose();

  let setTimeout = vm.newFunction('setTimeout', function (timeout) {
    req.setTimeout(vm.dump(timeout));
  });
  vm.setProp(reqObject, 'setTimeout', setTimeout);
  setTimeout.dispose();

  let disableParsingResponseJson = vm.newFunction('disableParsingResponseJson', function () {
    req.disableParsingResponseJson();
  });
  vm.setProp(reqObject, 'disableParsingResponseJson', disableParsingResponseJson);
  disableParsingResponseJson.dispose();

  let getExecutionMode = vm.newFunction('getExecutionMode', function () {
    return marshallToVm(req.getExecutionMode(), vm);
  });
  vm.setProp(reqObject, 'getExecutionMode', getExecutionMode);
  getExecutionMode.dispose();

  vm.setProp(vm.global, 'req', reqObject);
  reqObject.dispose();
};

module.exports = addBrunoRequestShimToContext;
