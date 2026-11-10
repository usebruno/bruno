/*
 * ReadOnlyPropertyList - A read-only collection data structure.
 *
 * Two modes:
 * - Static mode: items passed to the constructor are copied into an internal array
 * - Dynamic mode: a dataSource function returns the items on every read; it reads either a live
 *   source (request headers, the cookie jar) or a snapshot (response headers, gRPC response metadata)
 *
 * Items are plain objects with a configurable key property (keyProperty) and value property (valueProperty).
 *
 * This base class provides only read/search/iteration/transform methods, plus opt-in knobs
 * subclasses share: case-insensitive key matching and iterator context binding.
 *
 * Class hierarchy (every list extends the base directly):
 *   ReadOnlyPropertyList   (read-only, both modes)
 *     ├── HeaderList       (sync writes to the request's headers)
 *     ├── GrpcMetadataList (sync writes to the gRPC request's metadata)
 *     └── CookieList       (async add/upsert/remove/clear/delete against the cookie jar)
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
  #dataSource;

  /**
   * @param {object} options
   * @param {string} [options.keyProperty='key'] - The property name used as the unique key
   * @param {string} [options.valueProperty='value'] - The property name used as the value
   * @param {Array} [options.items] - Initial items for static mode
   * @param {Function} [options.dataSource] - Dynamic data source function (returns array of items)
   * @param {boolean} [options.caseInsensitiveKeys=false] - Key match rule for get/one/has/indexOf
   */
  // Items are stored in an array (not a Map) to support positional access (idx, indexOf)
  // and duplicate keys. At typical list sizes (cookies, headers) the O(n) key lookup is negligible.
  constructor({
    keyProperty = 'key',
    valueProperty = 'value',
    items,
    dataSource,
    caseInsensitiveKeys = false
  } = {}) {
    /** @protected */
    this._keyProperty = keyProperty;
    /** @protected */
    this._valueProperty = valueProperty;
    /** @protected */
    this._caseInsensitiveKeys = caseInsensitiveKeys;
    /** @protected */
    this._dynamic = typeof dataSource === 'function';
    if (this._dynamic) {
      this.#dataSource = dataSource;
    } else {
      /** @protected */
      this._items = Array.isArray(items) ? [...items] : [];
    }
  }

  // ── Private hooks ─────────────────────────────────────────────────────

  /**
   * Returns the current list of items.
   * In dynamic mode, calls the dataSource function.
   * In static mode, returns the internal array.
   * @private
   * @returns {T[]}
   */
  #getItems() {
    return this._dynamic ? this.#dataSource() : this._items;
  }

  // ── Protected hooks ───────────────────────────────────────────────────

  /**
   * The single place the key match rule lives. Non-string keys never match.
   * @param {string} a
   * @param {string} b
   * @protected
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
   * @protected
   * @returns {Function}
   */
  _bind(fn, context) {
    return context !== undefined ? fn.bind(context) : fn;
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /**
   * Get the value of the entry with the given key.
   *
   * Keys are case-sensitive. With several entries of that key, the last one wins.
   * @param {string} name - The key.
   * @returns {any} The value, or `undefined` when no entry has that key.
   * @example
   * const value = list.get('id');
   * @category Read
   */
  get(name) {
    const item = this.one(name);
    return item ? item[this._valueProperty] : undefined;
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
    // Duplicate keys resolve to the last entry, consistent with toObject()'s last-wins semantics.
    // An entry flagged `disabled: true` only answers when no enabled entry carries the key, so a
    // header switched off beside an active one never shadows it, wherever it sits in the list.
    const matches = this.#getItems().filter((i) => this._keyMatches(i[this._keyProperty], name));
    return matches.findLast((i) => !i.disabled) ?? matches.at(-1);
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
   * With a key, it finds the first entry of that key. With an entry, it finds the first one with
   * the same key and value, so a copy of an entry finds it too. Keys are case-sensitive.
   * @param {string | T} nameOrItem - A key, or an entry to match by key and value.
   * @returns {number} The zero-based position of the first match, or `-1` when none matches.
   * @category Search
   */
  indexOf(nameOrItem) {
    const items = this.#getItems();
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
   * Check whether an entry with the given key exists.
   *
   * Keys are case-sensitive.
   * @param {string | T} nameOrItem - A key, or an entry whose key to look for (its value is not
   *   compared).
   * @param {any} [value] - When given, the entry's value must also be equal (`===`) to it.
   * @returns {boolean} Whether a matching entry exists.
   * @example
   * if (!list.has('id')) {
   *   bru.setVar('missingId', true);
   * }
   * @category Search
   */
  has(nameOrItem, value) {
    const name = nameOrItem && typeof nameOrItem === 'object' ? nameOrItem[this._keyProperty] : nameOrItem;
    return this.#getItems().some(
      (i) => this._keyMatches(i[this._keyProperty], name) && (value === undefined || i[this._valueProperty] === value)
    );
  }

  /**
   * Get the first entry `predicate` accepts.
   * @param {(item: T, index: number) => boolean} predicate - Called with each entry and its position.
   * @param {any} [context] - The `this` of `predicate`.
   * @returns {T | undefined} The entry, or `undefined` when none matches.
   * @category Search
   */
  find(predicate, context) {
    return this.#getItems().find(this._bind(predicate, context));
  }

  /**
   * Get every entry `predicate` accepts.
   * @param {(item: T, index: number) => boolean} predicate - Called with each entry and its position.
   * @param {any} [context] - The `this` of `predicate`.
   * @returns {T[]} The matching entries, in order.
   * @category Search
   */
  filter(predicate, context) {
    return this.#getItems().filter(this._bind(predicate, context));
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  /**
   * Call `fn` once for each entry, in order.
   * @param {(item: T, index: number) => void} fn - Called with each entry and its position.
   * @param {any} [context] - The `this` of `fn`.
   * @category Iteration
   */
  each(fn, context) {
    this.#getItems().forEach(this._bind(fn, context));
  }

  /**
   * Build an array from the result of `fn` for each entry.
   * @param {(item: T, index: number) => any} fn - Called with each entry and its position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {any[]} The results, in the order of the entries.
   * @example
   * const keys = list.map((entry) => entry.key);
   * @category Iteration
   */
  map(fn, context) {
    return this.#getItems().map(this._bind(fn, context));
  }

  /**
   * Combine the entries into a single value, as `Array.prototype.reduce` does.
   *
   * Without `initialValue`, the first entry is the starting value, and an empty list throws.
   * @type {(fn: (accumulator: any, item: T, index: number) => any, initialValue?: any, context?: any) => any}
   * @param fn - Called with the value so far, each entry and its position; returns the next value.
   * @param initialValue - The starting value.
   * @param context - The `this` of `fn`.
   * @category Iteration
   */
  reduce(fn, ...rest) {
    const bound = this._bind(fn, rest[1]);
    return rest.length ? this.#getItems().reduce(bound, rest[0]) : this.#getItems().reduce(bound);
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
      result[item[this._keyProperty]] = item[this._valueProperty];
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
      .map((i) => `${i[this._keyProperty]}=${i[this._valueProperty]}`)
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
