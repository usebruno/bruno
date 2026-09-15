const { ciEquals } = require('./key-matching');

/**
 * PropertyList — the one collection class behind every list-like scripting surface
 * (`req.headerList`, `res.headerList`, `bru.cookies`, gRPC metadata/trailers).
 *
 * The array of plain `{ key, value, ... }` items is the universal representation:
 * every read derives from `store.read()`, which re-reads the backing source on each
 * call, so live surfaces (request headers, the cookie jar) can never diverge from
 * their raw counterparts (`req.headers`, the jar).
 *
 * Responsibilities are split three ways:
 * - PropertyList owns collection semantics — reads, search, iteration, transforms,
 *   positional reads (`idx`).
 * - StoreAdapters own representation semantics — item shape and every write method.
 * - The manifest (see `manifest.js`) declares the capability axes per surface;
 *   `assemblePropertyList` wires descriptor + store together and gates mutations.
 *
 * StoreAdapter protocol:
 * - `read(): Item[]` — required; a fresh array on every call.
 * - The write methods a descriptor's `writeMethods` names — verbatim per-surface
 *   signatures; never called when the surface is gated read-only.
 * - `insert/insertAfter/prepend/append` — only on stores with a real ordering.
 * - The methods a descriptor's `extras` names — non-collection surface methods
 *   (e.g. `jar()` on the cookie store), attached ungated.
 */

const POSITIONAL_METHODS = ['insert', 'insertAfter', 'prepend', 'append'];

const TO_STRING_SERIALIZERS = {
  // "k=v; k2=v2" — cookies and plain lists
  pairs: (items) => items.map((i) => `${i.key}=${i.value}`).join('; '),
  // HTTP wire format "Key: Value\n..." with trailing newline, skipping disabled headers
  httpWire: (items) => {
    const enabled = items.filter((h) => !h.disabled);
    if (enabled.length === 0) return '';
    return enabled.map((h) => `${h.key}: ${h.value}`).join('\n') + '\n';
  },
  // "key: value" per line — how metadata travels as HTTP/2 headers
  metadataLines: (items) => items.map((i) => `${i.key}: ${i.value}`).join('\n')
};

const TO_OBJECT_SERIALIZERS = {
  // { key: value } map, last-wins on duplicate keys; extra args ignored
  basic: (items) => {
    const result = {};
    for (const item of items) {
      result[item.key] = item.value;
    }
    return result;
  },
  // Postman's PropertyList.toObject(excludeDisabled, caseSensitive, multiValue, sanitizeKeys)
  postmanHeaders: (items, excludeDisabled, caseSensitive, multiValue, sanitizeKeys) => {
    const result = {};
    for (const item of items) {
      if (excludeDisabled && item.disabled) continue;
      const key = caseSensitive === false ? item.key.toLowerCase() : item.key;
      if (sanitizeKeys && !key) continue;
      if (multiValue) {
        if (!(key in result)) {
          result[key] = item.value;
        }
      } else {
        result[key] = item.value;
      }
    }
    return result;
  }
};

class PropertyList {
  #store;
  #caseInsensitive;
  #uniqueKeys;
  #toStringSerializer;
  #toObjectSerializer;

  /**
   * @param {object} options
   * @param {object} options.store - StoreAdapter with a `read()` method
   * @param {boolean} [options.caseInsensitive=false] - Case-insensitive key matching
   * @param {boolean} [options.uniqueKeys=false] - Keys are unique; enables the string-key
   *   `indexOf` and object-form `has` shortcuts, which are ambiguous with duplicate keys
   * @param {object} [options.serializers] - `{ toString, toObject }` serializer ids
   */
  constructor({ store, caseInsensitive = false, uniqueKeys = false, serializers = {} } = {}) {
    this.#store = store;
    this.#caseInsensitive = caseInsensitive === true;
    this.#uniqueKeys = uniqueKeys === true;
    // Object.hasOwn guards against `{}.toString` resolving to Object.prototype.toString
    this.#toStringSerializer = TO_STRING_SERIALIZERS[Object.hasOwn(serializers, 'toString') ? serializers.toString : 'pairs'];
    this.#toObjectSerializer = TO_OBJECT_SERIALIZERS[Object.hasOwn(serializers, 'toObject') ? serializers.toObject : 'basic'];
  }

