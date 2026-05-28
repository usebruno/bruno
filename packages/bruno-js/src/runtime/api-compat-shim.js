/**
 * Runtime backward-compatibility shim for deprecated Bruno scripting APIs.
 *
 * Uses JavaScript Proxy to intercept access to deprecated properties on the `bru` object,
 * log a deprecation warning to the Bruno console, and transparently forward to the new API.
 *
 * This means old scripts keep working with zero changes -- users see deprecation
 * warnings in the console panel and can migrate at their own pace.
 *
 * For QuickJS (which may not support Proxy), use createExplicitShim() instead,
 * which defines deprecated methods as explicit function properties.
 */

/**
 * Build a shim lookup map from migration entries.
 * Extracts top-level property names from 'bru.xxx' patterns.
 *
 * @param {Array} migrations - Migration entries from the registry
 * @returns {Object} Map of { deprecatedProp: { newPath, doc } }
 */
function buildShimMap(migrations) {
  const shimMap = {};

  for (const migration of migrations) {
    for (const [oldPath, newPath] of Object.entries(migration.simpleTranslations)) {
      if (!oldPath.startsWith('bru.')) continue;

      const oldProp = oldPath.slice(4); // strip 'bru.'
      const newProp = newPath.slice(4); // strip 'bru.'

      // Only shim top-level properties (e.g., 'getEnvVar', not 'env.get')
      // Nested paths like 'runner.skipRequest' are accessed through sub-objects
      if (!oldProp.includes('.')) {
        shimMap[oldProp] = {
          newPath: newProp,
          doc: migration.docs[oldPath] || null
        };
      }
    }
  }

  return shimMap;
}

/**
 * Resolve a dotted path like 'env.get' on an object.
 * Returns functions bound to their parent so `this` context is preserved.
 *
 * @param {Object} obj - The root object
 * @param {string} path - Dotted path (e.g., 'env.get')
 * @returns {*} The resolved value, with functions bound to their parent
 */
function resolveNestedPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  let parent = obj;

  for (const part of parts) {
    parent = current;
    current = current[part];
    if (current === undefined) return undefined;
  }

  if (typeof current === 'function') {
    return current.bind(parent);
  }
  return current;
}

/**
 * Create a Proxy-based backward-compatibility shim for the `bru` object.
 * Intercepts deprecated property access, logs warnings, and forwards to new APIs.
 *
 * Use this for the NodeVM sandbox which supports Proxy.
 *
 * @param {Object} bru - The real Bru instance
 * @param {Function} onDeprecationWarning - Callback invoked with { deprecated, replacement, message }
 * @param {Array} migrations - Applicable migration entries from the registry
 * @returns {Proxy} Proxied bru object
 */
function createCompatShim(bru, onDeprecationWarning, migrations) {
  const shimMap = buildShimMap(migrations);

  if (Object.keys(shimMap).length === 0) {
    return bru; // No shims needed
  }

  return new Proxy(bru, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && shimMap[prop]) {
        const { newPath, doc } = shimMap[prop];
        const message = doc?.reason || `bru.${prop} is deprecated, use bru.${newPath} instead`;

        onDeprecationWarning({
          deprecated: `bru.${prop}`,
          replacement: `bru.${newPath}`,
          message
        });

        return resolveNestedPath(target, newPath);
      }

      return Reflect.get(target, prop, receiver);
    }
  });
}

/**
 * Create explicit deprecated method aliases on the `bru` object.
 * Use this for QuickJS sandbox which may not support Proxy.
 *
 * Adds deprecated methods directly to the bru object that delegate
 * to the new methods and log warnings.
 *
 * @param {Object} bru - The Bru instance to augment
 * @param {Function} onDeprecationWarning - Warning callback
 * @param {Array} migrations - Applicable migration entries
 * @returns {Object} The same bru object, augmented with deprecated aliases
 */
function createExplicitShim(bru, onDeprecationWarning, migrations) {
  const shimMap = buildShimMap(migrations);

  for (const [oldProp, { newPath, doc }] of Object.entries(shimMap)) {
    // Don't overwrite if the old method still exists natively
    if (bru[oldProp] !== undefined) continue;

    const message = doc?.reason || `bru.${oldProp} is deprecated, use bru.${newPath} instead`;

    Object.defineProperty(bru, oldProp, {
      get() {
        onDeprecationWarning({
          deprecated: `bru.${oldProp}`,
          replacement: `bru.${newPath}`,
          message
        });

        return resolveNestedPath(bru, newPath);
      },
      configurable: true,
      enumerable: false
    });
  }

  return bru;
}

module.exports = {
  createCompatShim,
  createExplicitShim,
  buildShimMap,
  resolveNestedPath
};
