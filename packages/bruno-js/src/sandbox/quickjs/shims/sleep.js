const addSleepShimToContext = (vm) => {
  const sleepHandle = vm.newFunction('sleep', (timer) => {
    const t = vm.getString(timer);
    const promise = vm.newPromise();
    setTimeout(() => {
      promise.resolve(vm.newString('slept'));
    }, t);
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sleepHandle.consume((handle) => vm.setProp(vm.global, 'sleep', handle));
};

module.exports = addSleepShimToContext;
