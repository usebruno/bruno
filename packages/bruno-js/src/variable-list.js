const variableNameRegex = /^[\w-.]*$/;

/**
 * VariableList — the `bru.variables` / `bru.environment` / `bru.globals` API in scripts.
 *
 * Internally stores variables as an array of { key, value } entries.
 * Accepts either a plain object or an array as input — objects are converted to array form.
 * Write methods sync back to the original object (for legacy compatibility)
 * until upstream callers switch to passing arrays directly.
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
   * @param {object|Array<{key: string, value: *}>} variables - Plain object or array of {key, value}
   * @param {object} [options]
   * @param {Function} [options.interpolateFn] - Interpolation function (bru.interpolate)
   * @param {Function} [options.validateKey] - Custom key validation function (throws on invalid)
   * @param {string[]} [options.filterKeys] - Internal keys to exclude from reads (e.g. ['__name__'])
   */
  constructor(variables, { interpolateFn, validateKey, filterKeys } = {}) {
    if (Array.isArray(variables)) {
      this._entries = variables;
      this._variablesObj = null;
    } else {
      this._variablesObj = variables;
      this._entries = Object.entries(variables).map(([key, value]) => ({ key, value }));
    }
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
    this.#syncFromObject();
    const entry = this._entries.find((e) => e.key === key);
    return this._interpolateFn(entry ? entry.value : undefined);
  }

  /**
   * Check if a variable exists by key, optionally matching a value.
   * Returns false for keys in filterKeys.
   * @param {string} key
   * @param {*} [value] - If provided, also checks that the stored value equals this
   * @returns {boolean}
   */
  has(key, value) {
    if (this._filterKeys.includes(key)) return false;
    this.#syncFromObject();
    const entry = this._entries.find((e) => e.key === key);
    if (!entry) return false;
    if (arguments.length > 1) {
      return entry.value === value;
    }
    return true;
  }

  /**
   * Convert all variables to a plain { key: value } object.
   * Excludes keys listed in filterKeys.
   * @returns {object}
   */
  toObject() {
    this.#syncFromObject();
    const result = {};
    for (const { key, value } of this._entries) {
      if (!this._filterKeys.includes(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  // ── Write methods ───────────────────────────────────────────────────

  /**
   * Set a variable. Validates the key name and mutates the underlying store.
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

    const entry = this._entries.find((e) => e.key === key);
    if (entry) {
      entry.value = value;
    } else {
      this._entries.push({ key, value });
    }
    this.#syncToObject();
  }

  /**
   * Remove a variable by key.
   * @param {string} key
   */
  unset(key) {
    if (this._filterKeys.includes(key)) {
      throw new Error(`Variable name: "${key}" is a reserved internal variable and cannot be modified.`);
    }
    const idx = this._entries.findIndex((e) => e.key === key);
    if (idx !== -1) {
      this._entries.splice(idx, 1);
    }
    this.#syncToObject();
  }

  /**
   * Remove all variables. Preserves keys listed in filterKeys.
   */
  clear() {
    this._entries = this._entries.filter((e) => this._filterKeys.includes(e.key));
    this.#syncToObject();
  }

  // ── Internal helpers ────────────────────────────────────────────────

  /**
   * Sync from the legacy object into the internal array.
   * Handles mutations made through legacy bru.setVar() / bru.setEnvVar() paths.
   * No-op when constructed with an array (no legacy object to sync from).
   */
  #syncFromObject() {
    if (!this._variablesObj) return;
    const objKeys = new Set(Object.keys(this._variablesObj));
    // Remove entries that no longer exist in the object
    this._entries = this._entries.filter((e) => objKeys.has(e.key));
    // Update existing and add new entries
    for (const [key, value] of Object.entries(this._variablesObj)) {
      const entry = this._entries.find((e) => e.key === key);
      if (entry) {
        entry.value = value;
      } else {
        this._entries.push({ key, value });
      }
    }
  }

  /**
   * Sync the internal array back to the legacy object.
   * No-op when constructed with an array (no legacy object to sync to).
   */
  #syncToObject() {
    if (!this._variablesObj) return;
    // Remove all keys from the object
    for (const key of Object.keys(this._variablesObj)) {
      delete this._variablesObj[key];
    }
    // Write back from array
    for (const { key, value } of this._entries) {
      this._variablesObj[key] = value;
    }
  }

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
