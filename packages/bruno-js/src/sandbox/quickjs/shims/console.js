const addConsoleShimToContext = (vm, console) => {
  if (!console) return;

  // Helper function to convert QuickJS values to native values with Set/Map support
  const dumpWithSerializers = (arg) => {
    // Track all handles for centralized disposal
    let nameProp, constructorProp, constructorNameProp, toStringFn, toStringResult;
    let arrayFn, fromFn, arrayResult;

    try {
      const argType = vm.typeof(arg);

      // Early return for primitives (string, number, boolean, undefined, null)
      if (arg == null || arg === vm.null || arg === vm.undefined) {
        return vm.dump(arg);
      }

      if (argType !== 'object' && argType !== 'function') {
        return vm.dump(arg);
      }

      // Handle functions - show clean wrapper
      if (argType === 'function') {
        nameProp = vm.getProp(arg, 'name');
        const name = nameProp ? vm.dump(nameProp) || 'anonymous' : 'anonymous';
        return `function ${name}() {\n    [native code]\n}`;
      }

      // Try to get the constructor name to detect Set/Map
      constructorProp = vm.getProp(arg, 'constructor');
      if (!constructorProp) {
        return vm.dump(arg);
      }

      let constructorName = null;
      constructorNameProp = vm.getProp(constructorProp, 'name');
      if (constructorNameProp) {
        constructorName = vm.dump(constructorNameProp);
      }

      // Handle Date, RegExp, Error - call toString()
      if (constructorName === 'Date' || constructorName === 'RegExp' || constructorName?.endsWith?.('Error')) {
        toStringFn = vm.getProp(arg, 'toString');
        if (toStringFn) {
          toStringResult = vm.callFunction(toStringFn, arg);
          if (toStringResult.error) {
            return vm.dump(arg);
          }
          return vm.dump(toStringResult.value);
        }
      }

      // If not a Set or Map, use standard dump
      if (constructorName !== 'Set' && constructorName !== 'Map') {
        return vm.dump(arg);
      }

      // Convert Set or Map to array via Array.from
      arrayFn = vm.getProp(vm.global, 'Array');
      if (!arrayFn) {
        return vm.dump(arg);
      }

      fromFn = vm.getProp(arrayFn, 'from');
      if (!fromFn) {
        return vm.dump(arg);
      }

      arrayResult = vm.callFunction(fromFn, arrayFn, arg);
      if (arrayResult.error) {
        return vm.dump(arg);
      }

      return {
        __brunoType: constructorName,
        __brunoValue: vm.dump(arrayResult.value)
      };
    } catch (e) {
      // Fallback to normal dump
      return vm.dump(arg);
    } finally {
      // Centralized handle disposal - dispose all handles regardless of success or error
      nameProp?.dispose();
      constructorProp?.dispose();
      constructorNameProp?.dispose();
      toStringFn?.dispose();
      toStringResult?.value?.dispose();
      toStringResult?.error?.dispose();
      arrayFn?.dispose();
      fromFn?.dispose();
      arrayResult?.value?.dispose();
      arrayResult?.error?.dispose();
    }
  };

  const consoleHandle = vm.newObject();

  const logHandle = vm.newFunction('log', (...args) => {
    const nativeArgs = args.map(dumpWithSerializers);
    console?.log?.(...nativeArgs);
  });

  const debugHandle = vm.newFunction('debug', (...args) => {
    const nativeArgs = args.map(dumpWithSerializers);
    console?.debug?.(...nativeArgs);
  });

  const infoHandle = vm.newFunction('info', (...args) => {
    const nativeArgs = args.map(dumpWithSerializers);
    console?.info?.(...nativeArgs);
  });

  const warnHandle = vm.newFunction('warn', (...args) => {
    const nativeArgs = args.map(dumpWithSerializers);
    console?.warn?.(...nativeArgs);
  });

  const errorHandle = vm.newFunction('error', (...args) => {
    const nativeArgs = args.map(dumpWithSerializers);
    console?.error?.(...nativeArgs);
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
