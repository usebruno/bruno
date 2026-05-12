const variableNameRegex = /^[\w-.]*$/;

/**
 * VariableList — the `bru.variables` / `bru.environment` / `bru.globals` API in scripts.
 *
 * A standalone key-value store that wraps a plain `{ key: value }` object
 * (e.g. runtimeVariables, envVariables, globalEnvironmentVariables) and exposes
 * the standard variable scope interface: get, set, has, unset, clear, toObject.
 *
 * Write methods mutate the original object in place. Reads always reflect
 * the latest state (including mutations made through the legacy bru.setVar() / bru.setEnvVar() paths).
 *
 * @example
 * const list = new VariableList(runtimeVariables, {
 *   interpolateFn: (val) => bru.interpolate(val)
 * });
 * list.set('host', 'example.com');
 * list.get('host');       // 'example.com' (interpolated)
 * list.has('host');       // true
 * list.toObject();        // { host: 'example.com' }
 * list.unset('host');
 */
class VariableList {
  /**
   * @param {object} variablesObj - The plain { key: value } object to wrap (mutated in place)
   * @param {object} [options]
   * @param {Function} [options.interpolateFn] - Interpolation function (bru.interpolate)
   * @param {Function} [options.validateKey] - Custom key validation function (throws on invalid)
   * @param {string[]} [options.filterKeys] - Internal keys to exclude from reads (e.g. ['__name__'])
   */
  constructor(variablesObj, { interpolateFn, validateKey, filterKeys } = {}) {
    this._variablesObj = variablesObj;
    this._interpolateFn = interpolateFn || ((v) => v);
    this._validateKeyFn = validateKey || null;
    this._filterKeys = filterKeys || [];
  }

  // ── Read methods ────────────────────────────────────────────────────

  /**
   * Get the interpolated value of a variable by key.
   * @param {string} key
   * @returns {*} The interpolated value, or undefined if not found
   */
  get(key) {
    return this._interpolateFn(this._variablesObj[key]);
  }

  /**
   * Check if a variable exists by key.
   * Returns false for keys in filterKeys.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    if (this._filterKeys.includes(key)) return false;
    return key in this._variablesObj;
  }

  /**
   * Convert all variables to a plain { key: value } object.
   * Excludes keys listed in filterKeys.
   * @returns {object}
   */
  toObject() {
    const result = {};
    for (const [k, v] of Object.entries(this._variablesObj)) {
      if (!this._filterKeys.includes(k)) {
        result[k] = v;
      }
    }
    return result;
  }

  // ── Write methods ───────────────────────────────────────────────────

  /**
   * Set a variable. Validates the key name and mutates the underlying object.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }
    if (this._filterKeys.includes(key)) {
      throw new Error(`Variable name: "${key}" is a reserved internal variable and cannot be modified.`);
    }
    this.#validateKey(key);
    this._variablesObj[key] = value;
  }

  /**
   * Remove a variable by key.
   * @param {string} key
   */
  unset(key) {
    if (this._filterKeys.includes(key)) {
      throw new Error(`Variable name: "${key}" is a reserved internal variable and cannot be modified.`);
    }
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
