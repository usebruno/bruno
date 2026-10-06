/*
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

/**
 * A list of `{ key, value }` entries with lookups by key, search, iteration and conversion.
 * @template T
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
    /** @protected */
    this._keyProperty = keyProperty;
    /** @protected */
    this._valueProperty = valueProperty;
    /** @protected */
    this._caseInsensitiveKeys = caseInsensitiveKeys;
    /** @protected */
    this._writable = writable;
    /** @protected */
    this._dynamic = typeof dataSource === 'function';
    if (this._dynamic) {
      this.#dataSource = dataSource;
    } else {
      /** @protected */
      this._items = Array.isArray(items) ? [...items] : [];
    }
  }

  // ── Protected hooks ───────────────────────────────────────────────────

  /**
   * Returns the current list of items.
   * In dynamic mode, calls the dataSource function.
   * In static mode, returns the internal array.
   * @protected
   * @returns {T[]}
   */
  _getItems() {
    return this._dynamic ? this.#dataSource() : this._items;
  }

  /**
   * The single place the key match rule lives. Non-string keys never match.
   * @param {string} a
   * @param {string} b
   * @returns {boolean}
   * @protected
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
   * @protected
   */
  _bind(fn, context) {
    return context !== undefined ? fn.bind(context) : fn;
  }

  /**
   * Throws when the list was constructed with `writable: false`.
   * @param {string} method - Name of the calling method (for the error message)
   * @protected
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
   * @protected
   */
  _readOnlyMessage(method) {
    return `${method}() is not available on a read-only list`;
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /**
   * Get the value of the entry with the given key.
   *
   * With several entries of that key, the last enabled one wins.
   * @param {string} name - The key.
   * @returns {*} The entry's value, or `undefined` when there is none.
   * @example
   * const contentType = req.headerList.get('content-type');
   * @category Read
   */
  get(name) {
    const item = this.one(name);
    return item ? item[this._valueProperty] : undefined;
  }

  /**
   * Get the whole entry with the given key.
   *
   * With several entries of that key, the last enabled one wins.
   * @param {string} name - The key.
   * @returns {T | undefined} The entry, or `undefined` when there is none.
   * @category Read
   */
  one(name) {
    // Duplicate keys resolve to the last entry, consistent with toObject()'s last-wins semantics.
    // An entry flagged `disabled: true` only answers when no enabled entry carries the key, so a
    // header switched off beside an active one never shadows it, wherever it sits in the list.
    const matches = this._getItems().filter((i) => this._keyMatches(i[this._keyProperty], name));
    return matches.findLast((i) => !i.disabled) ?? matches.at(-1);
  }

  /**
   * Get every entry, in order.
   * @returns {T[]} A new array of the entries.
   * @category Read
   */
  all() {
    return [...this._getItems()];
  }

  /**
   * Get the entry at a position in the list.
   * @param {number} index - The zero-based position.
   * @returns {T | undefined} The entry, or `undefined` past the end of the list.
   * @category Read
   */
  idx(index) {
    return this._getItems()[index];
  }

  /**
   * Count the entries.
   * @returns {number} How many entries the list has.
   * @category Read
   */
  count() {
    return this._getItems().length;
  }

  /**
   * Find the position of an entry, by key or by an entry object.
   *
   * A key finds the first entry with that key. An entry object matches on both key and value,
   * so a copy of an entry finds it too.
   * @param {string | T} nameOrItem - A key, or an entry.
   * @returns {number} The zero-based position, or `-1` when there is no match.
   * @category Search
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
   * Check whether an entry with the given key exists, optionally with a given value.
   * @param {string | T} nameOrItem - A key, or an entry whose key to look for.
   * @param {*} [value] - When given, the entry's value must equal it too.
   * @returns {boolean} `true` when a matching entry exists.
   * @example
   * if (!req.headerList.has('Authorization')) {
   *   req.headerList.upsert({ key: 'Authorization', value: 'Bearer …' });
   * }
   * @category Search
   */
  has(nameOrItem, value) {
    const name = nameOrItem && typeof nameOrItem === 'object' ? nameOrItem[this._keyProperty] : nameOrItem;
    return this._getItems().some(
      (i) => this._keyMatches(i[this._keyProperty], name) && (value === undefined || i[this._valueProperty] === value)
    );
  }

  /**
   * Find the first entry a predicate accepts.
   * @param {(item: T, index: number) => unknown} predicate - Called with each entry and its position.
   * @param {*} [context] - The `this` of `predicate`.
   * @returns {T | undefined} The entry, or `undefined` when none matches.
   * @category Search
   */
  find(predicate, context) {
    return this._getItems().find(this._bind(predicate, context));
  }

  /**
   * Get every entry a predicate accepts.
   * @param {(item: T, index: number) => unknown} predicate - Called with each entry and its position.
   * @param {*} [context] - The `this` of `predicate`.
   * @returns {T[]} The matching entries, in order.
   * @category Search
   */
  filter(predicate, context) {
    return this._getItems().filter(this._bind(predicate, context));
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  /**
   * Call a function for every entry, in order.
   * @param {(item: T, index: number) => void} fn - Called with each entry and its position.
   * @param {*} [context] - The `this` of `fn`.
   * @category Iteration
   */
  each(fn, context) {
    this._getItems().forEach(this._bind(fn, context));
  }

  /**
   * Turn every entry into a new value.
   * @param {(item: T, index: number) => any} fn - Called with each entry and its position.
   * @param {*} [context] - The `this` of `fn`.
   * @returns {any[]} What `fn` returned for each entry, in order.
   * @example
   * const names = req.headerList.map((header) => header.key);
   * @category Iteration
   */
  map(fn, context) {
    return this._getItems().map(this._bind(fn, context));
  }

  /**
   * Combine the entries into a single value, like `Array.prototype.reduce`.
   * @type {(fn: (accumulator: any, item: T, index: number) => any, initialValue?: any, context?: any) => any}
   * @param fn - Called with the value so far, each entry and its position.
   * @param initialValue - The starting value. Without it, the first entry is.
   * @param context - The `this` of `fn`.
   * @returns The last value `fn` returned.
   * @category Iteration
   */
  reduce(fn, ...rest) {
    const bound = this._bind(fn, rest[1]);
    return rest.length ? this._getItems().reduce(bound, rest[0]) : this._getItems().reduce(bound);
  }

  // ── Transformation ─────────────────────────────────────────────────────

  /**
   * Convert the list to a `{ key: value }` object. With several entries of a key, the last wins.
   * @returns {Record<string, any>} The values, by key.
   * @category Transform
   */
  toObject() {
    const result = {};
    for (const item of this._getItems()) {
      result[item[this._keyProperty]] = item[this._valueProperty];
    }
    return result;
  }

  /**
   * Convert the list to a `key=value; key2=value2` string.
   * @returns {string} The entries, separated by `; `.
   * @category Transform
   */
  toString() {
    return this._getItems()
      .map((i) => `${i[this._keyProperty]}=${i[this._valueProperty]}`)
      .join('; ');
  }

  /**
   * Get the entries for `JSON.stringify()`; the same as `all()`.
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
