/**
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
    this._keyProperty = keyProperty;
    this.#valueProperty = valueProperty;
    this._dynamic = typeof dataSource === 'function';
    if (this._dynamic) {
      this.#dataSource = dataSource;
    } else {
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
   * Get the value of an item by its key.
   * @param {string} name
   * @returns {*} The value property of the matching item, or undefined
   */
  get(name) {
    const items = this.#getItems();
    // Use findLast so that duplicate keys resolve to the last entry,
    // consistent with toObject() which also gives last-wins semantics.
    const item = items.findLast((i) => i[this._keyProperty] === name);
    return item ? item[this.#valueProperty] : undefined;
  }

  /**
   * Get the full item object by its key.
   * @param {string} name
   * @returns {object|undefined}
   */
  one(name) {
    const items = this.#getItems();
    // Use findLast so that duplicate keys resolve to the last entry,
    // consistent with get() and toObject() which also give last-wins semantics.
    return items.findLast((i) => i[this._keyProperty] === name);
  }

  /**
   * Get a cloned array of all items.
   * @returns {Array}
   */
  all() {
    return [...this.#getItems()];
  }

  /**
   * Get an item by its positional index.
   * @param {number} index
   * @returns {object|undefined}
   */
  idx(index) {
    return this.#getItems()[index];
  }

  /**
   * Get the number of items.
   * @returns {number}
   */
  count() {
    return this.#getItems().length;
  }

  /**
   * Get the index of an item.
   * Uses structural equality (matching by key and value) so it works
   * even when the item is a copy rather than the same reference.
   * @param {object} item
   * @returns {number} -1 if not found
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
   * Check if an item with the given key exists.
   * If value is provided, also checks that the item's value matches.
   * @param {string} name
   * @param {*} [value]
   * @returns {boolean}
   */
  has(name, value) {
    const items = this.#getItems();
    if (value !== undefined) {
      return items.some((i) => i[this._keyProperty] === name && i[this.#valueProperty] === value);
    }
    return items.some((i) => i[this._keyProperty] === name);
  }

  /**
   * Find the first item matching a predicate.
   * @param {Function} predicate
   * @returns {object|undefined}
   */
  find(predicate) {
    return this.#getItems().find(predicate);
  }

  /**
   * Filter items by a predicate.
   * @param {Function} predicate
   * @returns {Array}
   */
  filter(predicate) {
    return this.#getItems().filter(predicate);
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  /**
   * Iterate over each item.
   * @param {Function} fn - Called with (item, index)
   */
  each(fn) {
    this.#getItems().forEach(fn);
  }

  /**
   * Map over items.
   * @param {Function} fn
   * @returns {Array}
   */
  map(fn) {
    return this.#getItems().map(fn);
  }

  /**
   * Reduce items.
   * @param {Function} fn
   * @param {*} [initialValue] - Optional initial accumulator value
   * @returns {*}
   */
  reduce(fn, ...rest) {
    return rest.length ? this.#getItems().reduce(fn, rest[0]) : this.#getItems().reduce(fn);
  }

  // ── Transformation ─────────────────────────────────────────────────────

  /**
   * Convert to a plain object { key: value }.
   * @returns {object}
   */
  toObject() {
    const result = {};
    for (const item of this.#getItems()) {
      result[item[this._keyProperty]] = item[this.#valueProperty];
    }
    return result;
  }

  /**
   * Convert to a string "key=value; key2=value2".
   * @returns {string}
   */
  toString() {
    return this.#getItems()
      .map((i) => `${i[this._keyProperty]}=${i[this.#valueProperty]}`)
      .join('; ');
  }

  /**
   * Convert to JSON (returns the same as all()).
   * @returns {Array}
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
