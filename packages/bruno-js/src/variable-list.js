const variableNameRegex = /^[\w-.]*$/;

/**
 * VariableList — extends Array to provide a list of { key, value } variable entries
 * with domain-specific methods (get, set, has, delete, clear, toObject).
 *
 * Returned by `bru.getVarList()`, `bru.getEnvVarList()`, `bru.getGlobalEnvVarList()`.
 *
 * Since it extends Array, all standard array methods (find, filter, map, forEach, etc.)
 * work out of the box. Symbol.species is set to Array so derived methods return plain arrays.
 *
 * @example
 * const list = bru.getEnvVarList();
 * list.set('host', 'example.com');
 * list.get('host');       // 'example.com' (interpolated)
 * list.has('host');       // true
 * list.toObject();        // { host: 'example.com' }
 * list.filter(e => e.key.startsWith('h')); // plain Array
 */
class VariableList extends Array {
  // Derived methods (filter, map, slice, etc.) return plain Arrays, not VariableLists.
  static get [Symbol.species]() {
    return Array;
  }

  /**
   * @param {object|Array<{key: string, value: *}>} variables - Plain object or array of {key, value}
   * @param {object} [options]
   * @param {Function} [options.interpolateFn] - Interpolation function (bru.interpolate)
   * @param {Function} [options.validateKey] - Custom key validation function (throws on invalid)
   * @param {string[]} [options.filterKeys] - Internal keys to exclude from the array (e.g. ['__name__'])
   */
  constructor(variables, { interpolateFn, validateKey, filterKeys } = {}) {
    const filterList = filterKeys || [];
    let entries;
    if (Array.isArray(variables)) {
      entries = variables;
    } else {
      entries = Object.entries(variables || {})
        .filter(([key]) => !filterList.includes(key))
        .map(([key, value]) => ({ key, value }));
    }

    super(...entries);

    this._variablesObj = Array.isArray(variables) ? null : variables;
    this._interpolateFn = interpolateFn || ((v) => v);
    this._validateKeyFn = validateKey || null;
    this._filterKeys = filterList;
  }

  // ── Read methods ────────────────────────────────────────────────────

  /**
   * Get the interpolated value of a variable by key.
   * @param {string} key
   * @returns {*} The interpolated value, or undefined if not found
   */
  get(key) {
    this.#syncFromObject();
    const entry = this.find((e) => e.key === key);
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
    const entry = this.find((e) => e.key === key);
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
    for (const { key, value } of this) {
      if (!this._filterKeys.includes(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Returns a plain array copy of entries (for QuickJS bridge).
   * @returns {Array<{key: string, value: *}>}
   */
  _getEntries() {
    this.#syncFromObject();
    return [...this];
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

    const entry = this.find((e) => e.key === key);
    if (entry) {
      entry.value = value;
    } else {
      this.push({ key, value });
    }
    this.#syncToObject();
  }

  /**
   * Remove a variable by key.
   * @param {string} key
   */
  delete(key) {
    if (this._filterKeys.includes(key)) {
      throw new Error(`Variable name: "${key}" is a reserved internal variable and cannot be modified.`);
    }
    const idx = this.findIndex((e) => e.key === key);
    if (idx !== -1) {
      this.splice(idx, 1);
    }
    this.#syncToObject();
  }

  /**
   * Remove all variables. Preserves keys listed in filterKeys.
   */
  clear() {
    const kept = this.filter((e) => this._filterKeys.includes(e.key));
    this.length = 0;
    for (const entry of kept) {
      this.push(entry);
    }
    this.#syncToObject();
  }

  // ── Internal helpers ────────────────────────────────────────────────

  /**
   * Sync from the legacy object into the array.
   * Handles mutations made through legacy bru.setVar() / bru.setEnvVar() paths.
   * No-op when constructed with an array (no legacy object to sync from).
   */
  #syncFromObject() {
    if (!this._variablesObj) return;
    const objKeys = new Set(
      Object.keys(this._variablesObj).filter((k) => !this._filterKeys.includes(k))
    );
    // Remove entries that no longer exist in the object
    for (let i = this.length - 1; i >= 0; i--) {
      if (!objKeys.has(this[i].key)) {
        this.splice(i, 1);
      }
    }
    // Update existing and add new entries
    for (const key of objKeys) {
      const value = this._variablesObj[key];
      const entry = this.find((e) => e.key === key);
      if (entry) {
        entry.value = value;
      } else {
        this.push({ key, value });
      }
    }
  }

  /**
   * Sync the array back to the legacy object.
   * No-op when constructed with an array (no legacy object to sync to).
   */
  #syncToObject() {
    if (!this._variablesObj) return;
    // Remove all non-filterKey keys from the object
    for (const key of Object.keys(this._variablesObj)) {
      if (!this._filterKeys.includes(key)) {
        delete this._variablesObj[key];
      }
    }
    // Write back from array
    for (const { key, value } of this) {
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
