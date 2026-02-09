/**
 * ReadOnlyPropertyList - A read-only collection data structure.
 *
 * Two modes:
 * - Static mode: items stored internally in an array (for headers, query params, etc.)
 * - Dynamic mode: a dataSource function returns fresh items on every read (for cookies)
 *
 * Items are plain objects with a key property (configurable via keyProperty).
 *
 * This base class provides only read/search/iteration/transform methods.
 * See PropertyList for static-mode mutation methods.
 * See CookieList for async cookie-jar write methods.
 */
class ReadOnlyPropertyList {
  /**
   * @param {object} options
   * @param {string} [options.keyProperty='key'] - The property name used as the unique key
   * @param {Function} [options.dataSource] - Dynamic data source function (returns array of items)
   * @param {Array} [options.items] - Initial items for static mode
   */
  constructor({ keyProperty = 'key', dataSource, items } = {}) {
    this._keyProperty = keyProperty;
    this._dynamic = typeof dataSource === 'function';
    if (this._dynamic) {
      this._dataSource = dataSource;
    } else {
      this._items = Array.isArray(items) ? [...items] : [];
    }
  }

  /**
   * Returns the current list of items.
   * In dynamic mode, calls the dataSource function.
   * In static mode, returns the internal array.
   */
  _getItems() {
    return this._dynamic ? this._dataSource() : this._items;
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /**
   * Get the value of an item by its key.
   * @param {string} name
   * @returns {*} The value property of the matching item, or undefined
   */
  get(name) {
    const items = this._getItems();
    const item = items.find((i) => i[this._keyProperty] === name);
    return item ? item.value : undefined;
  }

  /**
   * Get the full item object by its key.
   * @param {string} name
   * @returns {object|undefined}
   */
  one(name) {
    const items = this._getItems();
    return items.find((i) => i[this._keyProperty] === name);
  }

  /**
   * Get a cloned array of all items.
   * @returns {Array}
   */
  all() {
    return [...this._getItems()];
  }

  /**
   * Get an item by its positional index.
   * @param {number} index
   * @returns {object|undefined}
   */
  idx(index) {
    return this._getItems()[index];
  }

  /**
   * Get the number of items.
   * @returns {number}
   */
  count() {
    return this._getItems().length;
  }

  /**
   * Get the index of an item (by reference equality).
   * @param {object} item
   * @returns {number} -1 if not found
   */
  indexOf(item) {
    return this._getItems().indexOf(item);
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
    const items = this._getItems();
    if (value !== undefined) {
      return items.some((i) => i[this._keyProperty] === name && i.value === value);
    }
    return items.some((i) => i[this._keyProperty] === name);
  }

  /**
   * Find the first item matching a predicate.
   * @param {Function} predicate
   * @returns {object|undefined}
   */
  find(predicate) {
    return this._getItems().find(predicate);
  }

  /**
   * Filter items by a predicate.
   * @param {Function} predicate
   * @returns {Array}
   */
  filter(predicate) {
    return this._getItems().filter(predicate);
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  /**
   * Iterate over each item.
   * @param {Function} fn - Called with (item, index)
   */
  each(fn) {
    this._getItems().forEach(fn);
  }

  /**
   * Map over items.
   * @param {Function} fn
   * @returns {Array}
   */
  map(fn) {
    return this._getItems().map(fn);
  }

  /**
   * Reduce items.
   * @param {Function} fn
   * @param {*} acc - Initial accumulator
   * @returns {*}
   */
  reduce(fn, acc) {
    return this._getItems().reduce(fn, acc);
  }

  // ── Transformation ─────────────────────────────────────────────────────

  /**
   * Convert to a plain object { key: value }.
   * @returns {object}
   */
  toObject() {
    const result = {};
    for (const item of this._getItems()) {
      result[item[this._keyProperty]] = item.value;
    }
    return result;
  }

  /**
   * Convert to a string "key=value; key2=value2".
   * @returns {string}
   */
  toString() {
    return this._getItems()
      .map((i) => `${i[this._keyProperty]}=${i.value}`)
      .join('; ');
  }
}

module.exports = ReadOnlyPropertyList;
