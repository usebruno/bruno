const { CONSOLE_METHODS } = require('../../runtime/script-console');

/**
 * Gets the type tag of a value using Object.prototype.toString
 * This works across VM context boundaries unlike instanceof
 * @param {*} value - The value to check
 * @returns {string} The type tag (e.g., 'Set', 'Map', 'Array', 'Object')
 */
function getTypeTag(value) {
  return Object.prototype.toString.call(value).slice(8, -1);
}

/**
 * Transforms a value, converting Set and Map to a special format for display
 * Uses Object.prototype.toString for cross-context type detection
 * @param {*} value - The value to transform
 * @param {WeakSet} seen - Set of already visited objects for circular ref detection
 * @returns {*} Transformed value with Set/Map converted to __brunoType format
 */
function transformValue(value, seen = new WeakSet()) {
  // Return primitives as-is
  if (value === null || value === undefined || typeof value !== 'object' && typeof value !== 'function') {
    return value;
  }

  // Circular reference check for objects
  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
  }

  const typeTag = getTypeTag(value);

  if (typeTag === 'Set') {
    return {
      __brunoType: 'Set',
      __brunoValue: Array.from(value).map((item) => transformValue(item, seen))
    };
  }

  if (typeTag === 'Map') {
    return {
      __brunoType: 'Map',
      __brunoValue: Array.from(value.entries()).map(([k, v]) => [
        transformValue(k, seen),
        transformValue(v, seen)
      ])
    };
  }

  if (typeTag === 'Array') {
    return value.map((item) => transformValue(item, seen));
  }

  if (typeTag === 'Object') {
    const transformed = {};
    for (const [key, val] of Object.entries(value)) {
      transformed[key] = transformValue(val, seen);
    }
    return transformed;
  }

  // Handle functions - show clean wrapper
  if (typeTag === 'Function' || typeof value === 'function') {
    const name = value.name || 'anonymous';
    return `function ${name}() {\n    [native code]\n}`;
  }

  // Handle other built-in types (Date, RegExp, Error, etc.) - convert to string representation
  try {
    return value?.toString?.() ?? String(value);
  } catch {
    return `[${typeTag}]`;
  }
}

/**
 * Wraps a console object to add Set/Map support for logging
 * @param {Object} originalConsole - The original console object
 * @returns {Object} Wrapped console with Set/Map transformation
 */
function wrapConsoleWithSerializers(originalConsole) {
  if (!originalConsole) return originalConsole;

  const wrappedConsole = { ...originalConsole };

  // Wrap the console methods a script can call, so the extra logging methods
  // (table, dir, trace, ...) serialize Set/Map like the five core ones do.
  // Iterating the known method list instead of every own function property keeps
  // non-logging callables (a host console's Console, context, createTask)
  // untouched and still wraps methods a host console inherits.
  for (const method of CONSOLE_METHODS) {
    if (typeof originalConsole[method] === 'function') {
      wrappedConsole[method] = (...args) => {
        // console.assert's first argument is a condition, not a value to log:
        // transforming it would change its truthiness (a boxed empty string is
        // truthy, the primitive it would become is not).
        const transformedArgs = args.map((arg, index) =>
          method === 'assert' && index === 0 ? arg : transformValue(arg)
        );
        originalConsole[method](...transformedArgs);
      };
    }
  }

  return wrappedConsole;
}

module.exports = {
  wrapConsoleWithSerializers
};
