const { marshallToVm } = require('../utils');

const addBrunoRequestShimToContext = (vm, req) => {
  const url = marshallToVm(req.getUrl(), vm);
  const method = marshallToVm(req.getMethod(), vm);
  const headers = marshallToVm(req.getHeaders(), vm);
  const body = marshallToVm(req.getBody(), vm);
  const timeout = marshallToVm(req.getTimeout(), vm);

  vm.setProp(vm.global, '__bruno__requrl', url);
  vm.setProp(vm.global, '__bruno__reqmethod', method);
  vm.setProp(vm.global, '__bruno__reqheaders', headers);
  vm.setProp(vm.global, '__bruno__reqbody', body);
  vm.setProp(vm.global, '__bruno__reqtimeout', timeout);

  url.dispose();
  method.dispose();
  headers.dispose();
  body.dispose();
  timeout.dispose();

  // let getUrl = vm.newFunction('__bruno__req__getUrl', function () {
  //   return marshallToVm(req.getUrl(), vm);
  // });
  // vm.setProp(vm.global, 'getUrl', getUrl);
  // getUrl.dispose();

  // let setUrl = vm.newFunction('__bruno__req__setUrl', function (url) {
  //   req.setUrl(vm.dump(url));
  // });
  // vm.setProp(vm.global, 'setUrl', setUrl);
  // setUrl.dispose();

  // let getMethod = vm.newFunction('__bruno__req__getMethod', function () {
  //   return marshallToVm(req.getMethod(), vm);
  // });
  // vm.setProp(vm.global, 'getMethod', getMethod);
  // getMethod.dispose();

  // let getAuthMode = vm.newFunction('__bruno__req__getAuthMode', function () {
  //   return marshallToVm(req.getAuthMode(), vm);
  // });
  // vm.setProp(vm.global, 'getAuthMode', getAuthMode);
  // getAuthMode.dispose();

  // let setMethod = vm.newFunction('__bruno__req__setMethod', function (method) {
  //   req.setMethod(vm.dump(method));
  // });
  // vm.setProp(vm.global, 'setMethod', setMethod);
  // setMethod.dispose();

  // let getHeaders = vm.newFunction('__bruno__req__getHeaders', function () {
  //   return marshallToVm(req.getHeaders(), vm);
  // });
  // vm.setProp(vm.global, 'getHeaders', getHeaders);
  // getHeaders.dispose();

  // let setHeaders = vm.newFunction('__bruno__req__setHeaders', function (headers) {
  //   req.setHeaders(vm.dump(headers));
  // });
  // vm.setProp(vm.global, 'setHeaders', setHeaders);
  // setHeaders.dispose();

  // let getHeader = vm.newFunction('__bruno__req__getHeader', function (name) {
  //   return marshallToVm(req.getHeader(vm.dump(name)), vm);
  // });
  // vm.setProp(vm.global, 'getHeader', getHeader);
  // getHeader.dispose();

  // let setHeader = vm.newFunction('__bruno__req__setHeader', function (name, value) {
  //   req.setHeader(vm.dump(name), vm.dump(value));
  // });
  // vm.setProp(vm.global, 'setHeader', setHeader);
  // setHeader.dispose();

  // let getBody = vm.newFunction('__bruno__req__getBody', function () {
  //   return marshallToVm(req.getBody(), vm);
  // });
  // vm.setProp(vm.global, 'getBody', getBody);
  // getBody.dispose();

  // let setBody = vm.newFunction('__bruno__req__setBody', function (data) {
  //   req.setBody(vm.dump(data));
  // });
  // vm.setProp(vm.global, 'setBody', setBody);
  // setBody.dispose();

  // let setMaxRedirects = vm.newFunction('__bruno__req__setMaxRedirects', function (maxRedirects) {
  //   req.setMaxRedirects(vm.dump(maxRedirects));
  // });
  // vm.setProp(vm.global, 'setMaxRedirects', setMaxRedirects);
  // setMaxRedirects.dispose();

  // let getTimeout = vm.newFunction('__bruno__req__getTimeout', function () {
  //   return marshallToVm(req.getTimeout(), vm);
  // });
  // vm.setProp(vm.global, 'getTimeout', getTimeout);
  // getTimeout.dispose();

  // let setTimeout = vm.newFunction('__bruno__req__setTimeout', function (timeout) {
  //   req.setTimeout(vm.dump(timeout));
  // });
  // vm.setProp(vm.global, 'setTimeout', setTimeout);
  // setTimeout.dispose();
};

module.exports = addBrunoRequestShimToContext;
