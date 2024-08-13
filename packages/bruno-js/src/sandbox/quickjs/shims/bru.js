const { marshallToVm } = require('../utils');

const addBruShimToContext = (vm, bru) => {
  let cwd = vm.newFunction('cwd', function () {
    return marshallToVm(bru.cwd(), vm);
  });
  vm.setProp(vm.global, "__bruno__cwd", cwd)
  cwd.dispose();

  let getEnvName = vm.newFunction('getEnvName', function () {
    return marshallToVm(bru.getEnvName(), vm);
  });
  vm.setProp(vm.global, "__bruno__getEnvName", getEnvName);
  getEnvName.dispose();

  let getProcessEnv = vm.newFunction('getProcessEnv', function (key) {
    return marshallToVm(bru.getProcessEnv(vm.dump(key)), vm);
  });
  vm.setProp(vm.global, "__bruno__getProcessEnv", getProcessEnv);
  getProcessEnv.dispose();

  let getEnvVar = vm.newFunction('getEnvVar', function (key) {
    return marshallToVm(bru.getEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(vm.global, "__bruno__getEnvVar", getEnvVar);
  getEnvVar.dispose();

  let setEnvVar = vm.newFunction('setEnvVar', function (key, value) {
    bru.setEnvVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(vm.global, "__bruno__setEnvVar", setEnvVar);
  setEnvVar.dispose();

  let getVar = vm.newFunction('getVar', function (key) {
    return marshallToVm(bru.getVar(vm.dump(key)), vm);
  });
  vm.setProp(vm.global, "__bruno__getVar", getVar);
  getVar.dispose();

  let setVar = vm.newFunction('setVar', function (key, value) {
    bru.setVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(vm.global, "__bruno__setVar", setVar);
  setVar.dispose();

  let setNextRequest = vm.newFunction('setNextRequest', function (nextRequest) {
    bru.setNextRequest(vm.dump(nextRequest));
  });
  vm.setProp(vm.global, "__bruno__setNextRequest", setNextRequest);
  setNextRequest.dispose();

  let visualize = vm.newFunction('visualize', function (htmlString) {
    bru.visualize(vm.dump(htmlString));
  });
  vm.setProp(vm.global, "__bruno__visualize", visualize);
  visualize.dispose();

  let getSecretVar = vm.newFunction('getSecretVar', function (key) {
    return marshallToVm(bru.getSecretVar(vm.dump(key)), vm);
  });
  vm.setProp(vm.global, "__bruno__getSecretVar", getSecretVar);
  getSecretVar.dispose();
};

module.exports = addBruShimToContext;
