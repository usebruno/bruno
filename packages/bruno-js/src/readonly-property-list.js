/**
 * ReadOnlyPropertyList - A read-only collection data structure.
 *
 * Two modes:
 * - Static mode: items stored internally in an array (for response headers, etc.)
 * - Dynamic mode: a dataSource function returns fresh items on every read (for cookies, request headers)
 *
 * Items are plain objects with a configurable key property (keyProperty) and value property (valueProperty).
 *
 * This base class provides only read/search/iteration/transform methods, plus opt-in knobs
 * subclasses share: case-insensitive key matching, iterator context binding and a writable guard.
 *
 * Class hierarchy (every list extends the base directly):
 *   ReadOnlyPropertyList   (read-only, both modes)
 *     ├── HeaderList       (sync writes to the request's headers)
 *     ├── GrpcMetadataList (sync writes to the gRPC request's metadata)
 *     ├── CookieList       (async add/upsert/remove/clear/delete against the cookie jar)
 *     └── PropertyList     (generic array-owning list with sync mutations; kept for reference, no runtime consumer)
 *
 * Convention:
 *   #field / #method  – truly private, inaccessible to subclasses
 *   _field / _method  – protected, intended for subclass access only
 */
class ReadOnlyPropertyList {
  // ── Private fields (not accessible by subclasses) ────────────────────
  #dataSource;

  /**
   * @param {object} options
   * @param {string} [options.keyProperty='key'] - The property name used as the unique key
   * @param {string} [options.valueProperty='value'] - The property name used as the value
   * @param {Array} [options.items] - Initial items for static mode
   * @param {Function} [options.dataSource] - Dynamic data source function (returns array of items)
   * @param {boolean} [options.caseInsensitiveKeys=false] - Key match rule for get/one/has/indexOf
   * @param {boolean} [options.writable=true] - Consulted by _assertWritable()
   */
  // Items are stored in an array (not a Map) to support positional access (idx, indexOf)
  // and duplicate keys. At typical list sizes (cookies, headers) the O(n) key lookup is negligible.
  constructor({
    keyProperty = 'key',
    valueProperty = 'value',
    items,
    dataSource,
    caseInsensitiveKeys = false,
    writable = true
  } = {}) {
    this._keyProperty = keyProperty;
    this._valueProperty = valueProperty;
    this._caseInsensitiveKeys = caseInsensitiveKeys;
    this._writable = writable;
    this._dynamic = typeof dataSource === 'function';
    if (this._dynamic) {
      this.#dataSource = dataSource;
    } else {
      this._items = Array.isArray(items) ? [...items] : [];
    }
  }

  // ── Protected hooks ───────────────────────────────────────────────────

  /**
   * Returns the current list of items.
   * In dynamic mode, calls the dataSource function.
   * In static mode, returns the internal array.
   */
  _getItems() {
    return this._dynamic ? this.#dataSource() : this._items;
  }

  /**
   * The single place the key match rule lives. Non-string keys never match.
   * @param {string} a
   * @param {string} b
   * @returns {boolean}
   */
  _keyMatches(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    return this._caseInsensitiveKeys ? a.toLowerCase() === b.toLowerCase() : a === b;
  }

  /**
   * Binds `this` for a callback when a context is supplied.
   * @param {Function} fn
   * @param {*} [context]
   * @returns {Function}
   */
  _bind(fn, context) {
    return context !== undefined ? fn.bind(context) : fn;
  }

  /**
   * Throws when the list was constructed with `writable: false`.
   * @param {string} method - Name of the calling method (for the error message)
   */
  _assertWritable(method) {
    if (!this._writable) {
      throw new Error(this._readOnlyMessage(method));
    }
  }

