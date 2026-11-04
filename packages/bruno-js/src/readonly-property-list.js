/*
 * ReadOnlyPropertyList - A read-only collection data structure.
 *
 * Two modes:
 * - Static mode: items stored internally in an array (for headers, query params, etc.)
 * - Dynamic mode: a dataSource function returns fresh items on every read (for cookies)
 *
 * Items are plain objects with a configurable key property (keyProperty) and value property (valueProperty).
 *
 * This base class provides only read/search/iteration/transform methods.
 * See PropertyList for static-mode mutation methods.
 * See CookieList for async cookie-jar write methods.
 *
 * Convention:
 *   #field / #method  – truly private, inaccessible to subclasses
 *   _field / _method  – protected, intended for subclass access only
 */

/**
 * A list of `{ key, value }` entries, with lookups by key, search, iteration and conversion.
 * @template T
 */
class ReadOnlyPropertyList {
  // ── Private fields (not accessible by subclasses) ────────────────────
  #valueProperty;
  #dataSource;

  /**
   * @param {object} options
   * @param {string} [options.keyProperty='key'] - The property name used as the unique key
   * @param {string} [options.valueProperty='value'] - The property name used as the value
   * @param {Function} [options.dataSource] - Dynamic data source function (returns array of items)
   * @param {Array} [options.items] - Initial items for static mode
   */
  // Items are stored in an array (not a Map) to support positional access (idx, indexOf),
  // ordered insertion (insert, insertAfter, prepend in PropertyList), and duplicate keys.
  // At typical list sizes (cookies, headers) the O(n) key lookup is negligible.
  constructor({ keyProperty = 'key', valueProperty = 'value', dataSource, items } = {}) {
    /** @protected */
    this._keyProperty = keyProperty;
    this.#valueProperty = valueProperty;
    /** @protected */
    this._dynamic = typeof dataSource === 'function';
    if (this._dynamic) {
      this.#dataSource = dataSource;
    } else {
      /** @protected */
      this._items = Array.isArray(items) ? [...items] : [];
    }
  }

