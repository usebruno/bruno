const { marshallToVm } = require('../utils');

const addBruShimToContext = (vm, bru) => {
  const bruObject = vm.newObject();

  let cwd = vm.newFunction('cwd', function () {
    return marshallToVm(bru.cwd(), vm);
  });
  vm.setProp(bruObject, 'cwd', cwd);
  cwd.dispose();

  let getEnvName = vm.newFunction('getEnvName', function () {
    return marshallToVm(bru.getEnvName(), vm);
  });
  vm.setProp(bruObject, 'getEnvName', getEnvName);
  getEnvName.dispose();

  let getProcessEnv = vm.newFunction('getProcessEnv', function (key) {
    return marshallToVm(bru.getProcessEnv(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getProcessEnv', getProcessEnv);
  getProcessEnv.dispose();

  let getEnvVar = vm.newFunction('getEnvVar', function (key) {
    return marshallToVm(bru.getEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getEnvVar', getEnvVar);
  getEnvVar.dispose();

  let setEnvVar = vm.newFunction('setEnvVar', function (key, value) {
    bru.setEnvVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(bruObject, 'setEnvVar', setEnvVar);
  setEnvVar.dispose();

  let getVar = vm.newFunction('getVar', function (key) {
    return marshallToVm(bru.getVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getVar', getVar);
  getVar.dispose();

  let setVar = vm.newFunction('setVar', function (key, value) {
    bru.setVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(bruObject, 'setVar', setVar);
  setVar.dispose();

  let setNextRequest = vm.newFunction('setNextRequest', function (nextRequest) {
    bru.setNextRequest(vm.dump(nextRequest));
  });
  vm.setProp(bruObject, 'setNextRequest', setNextRequest);
  setNextRequest.dispose();

  let visualize = vm.newFunction('visualize', function (htmlString) {
    bru.visualize(vm.dump(htmlString));
  });
  vm.setProp(bruObject, 'visualize', visualize);
  visualize.dispose();

  let getSecretVar = vm.newFunction('getSecretVar', function (key) {
    return marshallToVm(bru.getSecretVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getSecretVar', getSecretVar);
  getSecretVar.dispose();

  let getRequestVar = vm.newFunction('getRequestVar', function (key) {
    return marshallToVm(bru.getRequestVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getRequestVar', getRequestVar);
  getRequestVar.dispose();

  let getFolderVar = vm.newFunction('getFolderVar', function (key) {
    return marshallToVm(bru.getFolderVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getFolderVar', getFolderVar);
  getFolderVar.dispose();

  let getCollectionVar = vm.newFunction('getCollectionVar', function (key) {
    return marshallToVm(bru.getCollectionVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getCollectionVar', getCollectionVar);
  getCollectionVar.dispose();

  const sleep = vm.newFunction('sleep', (timer) => {
    const t = vm.getString(timer);
    const promise = vm.newPromise();
    setTimeout(() => {
      promise.resolve(vm.newString('slept'));
    }, t);
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sleep.consume((handle) => vm.setProp(bruObject, 'sleep', handle));

  vm.setProp(vm.global, 'bru', bruObject);
  bruObject.dispose();
};

module.exports = addBruShimToContext;
