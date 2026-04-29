const PropertyList = require('./property-list');

const variableNameRegex = /^[\w-.]*$/;

/**
 * VariableList — a PropertyList adapter for Bruno's variable scopes.
 *
 * Wraps a plain `{ key: value }` object (e.g. runtimeVariables, envVariables,
 * globalEnvironmentVariables) and exposes the full PropertyList read interface
 * plus synchronous write methods that mutate the original object in place.
 *
 * Runs in **dynamic mode**: a dataSource function converts the object to
 * `[{ key, value }]` items on every read, so reads always reflect the latest state
 * (including mutations made through the legacy bru.setVar() / bru.setEnvVar() path).
 *
 * @example
 * const list = new VariableList(runtimeVariables, {
 *   interpolateFn: (val) => bru.interpolate(val)
 * });
 * list.set('host', 'example.com');
 * list.get('host');       // 'example.com' (interpolated)
 * list.has('host');       // true
 * list.toObject();       // { host: 'example.com' }
 * list.unset('host');
 */
class VariableList extends PropertyList {
  /**
   * @param {object} variablesObj - The plain { key: value } object to wrap (mutated in place)
   * @param {object} [options]
   * @param {Function} [options.interpolateFn] - Interpolation function (bru.interpolate)
   * @param {Function} [options.validateKey] - Custom key validation function (throws on invalid)
   * @param {string[]} [options.filterKeys] - Internal keys to exclude from reads (e.g. ['__name__'])
   * @param {Function} [options.onSet] - Callback after set: (key, value, options) => void
   */
  constructor(variablesObj, { interpolateFn, validateKey, filterKeys, onSet } = {}) {
    super({
      keyProperty: 'key',
      valueProperty: 'value',
      dataSource: () => {
        return Object.entries(variablesObj)
          .filter(([k]) => !filterKeys || !filterKeys.includes(k))
          .map(([key, value]) => ({ key, value }));
      }
    });
    this._variablesObj = variablesObj;
    this._interpolateFn = interpolateFn || ((v) => v);
    this._validateKeyFn = validateKey || null;
    this._filterKeys = filterKeys || [];
    this._onSet = onSet || null;
  }

  // ── Read overrides ──────────────────────────────────────────────────

  /**
   * Get the interpolated value of a variable by key.
   * @param {string} key
   * @returns {*} The interpolated value, or undefined if not found
   */
  get(key) {
    return this._interpolateFn(this._variablesObj[key]);
  }

  // ── Write methods ───────────────────────────────────────────────────

  /**
   * Set a variable. Validates the key name and mutates the underlying object.
   * @param {string} key
   * @param {*} value
   * @param {object} [options] - Optional options (e.g. { persist: true } for env vars)
   */
  set(key, value, options) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }
    this.#validateKey(key);
    this._variablesObj[key] = value;
    if (this._onSet) {
      this._onSet(key, value, options);
    }
  }

  /**
   * Remove a variable by key.
   * @param {string} key
   */
  unset(key) {
    delete this._variablesObj[key];
  }

  /**
   * Remove all variables. Preserves keys listed in filterKeys.
   */
  clear() {
    for (const key of Object.keys(this._variablesObj)) {
      if (!this._filterKeys.includes(key)) {
        delete this._variablesObj[key];
      }
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────

  #validateKey(key) {
    if (this._validateKeyFn) {
      this._validateKeyFn(key);
      return;
    }
    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!`
        + ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }
  }
}

module.exports = VariableList;
