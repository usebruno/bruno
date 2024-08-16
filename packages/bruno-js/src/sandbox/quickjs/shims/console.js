const addConsoleShimToContext = (vm, console) => {
  const consoleHandle = vm.newObject();

  const logHandle = vm.newFunction('log', (...args) => {
    const nativeArgs = args.map(vm.dump);
    console?.log && console.log(...nativeArgs);
  });

  const debugHandle = vm.newFunction('debug', (...args) => {
    const nativeArgs = args.map(vm.dump);
    console?.debug && console.debug(...nativeArgs);
  });

  const infoHandle = vm.newFunction('info', (...args) => {
    const nativeArgs = args.map(vm.dump);
    console?.info && console.info(...nativeArgs);
  });

  const warnHandle = vm.newFunction('warn', (...args) => {
    const nativeArgs = args.map(vm.dump);
    console?.warn && console.warn(...nativeArgs);
  });

  const errorHandle = vm.newFunction('error', (...args) => {
    const nativeArgs = args.map(vm.dump);
    console?.error && console.error(...nativeArgs);
  });

  vm.setProp(consoleHandle, 'log', logHandle);
  vm.setProp(consoleHandle, 'debug', debugHandle);
  vm.setProp(consoleHandle, 'info', infoHandle);
  vm.setProp(consoleHandle, 'warn', warnHandle);
  vm.setProp(consoleHandle, 'error', errorHandle);

  vm.setProp(vm.global, 'console', consoleHandle);
  consoleHandle.dispose();
  logHandle.dispose();
  debugHandle.dispose();
  infoHandle.dispose();
  warnHandle.dispose();
  errorHandle.dispose();
};

module.exports = addConsoleShimToContext;
