const addPmProxyShimToContext = (vm) => {
  const result = vm.evalCode(`
    (function() {
      globalThis.__pmApiWarnings = [];

      function recordPmWarning(path) {
        var warnings = globalThis.__pmApiWarnings;
        // Already recorded
        if (warnings.indexOf(path) !== -1) return;
        // A deeper path is already recorded — this is just an intermediate access
        for (var i = 0; i < warnings.length; i++) {
          if (warnings[i].indexOf(path + '.') === 0) return;
        }
        // Remove any shallower prefixes that this path supersedes
        globalThis.__pmApiWarnings = warnings.filter(function(w) {
          return path.indexOf(w + '.') !== 0;
        });
        globalThis.__pmApiWarnings.push(path);
      }

      function createPmProxy(baseName) {
        return new Proxy(function() {}, {
          get(target, prop) {
            if (typeof prop === 'symbol') return undefined;
            var fullPath = baseName + '.' + prop;
            recordPmWarning(fullPath);
            return createPmProxy(fullPath);
          },
          apply(target, thisArg, args) {
            recordPmWarning(baseName);
            return undefined;
          },
          construct(target, args) {
            recordPmWarning(baseName);
            return {};
          },
          set(target, prop, value) {
            recordPmWarning(baseName + '.' + prop);
            return true;
          },
          has(target, prop) {
            return false;
          },
          ownKeys(target) {
            return [];
          }
        });
      }

      globalThis.pm = createPmProxy('pm');
      globalThis.postman = createPmProxy('postman');
    })();
  `);

  if (result.error) {
    const err = vm.dump(result.error);
    result.error.dispose();
    console.error('Failed to set up pm/postman proxy shim in QuickJS:', err);
  } else {
    result.value.dispose();
  }
};

/**
 * Extracts the collected __pmApiWarnings from the QuickJS VM.
 * Call this after script execution to retrieve any pm/postman API paths accessed.
 */
const extractPmApiWarnings = (vm) => {
  try {
    const warningsHandle = vm.getProp(vm.global, '__pmApiWarnings');
    const warnings = vm.dump(warningsHandle);
    warningsHandle.dispose();
    return Array.isArray(warnings) ? warnings : [];
  } catch (e) {
    return [];
  }
};

module.exports = addPmProxyShimToContext;
module.exports.extractPmApiWarnings = extractPmApiWarnings;
