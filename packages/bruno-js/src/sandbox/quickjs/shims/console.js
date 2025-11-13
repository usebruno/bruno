const addConsoleShimToContext = (vm, console) => {
  if (!console) return;

  // Helper function to convert QuickJS values to native values with Set/Map support
  const dumpWithSetMapSupport = arg => {
    try {
      // First try to dump normally
      const dumped = vm.dump(arg);

      // Check if it's a Set by trying to access Set-specific properties
      if (vm.typeof(arg) === 'object' && arg !== vm.null && arg !== vm.undefined) {
        // Try to get the constructor name
        const constructorProp = vm.getProp(arg, 'constructor');
        if (constructorProp) {
          const constructorNameProp = vm.getProp(constructorProp, 'name');
          if (constructorNameProp) {
            const constructorName = vm.dump(constructorNameProp);
            constructorNameProp.dispose();

            if (constructorName === 'Set') {
              // It's a Set, convert to our special format
              const sizeProp = vm.getProp(arg, 'size');
              const size = sizeProp ? vm.dump(sizeProp) : 0;
              sizeProp?.dispose();

              // Get values by calling values() method
              const valuesFn = vm.getProp(arg, 'values');
              if (valuesFn) {
                const valuesIterator = vm.callFunction(valuesFn, arg);
                const values = [];

                // Try to extract values (this is a simplified approach)
                try {
                  // For now, we'll use a different approach - convert via Array.from
                  const arrayFromFn = vm.getProp(vm.global, 'Array');
                  if (arrayFromFn) {
                    const fromFn = vm.getProp(arrayFromFn, 'from');
                    if (fromFn) {
                      const arrayResult = vm.callFunction(fromFn, arrayFromFn, arg);
                      const arrayValues = vm.dump(arrayResult);
                      arrayResult.dispose();
                      fromFn.dispose();

                      constructorProp.dispose();
                      valuesFn.dispose();
                      valuesIterator?.dispose();
                      arrayFromFn.dispose();

                      return {
                        __brunoType: 'Set',
                        __brunoValue: arrayValues,
                        size: size,
                      };
                    }
                    fromFn?.dispose();
                  }
                  arrayFromFn?.dispose();
                } catch (e) {
                  // Fallback to empty array
                }

                valuesFn.dispose();
                valuesIterator?.dispose();

                return {
                  __brunoType: 'Set',
                  __brunoValue: values,
                  size: size,
                };
              }
            } else if (constructorName === 'Map') {
              // It's a Map, convert to our special format
              const sizeProp = vm.getProp(arg, 'size');
              const size = sizeProp ? vm.dump(sizeProp) : 0;
              sizeProp?.dispose();

              // Try to convert via Array.from
              try {
                const arrayFromFn = vm.getProp(vm.global, 'Array');
                if (arrayFromFn) {
                  const fromFn = vm.getProp(arrayFromFn, 'from');
                  if (fromFn) {
                    const arrayResult = vm.callFunction(fromFn, arrayFromFn, arg);
                    const arrayValues = vm.dump(arrayResult);
                    arrayResult.dispose();
                    fromFn.dispose();
                    arrayFromFn.dispose();

                    constructorProp.dispose();

                    return {
                      __brunoType: 'Map',
                      __brunoValue: arrayValues,
                      size: size,
                    };
                  }
                  fromFn?.dispose();
                }
                arrayFromFn?.dispose();
              } catch (e) {
                // Fallback
              }

              constructorProp.dispose();

              return {
                __brunoType: 'Map',
                __brunoValue: [],
                size: size,
              };
            }
          }
          constructorNameProp?.dispose();
        }
        constructorProp?.dispose();
      }

      return dumped;
    } catch (e) {
      // Fallback to normal dump
      return vm.dump(arg);
    }
  };

  const consoleHandle = vm.newObject();

  const logHandle = vm.newFunction('log', (...args) => {
    const nativeArgs = args.map(dumpWithSetMapSupport);
    console?.log?.(...nativeArgs);
  });

  const debugHandle = vm.newFunction('debug', (...args) => {
    const nativeArgs = args.map(dumpWithSetMapSupport);
    console?.debug?.(...nativeArgs);
  });

  const infoHandle = vm.newFunction('info', (...args) => {
    const nativeArgs = args.map(dumpWithSetMapSupport);
    console?.info?.(...nativeArgs);
  });

  const warnHandle = vm.newFunction('warn', (...args) => {
    const nativeArgs = args.map(dumpWithSetMapSupport);
    console?.warn?.(...nativeArgs);
  });

  const errorHandle = vm.newFunction('error', (...args) => {
    const nativeArgs = args.map(dumpWithSetMapSupport);
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
