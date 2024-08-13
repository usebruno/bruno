const { marshallToVm } = require('../utils');

const addBruShimToContext = (vm, __brunoTestResults) => {
  let addResult = vm.newFunction('addResult', function (v) {
    __brunoTestResults.addResult(vm.dump(v));
  });
  vm.setProp(vm.global, "__bruno__addResult", addResult);
  addResult.dispose();

  let getResults = vm.newFunction('getResults', function () {
    return marshallToVm(__brunoTestResults.getResults(), vm);
  });
  vm.setProp(vm.global, "__bruno__getResults", getResults);
  getResults.dispose();
};

module.exports = addBruShimToContext;
