const ReadOnlyPropertyList = require('../readonly-property-list');
const { setMetadataKey } = require('./grpc-metadata');

// Extends ReadOnlyPropertyList in dynamic mode: entries are read through the accessor (live headers) on every access.
// Keep quickjs shim up to date on any updates to this class
class GrpcMetadataList extends ReadOnlyPropertyList {
  #readMetadata;
  #writable;

  /**
   * @param {Function} readMetadata - Returns the `{ key: value }` map backing the list. A writable
   *   list needs it to return the same live object every call, since that object is what writes edit.
   * @param {object} [options]
   * @param {boolean} [options.writable=false] - When false, write methods throw
   */
  constructor(readMetadata, { writable = false } = {}) {
    super({
      keyProperty: 'key',
      valueProperty: 'value',
      dataSource: () => Object.entries(readMetadata()).map(([key, value]) => ({ key, value }))
    });
    this.#readMetadata = readMetadata;
    this.#writable = writable;
  }

  // Positional access is deliberately removed from ReadOnlyPropertyList.
  idx = undefined;

  #assertWritable(method) {
    if (!this.#writable) {
      throw new Error(
        `metadata.${method}() is not available once the call has been sent — change metadata in the beforeCallStart hook`
      );
    }
  }

  #findKey(name) {
    if (typeof name !== 'string') {
      return undefined;
    }

    const target = name.toLowerCase();

    return Object.keys(this.#readMetadata()).find((key) => key.toLowerCase() === target);
  }

  /**
   * Get the value of an entry by key.
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    const match = this.#findKey(key);

    return match === undefined ? undefined : this.#readMetadata()[match];
  }

  /**
   * Get the full entry by key.
   * @param {string} key
   * @returns {object|undefined}
   */
  one(key) {
    const match = this.#findKey(key);

    return match === undefined ? undefined : { key: match, value: this.#readMetadata()[match] };
  }

  /**
   * Check whether an entry exists, optionally matching its value too.
   * @param {string} key
   * @param {*} [value]
   * @returns {boolean}
   */
  has(key, value) {
    const match = this.#findKey(key);

    if (match === undefined) {
      return false;
    }

    return value === undefined || this.#readMetadata()[match] === value;
  }

  /**
   * Get the index of an entry, by key string or by `{ key, value }`.
   * @param {string|object} item
   * @returns {number} -1 if not found
   */
  indexOf(item) {
    const match = this.#findKey(typeof item === 'string' ? item : item?.key);

    if (match === undefined) {
      return -1;
    }

    const entries = this.all();

    if (typeof item === 'string') {
      return entries.findIndex((entry) => entry.key === match);
    }

    return entries.findIndex((entry) => entry.key === match && entry.value === item.value);
  }

  // ── Iteration overrides (optional context binding) ────────────────────

  /** @param {Function} fn @param {*} [context] */
  each(fn, context) {
    super.each(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] @returns {object|undefined} */
  find(fn, context) {
    return super.find(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] @returns {Array} */
  filter(fn, context) {
    return super.filter(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] @returns {Array} */
  map(fn, context) {
    return super.map(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [accumulator] @param {*} [context] @returns {*} */
  reduce(fn, ...args) {
    const bound = args.length > 1 ? fn.bind(args[1]) : fn;

    return args.length ? super.reduce(bound, args[0]) : super.reduce(bound);
  }

  // ── Transform override ────────────────────────────────────────────────

  /** `key: value` per line — how metadata travels as HTTP/2 headers. */
  toString() {
    return this.all()
      .map((entry) => `${entry.key}: ${entry.value}`)
      .join('\n');
  }

  // ── Write methods (edit the backing map) ──────────────────────────────

  /**
   * Insert a key, or update it in place when it already exists.
   *
   * @param {string} key
   * @param {*} value
   */
  upsert(key, value) {
    this.#assertWritable('upsert');

    if (typeof key !== 'string' || !key.length) {
      return;
    }

    const metadata = this.#readMetadata();
    const existing = this.#findKey(key);

    // A server reads `X-Token` and `x-token` as one key, so a re-cased upsert replaces instead of
    // leaving two entries the transport would send as duplicates.
    if (existing !== undefined && existing !== key) {
      delete metadata[existing];
    }

    setMetadataKey(metadata, key, value);
  }

  /**
   * Upsert an entry from the `{ key, value }` shape `all()` returns, so an entry read from one list
   * can be handed straight to another.
   *
   * @param {object} item
   */
  add(item) {
    this.#assertWritable('add');

    if (!item || typeof item !== 'object') {
      return;
    }

    this.upsert(item.key, item.value);
  }

  /**
   * Remove the entry with the given key.
   * @param {string} key
   */
  remove(key) {
    this.#assertWritable('remove');

    const existing = this.#findKey(key);

    if (existing !== undefined) {
      delete this.#readMetadata()[existing];
    }
  }

  /** Remove every entry. */
  clear() {
    this.#assertWritable('clear');

    const metadata = this.#readMetadata();

    // Emptied in place rather than reassigned
    for (const key of Object.keys(metadata)) {
      delete metadata[key];
    }
  }
}

module.exports = GrpcMetadataList;