  /**
   * Returns the current list of items.
   * In dynamic mode, calls the dataSource function.
   * In static mode, returns the internal array.
   */
  #getItems() {
    return this._dynamic ? this.#dataSource() : this._items;
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /**
   * Get the value of the entry with the given key.
   *
   * Keys are case-sensitive. With several entries of that key, the last one wins.
   * @param {string} name - The key.
   * @returns {any} The value, or `undefined` when no entry has that key.
   * @example
   * const sessionId = bru.cookies.get('sid');
   * @category Read
   */
  get(name) {
    const items = this.#getItems();
    // Use findLast so that duplicate keys resolve to the last entry,
    // consistent with toObject() which also gives last-wins semantics.
    const item = items.findLast((i) => i[this._keyProperty] === name);
    return item ? item[this.#valueProperty] : undefined;
  }

  /**
   * Get the entry with the given key.
   *
   * Keys are case-sensitive. With several entries of that key, the last one wins.
   * @param {string} name - The key.
   * @returns {T | undefined} The entry, or `undefined` when no entry has that key.
   * @category Read
   */
  one(name) {
    const items = this.#getItems();
    // Use findLast so that duplicate keys resolve to the last entry,
    // consistent with get() and toObject() which also give last-wins semantics.
    return items.findLast((i) => i[this._keyProperty] === name);
  }

  /**
   * Get every entry, in order.
   * @returns {T[]} A new array of the entries.
   * @category Read
   */
  all() {
    return [...this.#getItems()];
  }

  /**
   * Get the entry at a position in the list.
   * @param {number} index - The zero-based position.
   * @returns {T | undefined} The entry, or `undefined` when the list is shorter.
   * @category Read
   */
  idx(index) {
    return this.#getItems()[index];
  }

  /**
   * Get the number of entries.
   * @returns {number} The number of entries.
   * @category Read
   */
  count() {
    return this.#getItems().length;
  }

  /**
   * Get the position of an entry.
   *
   * Matches an entry with the same key and value, so a copy of an entry finds it too.
   * @param {T} item - An entry.
   * @returns {number} The zero-based position, or `-1` when no entry matches.
   * @category Search
   */
  indexOf(item) {
    if (!item || typeof item !== 'object') return -1;
    const items = this.#getItems();
    const keyProp = this._keyProperty;
    return items.findIndex(
      (i) => i[keyProp] === item[keyProp] && i[this.#valueProperty] === item[this.#valueProperty]
    );
  }

  // ── Search ─────────────────────────────────────────────────────────────

  /**
   * Check whether an entry with the given key exists.
   *
   * Keys are case-sensitive.
   * @param {string} name - The key.
   * @param {any} [value] - When given, the entry's value must also be equal (`===`) to it.
   * @returns {boolean} Whether a matching entry exists.
   * @example
   * if (!bru.cookies.has('sid')) {
   *   bru.setVar('loggedIn', false);
   * }
   * @category Search
   */
  has(name, value) {
    const items = this.#getItems();
    if (value !== undefined) {
      return items.some((i) => i[this._keyProperty] === name && i[this.#valueProperty] === value);
    }
    return items.some((i) => i[this._keyProperty] === name);
  }

  /**
   * Get the first entry `predicate` accepts.
   * @param {(item: T, index: number) => boolean} predicate - Called with each entry and its position.
   * @returns {T | undefined} The entry, or `undefined` when none matches.
   * @category Search
   */
  find(predicate) {
    return this.#getItems().find(predicate);
  }

  /**
   * Get every entry `predicate` accepts.
   * @param {(item: T, index: number) => boolean} predicate - Called with each entry and its position.
   * @returns {T[]} The matching entries, in order.
   * @category Search
   */
  filter(predicate) {
    return this.#getItems().filter(predicate);
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  /**
   * Call `fn` once for each entry, in order.
   * @param {(item: T, index: number) => void} fn - Called with each entry and its position.
   * @category Iteration
   */
  each(fn) {
    this.#getItems().forEach(fn);
  }

  /**
   * Build an array from the result of `fn` for each entry.
   * @param {(item: T, index: number) => any} fn - Called with each entry and its position.
   * @returns {any[]} The results, in the order of the entries.
   * @example
   * const names = bru.cookies.map((cookie) => cookie.key);
   * @category Iteration
   */
  map(fn) {
    return this.#getItems().map(fn);
  }

  /**
   * Combine the entries into a single value, as `Array.prototype.reduce` does.
   *
   * Without `initialValue`, the first entry is the starting value, and an empty list throws.
   * @type {(fn: (accumulator: any, item: T, index: number) => any, initialValue?: any) => any}
   * @param fn - Called with the value so far, each entry and its position; returns the next value.
   * @param initialValue - The starting value.
   * @category Iteration
   */
  reduce(fn, ...rest) {
    return rest.length ? this.#getItems().reduce(fn, rest[0]) : this.#getItems().reduce(fn);
  }

  // ── Transformation ─────────────────────────────────────────────────────

  /**
   * Convert the entries to a `{ key: value }` object.
   *
   * With several entries of one key, the last one wins.
   * @returns {Record<string, any>} The object.
   * @category Transform
   */
  toObject() {
    const result = {};
    for (const item of this.#getItems()) {
      result[item[this._keyProperty]] = item[this.#valueProperty];
    }
    return result;
  }

  /**
   * Convert the entries to a `key=value; key2=value2` string.
   * @returns {string} The string, or `''` for an empty list.
   * @category Transform
   */
  toString() {
    return this.#getItems()
      .map((i) => `${i[this._keyProperty]}=${i[this.#valueProperty]}`)
      .join('; ');
  }

  /**
   * Get the entries for `JSON.stringify`, the same as `all()`.
   * @returns {T[]} A new array of the entries.
   * @category Transform
   */
  toJSON() {
    return this.all();
  }

  /**
   * Check if an object is an instance of ReadOnlyPropertyList.
   * @param {*} obj
   * @returns {boolean}
   */
  static isPropertyList(obj) {
    return obj instanceof ReadOnlyPropertyList;
  }
}

module.exports = ReadOnlyPropertyList;
