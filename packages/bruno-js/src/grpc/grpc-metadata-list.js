const ReadOnlyPropertyList = require('../readonly-property-list');
const {
  liveHeaderEntries,
  orderedHeaderEntries,
  projectHeaderEntries,
  snapshotHeaderEntries
} = require('../utils/header-entries');

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
  #request;
  #writable;

  /**
   * @param {object|Array} source - The prepared gRPC request (its `headers` and `headerEntries`
   *   are the store, read live), or the `[{ name, value }]` rows of a response to snapshot.
   * @param {object} [options]
   * @param {boolean} [options.writable=false] - When false, write methods throw. A snapshot is
   *   never writable.
   */
  constructor(source, { writable = false } = {}) {
    const snapshot = !source || Array.isArray(source);
    const rows = snapshot ? snapshotHeaderEntries(source) : null;
    super({
      keyProperty: 'key',
      valueProperty: 'value',
      caseInsensitiveKeys: true,
      dataSource: snapshot ? () => rows.map((entry) => ({ ...entry })) : () => orderedHeaderEntries(source)
    });
    this.#request = snapshot ? null : source;
    this.#writable = writable && !snapshot;
  }

  #assertWritable(method) {
    if (!this.#writable) {
      throw new Error(
        `metadata.${method}() is not available once the call has been sent — change metadata in the beforeCallStart hook`
      );
    }
  }

  // ── Docs for inherited methods (see readme § "Doc overrides") ─────────

  /**
   * Get the value of an entry.
   *
   * Keys match case-insensitively. With several entries of that key, the last one wins.
   * @override get
   * @param name - The key.
   * @returns The value, or `undefined` when there is no such entry.
   * @example
   * const status = bru.grpc.response.trailers.get('grpc-status');
   */

  /**
   * Get an entry by key.
   *
   * Keys match case-insensitively. With several entries of that key, the last one wins.
   * @override one
   * @param name - The key.
   * @returns The entry, or `undefined` when there is no such entry.
   */

  /**
   * Check whether an entry exists.
   *
   * Keys match case-insensitively.
   * @override has
   * @param nameOrItem - A key, or an entry whose key to look for (its value is not compared).
   * @returns Whether a matching entry exists.
   * @example
   * if (!bru.grpc.request.metadata.has('authorization')) {
   *   bru.grpc.request.metadata.upsert('authorization', `Bearer ${bru.getEnvVar('token')}`);
   * }
   */

  /**
   * Get the position of an entry.
   *
   * Keys match case-insensitively.
   * @override indexOf
   * @param nameOrItem - A key, or an entry to match by key and value.
   * @returns The zero-based position of the first match, or `-1` when none matches.
   */

  /**
   * Call `fn` once for each entry, in order.
   * @override each
   * @param fn - Called with each entry and its position.
   */

  /**
   * Get the first entry `predicate` accepts.
   * @override find
   * @param predicate - Called with each entry and its position.
   * @returns The entry, or `undefined` when none matches.
   */

  /**
   * Get every entry `predicate` accepts.
   * @override filter
   * @param predicate - Called with each entry and its position.
   * @returns The matching entries, in order.
   */

  /**
   * Build an array from the result of `fn` for each entry.
   * @override map
   * @example
   * const keys = bru.grpc.response.metadata.map((entry) => entry.key);
   */

  /**
   * Combine the entries into a single value, as `Array.prototype.reduce` does.
   *
   * Without `initialValue`, the first entry is the starting value, and an empty list throws.
   * @override reduce
   * @param fn - Called with the value so far, each entry and its position; returns the next value.
   */

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

  // ── Write methods (edit the entries, then project into the headers map) ──

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

    const entries = liveHeaderEntries(this.#request);
    const firstMatch = entries.find((entry) => this._keyMatches(entry.key, key));
    if (firstMatch && firstMatch.key !== key) {
      entries.splice(entries.indexOf(firstMatch), 1);
    }

    const existing = entries.find((entry) => entry.key === key);
    if (existing) {
      existing.value = value;
    } else {
      entries.push({ key, value });
    }

    projectHeaderEntries(entries, this.#request.headers);
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

    const entries = liveHeaderEntries(this.#request);
    const index = entries.findIndex((entry) => this._keyMatches(entry.key, key));
    if (index !== -1) {
      entries.splice(index, 1);
    }

    projectHeaderEntries(entries, this.#request.headers);
  }

  /**
   * Remove every entry.
   * @context grpc:before-call-start
   * @category Write
   */
  clear() {
    this.#assertWritable('clear');

    const entries = liveHeaderEntries(this.#request);

    entries.length = 0;

    projectHeaderEntries(entries, this.#request.headers);
  }
}

module.exports = GrpcMetadataList;
