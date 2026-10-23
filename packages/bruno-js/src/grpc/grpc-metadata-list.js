const ReadOnlyPropertyList = require('../readonly-property-list');
const { setMetadataKey } = require('./grpc-metadata');

// Extends ReadOnlyPropertyList in dynamic mode: entries are read through the accessor (live headers) on every access.
// Keep quickjs shim up to date on any updates to this class

/**
 * A gRPC metadata entry.
 * @category Types
 * @typedef {object} MetadataEntry
 * @property {string} key - The key.
 * @property {any} value - The value, usually a string.
 */

/**
 * gRPC metadata that can't be changed: a metadata list without the methods that change it.
 * @typedef {Omit<GrpcMetadataList, 'upsert' | 'add' | 'remove' | 'clear'>} ReadOnlyGrpcMetadataList
 */

/**
 * gRPC metadata, as a list of `{ key, value }` entries. Keys match case-insensitively.
 * @extends {ReadOnlyPropertyList<MetadataEntry>}
 */
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
  /** @internal */
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
   * Get the value of an entry.
   *
   * Keys match case-insensitively.
   * @param {string} key - The key.
   * @returns {any} The value, or `undefined` when there is no such entry.
   * @example
   * const status = bru.grpc.response.trailers.get('grpc-status');
   * @category Read
   */
  get(key) {
    const match = this.#findKey(key);

    return match === undefined ? undefined : this.#readMetadata()[match];
  }

  /**
   * Get an entry by key.
   *
   * Keys match case-insensitively.
   * @param {string} key - The key.
   * @returns {MetadataEntry | undefined} The entry, or `undefined` when there is no such entry.
   * @category Read
   */
  one(key) {
    const match = this.#findKey(key);

    return match === undefined ? undefined : { key: match, value: this.#readMetadata()[match] };
  }

  /**
   * Check whether an entry exists.
   *
   * Keys match case-insensitively.
   * @param {string} key - The key.
   * @param {any} [value] - When given, the entry's value must also be equal (`===`) to it.
   * @returns {boolean} Whether a matching entry exists.
   * @category Search
   */
  has(key, value) {
    const match = this.#findKey(key);

    if (match === undefined) {
      return false;
    }

    return value === undefined || this.#readMetadata()[match] === value;
  }

  /**
   * Get the position of an entry.
   *
   * Keys match case-insensitively.
   * @param {string | MetadataEntry} item - A key, or an entry to match by key and value.
   * @returns {number} The zero-based position, or `-1` when no entry matches.
   * @category Search
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

  /**
   * Call `fn` once for each entry, in order.
   * @param {(item: MetadataEntry, index: number) => void} fn - Called with each entry and its position.
   * @param {any} [context] - The `this` of `fn`.
   * @category Iteration
   */
  each(fn, context) {
    super.each(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Get the first entry `fn` accepts.
   * @param {(item: MetadataEntry, index: number) => boolean} fn - Called with each entry and its
   *   position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {MetadataEntry | undefined} The entry, or `undefined` when none matches.
   * @category Search
   */
  find(fn, context) {
    return super.find(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Get every entry `fn` accepts.
   * @param {(item: MetadataEntry, index: number) => boolean} fn - Called with each entry and its
   *   position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {MetadataEntry[]} The matching entries, in order.
   * @category Search
   */
  filter(fn, context) {
    return super.filter(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Build an array from the result of `fn` for each entry.
   * @param {(item: MetadataEntry, index: number) => any} fn - Called with each entry and its position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {any[]} The results, in the order of the entries.
   * @category Iteration
   */
  map(fn, context) {
    return super.map(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Combine the entries into a single value, as `Array.prototype.reduce` does.
   *
   * Without `initialValue`, the first entry is the starting value, and an empty list throws.
   * @type {(fn: (accumulator: any, item: MetadataEntry, index: number) => any, initialValue?: any, context?: any) => any}
   * @param fn - Called with the value so far, each entry and its position; returns the next value.
   * @param initialValue - The starting value.
   * @param context - The `this` of `fn`.
   * @category Iteration
   */
  reduce(fn, ...args) {
    const bound = args.length > 1 ? fn.bind(args[1]) : fn;

    return args.length ? super.reduce(bound, args[0]) : super.reduce(bound);
  }

  // ── Transform override ────────────────────────────────────────────────

  /**
   * Convert the entries to `key: value` lines, the way metadata travels as HTTP/2 headers.
   * @returns {string} The lines, joined with newlines, or `''` when there are none.
   * @category Transform
   */
  toString() {
    return this.all()
      .map((entry) => `${entry.key}: ${entry.value}`)
      .join('\n');
  }

  // ── Write methods (edit the backing map) ──────────────────────────────

  /**
   * Set an entry, replacing the one with the same key.
   *
   * Keys match case-insensitively; the replaced entry takes the new key's case. Nothing happens
   * when `key` is empty.
   * @param {string} key - The key.
   * @param {any} value - The value, usually a string.
   * @example
   * bru.grpc.request.metadata.upsert('authorization', `Bearer ${bru.getEnvVar('token')}`);
   * @context grpc:before-call-start
   * @category Write
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
   * Set an entry from a `{ key, value }` object, the same as `upsert(item.key, item.value)`.
   *
   * An entry read from one list can be passed straight to another.
   * @param {MetadataEntry} item - The entry.
   * @example
   * bru.grpc.request.metadata.add({ key: 'x-tenant', value: 'acme' });
   * @context grpc:before-call-start
   * @category Write
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
   *
   * Keys match case-insensitively.
   * @param {string} key - The key.
   * @context grpc:before-call-start
   * @category Write
   */
  remove(key) {
    this.#assertWritable('remove');

    const existing = this.#findKey(key);

    if (existing !== undefined) {
      delete this.#readMetadata()[existing];
    }
  }

  /**
   * Remove every entry.
   * @context grpc:before-call-start
   * @category Write
   */
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