  /**
   * Error text for a write on a read-only list. Subclasses override to keep their pinned text.
   * @param {string} method
   * @returns {string}
   */
  _readOnlyMessage(method) {
    return `${method}() is not available on a read-only list`;
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /**
   * Get the value of an item by its key.
   * @param {string} name
   * @returns {*} The value property of the matching item, or undefined
   */
  get(name) {
    const item = this.one(name);
    return item ? item[this._valueProperty] : undefined;
  }

  /**
   * Get the full item object by its key.
   * @param {string} name
   * @returns {object|undefined}
   */
  one(name) {
    // Duplicate keys resolve to the last entry, consistent with toObject()'s last-wins semantics.
    // An entry flagged `disabled: true` only answers when no enabled entry carries the key, so a
    // header switched off beside an active one never shadows it, wherever it sits in the list.
    const matches = this._getItems().filter((i) => this._keyMatches(i[this._keyProperty], name));
    return matches.findLast((i) => !i.disabled) ?? matches.at(-1);
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
   * Get the index of an item, by key string (first key match) or by item object.
   * An item object matches by key and value so it works even when it is a copy
   * rather than the same reference.
   * @param {string|object} nameOrItem
   * @returns {number} -1 if not found
   */
  indexOf(nameOrItem) {
    const items = this._getItems();
    if (typeof nameOrItem === 'string') {
      return items.findIndex((i) => this._keyMatches(i[this._keyProperty], nameOrItem));
    }
    if (!nameOrItem || typeof nameOrItem !== 'object') return -1;
    return items.findIndex(
      (i) => this._keyMatches(i[this._keyProperty], nameOrItem[this._keyProperty])
        && i[this._valueProperty] === nameOrItem[this._valueProperty]
    );
  }

  // ── Search ─────────────────────────────────────────────────────────────

  /**
   * Check if an item with the given key exists.
   * Accepts a key string or an item object (its key is used).
   * If value is provided, also checks that the item's value matches.
   * @param {string|object} nameOrItem
   * @param {*} [value]
   * @returns {boolean}
   */
  has(nameOrItem, value) {
    const name = nameOrItem && typeof nameOrItem === 'object' ? nameOrItem[this._keyProperty] : nameOrItem;
    return this._getItems().some(
      (i) => this._keyMatches(i[this._keyProperty], name) && (value === undefined || i[this._valueProperty] === value)
    );
  }

  /**
   * Find the first item matching a predicate.
   * @param {Function} predicate
   * @param {*} [context] - Binds `this` in the predicate
   * @returns {object|undefined}
   */
  find(predicate, context) {
    return this._getItems().find(this._bind(predicate, context));
  }

  /**
   * Filter items by a predicate.
   * @param {Function} predicate
   * @param {*} [context] - Binds `this` in the predicate
   * @returns {Array}
   */
  filter(predicate, context) {
    return this._getItems().filter(this._bind(predicate, context));
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  /**
   * Iterate over each item.
   * @param {Function} fn - Called with (item, index)
   * @param {*} [context] - Binds `this` in the callback
   */
  each(fn, context) {
    this._getItems().forEach(this._bind(fn, context));
  }

  /**
   * Map over items.
   * @param {Function} fn
   * @param {*} [context] - Binds `this` in the callback
   * @returns {Array}
   */
  map(fn, context) {
    return this._getItems().map(this._bind(fn, context));
  }

  /**
   * Reduce items. Called as `reduce(fn)`, `reduce(fn, initial)` or `reduce(fn, initial, context)`.
   * @param {Function} fn
   * @param {...*} rest - `[initialValue, context]`
   * @returns {*}
   */
  reduce(fn, ...rest) {
    const bound = this._bind(fn, rest[1]);
    return rest.length ? this._getItems().reduce(bound, rest[0]) : this._getItems().reduce(bound);
  }

  // ── Transformation ─────────────────────────────────────────────────────

  /**
   * Convert to a plain object { key: value }.
   * @returns {object}
   */
  toObject() {
    const result = {};
    for (const item of this._getItems()) {
      result[item[this._keyProperty]] = item[this._valueProperty];
    }
    return result;
  }

  /**
   * Convert to a string "key=value; key2=value2".
   * @returns {string}
   */
  toString() {
    return this._getItems()
      .map((i) => `${i[this._keyProperty]}=${i[this._valueProperty]}`)
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
