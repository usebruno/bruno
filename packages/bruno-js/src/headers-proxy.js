/**
 * Wraps a PropertyList (or ReadOnlyPropertyList) in a Proxy that provides
 * backward-compatible bracket access for headers.
 *
 * This allows both the new PropertyList API and the old plain-object API
 * to work on the same object:
 *
 *   // New API
 *   req.headers.get('Content-Type')
 *   req.headers.all()
 *
 *   // Old API (backward compatible)
 *   req.headers['Content-Type']
 *   Object.keys(req.headers)
 *   req.headers['X-Custom'] = 'value'
 *   delete req.headers['X-Custom']
 *
 * @param {ReadOnlyPropertyList} propertyList - The PropertyList instance to wrap
 * @param {object} rawHeaders - The underlying plain headers object for bracket access
 * @param {object} [options]
 * @param {Function} [options.onSet] - Called with (name, value) on bracket assignment
 * @param {Function} [options.onDelete] - Called with (name) on bracket deletion
 * @returns {Proxy} A proxy that supports both PropertyList methods and bracket access
 */
const createHeadersProxy = (propertyList, rawHeadersOrGetter, options = {}) => {
  const { onSet, onDelete } = options;
  const getRawHeaders = typeof rawHeadersOrGetter === 'function'
    ? rawHeadersOrGetter
    : () => rawHeadersOrGetter;

  return new Proxy(propertyList, {
    get(target, prop, receiver) {
      // Symbol properties and prototype chain — always delegate to the target
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }

      // PropertyList methods and internal properties take precedence
      if (prop in target) {
        const value = Reflect.get(target, prop, receiver);
        // Bind methods so `this` stays correct
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }

      // Fall through to raw headers for bracket access
      return getRawHeaders()[prop];
    },

    set(target, prop, value) {
      // Internal/private properties go on the target
      if (typeof prop === 'symbol' || prop.startsWith('_')) {
        target[prop] = value;
        return true;
      }

      // Known PropertyList properties go on the target
      if (prop in target) {
        target[prop] = value;
        return true;
      }

      // Everything else is a header assignment
      if (onSet) {
        onSet(prop, value);
      } else {
        getRawHeaders()[prop] = value;
      }
      return true;
    },

    deleteProperty(target, prop) {
      if (typeof prop === 'string') {
        if (onDelete) {
          onDelete(prop);
        } else {
          delete getRawHeaders()[prop];
        }
      }
      return true;
    },

    has(target, prop) {
      if (prop in target) return true;
      return prop in getRawHeaders();
    },

    ownKeys() {
      return Object.keys(getRawHeaders());
    },

    getOwnPropertyDescriptor(target, prop) {
      const rawHeaders = getRawHeaders();
      if (prop in rawHeaders) {
        return {
          configurable: true,
          enumerable: true,
          value: rawHeaders[prop],
          writable: true
        };
      }
      return Object.getOwnPropertyDescriptor(target, prop);
    }
  });
};

module.exports = { createHeadersProxy };