  #read() {
    return this.#store.read();
  }

  #keyEquals(a, b) {
    return this.#caseInsensitive ? ciEquals(a, b) : a === b;
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /**
   * Get the value of an item by its key.
   * Duplicate keys resolve to the last entry, consistent with toObject().
   * @param {string} name
   * @returns {*}
   */
  get(name) {
    const item = this.#read().findLast((i) => this.#keyEquals(i.key, name));
    return item ? item.value : undefined;
  }

  /**
   * Get the full item object by its key (last-wins on duplicates).
   * @param {string} name
   * @returns {object|undefined}
   */
  one(name) {
    return this.#read().findLast((i) => this.#keyEquals(i.key, name));
  }

  /**
   * Get a cloned array of all items.
   * @returns {Array}
   */
  all() {
    return [...this.#read()];
  }

  /**
   * Get an item by its positional index (iteration order of the backing store).
   * @param {number} index
   * @returns {object|undefined}
   */
  idx(index) {
    return this.#read()[index];
  }

  /**
   * Get the number of items.
   * @returns {number}
   */
  count() {
    return this.#read().length;
  }

  /**
   * Get the index of an item by `{ key, value }` structural equality, or —
   * on unique-key lists — by key string.
   * @param {string|object} item
   * @returns {number} -1 if not found
   */
  indexOf(item) {
    if (this.#uniqueKeys && typeof item === 'string') {
      return this.#read().findIndex((i) => this.#keyEquals(i.key, item));
    }
    if (!item || typeof item !== 'object') return -1;
    return this.#read().findIndex((i) => this.#keyEquals(i.key, item.key) && i.value === item.value);
  }

  // ── Search ─────────────────────────────────────────────────────────────

  /**
   * Check if an item with the given key exists; with `value`, also match the value.
   * Unique-key lists additionally accept an object with a `key` property.
   * @param {string|object} name
   * @param {*} [value]
   * @returns {boolean}
   */
  has(name, value) {
    if (this.#uniqueKeys && name && typeof name === 'object' && name.key) {
      return this.#read().some((i) => this.#keyEquals(i.key, name.key));
    }
    const items = this.#read();
    if (value !== undefined) {
      return items.some((i) => this.#keyEquals(i.key, name) && i.value === value);
    }
    return items.some((i) => this.#keyEquals(i.key, name));
  }

  /**
   * Find the first item matching a predicate.
   * @param {Function} predicate
   * @param {*} [context] - Bind `this` for the predicate
   * @returns {object|undefined}
   */
  find(predicate, context) {
    return this.#read().find(context !== undefined ? predicate.bind(context) : predicate);
  }

  /**
   * Filter items by a predicate.
   * @param {Function} predicate
   * @param {*} [context] - Bind `this` for the predicate
   * @returns {Array}
   */
  filter(predicate, context) {
    return this.#read().filter(context !== undefined ? predicate.bind(context) : predicate);
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  /**
   * Iterate over each item.
   * @param {Function} fn - Called with (item, index)
   * @param {*} [context] - Bind `this` for the callback
   */
  each(fn, context) {
    this.#read().forEach(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Map over items.
   * @param {Function} fn
   * @param {*} [context] - Bind `this` for the callback
   * @returns {Array}
   */
  map(fn, context) {
    return this.#read().map(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Reduce items.
   * @param {Function} fn
   * @param {*} [initialValue] - Optional initial accumulator value
   * @param {*} [context] - Bind `this` for the callback
   * @returns {*}
   */
  reduce(fn, ...args) {
    const bound = args.length > 1 ? fn.bind(args[1]) : fn;
    return args.length ? this.#read().reduce(bound, args[0]) : this.#read().reduce(bound);
  }

  // ── Transformation ─────────────────────────────────────────────────────

  /**
   * Convert to a plain `{ key: value }` object. Header lists follow Postman's
   * 4-arg toObject(excludeDisabled, caseSensitive, multiValue, sanitizeKeys) signature.
   * @returns {object}
   */
  toObject(...args) {
    return this.#toObjectSerializer(this.#read(), ...args);
  }

  /**
   * Convert to the surface's string form (cookie pairs, HTTP wire format, or metadata lines).
   * @returns {string}
   */
  toString() {
    return this.#toStringSerializer(this.#read());
  }

  /**
   * Convert to JSON (returns the same as all()).
   * @returns {Array}
   */
  toJSON() {
    return this.all();
  }

  /**
   * Check if an object is a PropertyList.
   * @param {*} obj
   * @returns {boolean}
   */
  static isPropertyList(obj) {
    return obj instanceof PropertyList;
  }
}

const attach = (list, name, fn) => {
  // Non-enumerable, matching how prototype methods present to script introspection
  Object.defineProperty(list, name, { value: fn, writable: true, configurable: true });
};

/**
 * Build a PropertyList from a manifest descriptor and a StoreAdapter, attaching the
 * surface's write methods with capability gating applied.
 *
 * Gating order for positional mutators is unordered-before-readonly, so the error
 * names the real reason: an unordered store has no position to insert at, whether
 * or not the surface is writable.
 *
 * @param {object} descriptor - Manifest descriptor (see manifest.js)
 * @param {object} store - StoreAdapter instance
 * @param {object} [options]
 * @param {boolean} [options.writable] - Resolves descriptors with `writable: 'wiring'`
 */
const assemblePropertyList = (descriptor, store, { writable } = {}) => {
  const list = new PropertyList({
    store,
    caseInsensitive: descriptor.caseInsensitive,
    uniqueKeys: descriptor.uniqueKeys,
    serializers: descriptor.serializers
  });

  const isWritable = descriptor.writable === 'wiring' ? writable === true : descriptor.writable === true;
  const thrower = (message) => () => {
    throw new Error(message);
  };

  for (const name of descriptor.writeMethods || []) {
    attach(list, name, isWritable ? store[name].bind(store) : thrower(descriptor.errors.readonly(name)));
  }

  for (const name of POSITIONAL_METHODS) {
    if (!descriptor.ordered) {
      attach(list, name, thrower(descriptor.errors.unordered(name)));
    } else if (!isWritable) {
      attach(list, name, thrower(descriptor.errors.readonly(name)));
    } else {
      attach(list, name, store[name].bind(store));
    }
  }

  for (const name of descriptor.extras || []) {
    attach(list, name, store[name].bind(store));
  }

  return list;
};

module.exports = { PropertyList, assemblePropertyList, POSITIONAL_METHODS };
