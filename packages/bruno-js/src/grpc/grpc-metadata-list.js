const ReadOnlyPropertyList = require('../readonly-property-list');
const { liveHeaderEntries, projectHeaderEntries, snapshotHeaderEntries } = require('../utils/header-entries');

/**
 * GrpcMetadataList — `bru.grpc.request.metadata`, `bru.grpc.response.metadata`,
 * `bru.grpc.response.trailers`.
 *
 * Request side: array-backed, exactly like `HeaderList`. The store is `request.headerEntries`;
 * `request.headers` is the `{ name: value }` projection the gRPC client builds `Metadata` from.
 * Writable in `beforeCallStart`, read-only once the call is open. See `utils/header-entries.js`.
 *
 * Response side: a static snapshot of the `[{ name, value }]` display rows, read-only.
 *
 * COMPAT: the constructor takes the request (or the rows) directly, the same shape as `HeaderList`.
 * It used to take a `readMetadata` accessor returning the `{ name: value }` map.
 *
 * Keep quickjs shim up to date on any updates to this class
 */
class GrpcMetadataList extends ReadOnlyPropertyList {
  #request;

  /**
   * @param {object|Array} source - The prepared gRPC request (its `headers` and `headerEntries`
   *   are the store, read live), or the `[{ name, value }]` rows of a response to snapshot.
   * @param {object} [options]
   * @param {boolean} [options.writable=false] - When false, write methods throw. A snapshot is
   *   never writable.
   */
  constructor(source, { writable = false } = {}) {
    const snapshot = !source || Array.isArray(source);
    super({
      caseInsensitiveKeys: true,
      writable: writable && !snapshot,
      // Reads hand out copies, so `one(k).disabled = true` on the result cannot bypass the write methods.
      ...(snapshot
        ? { items: snapshotHeaderEntries(source) }
        : { dataSource: () => liveHeaderEntries(source).map((entry) => ({ ...entry })) })
    });
    this.#request = snapshot ? null : source;
  }

  _readOnlyMessage(method) {
    return `metadata.${method}() is not available once the call has been sent — change metadata in the beforeCallStart hook`;
  }

  // ── Transform override ────────────────────────────────────────────────

  /** `key: value` per line — how metadata travels as HTTP/2 headers. Skips disabled entries. */
  toString() {
    return this.all()
      .filter((entry) => !entry.disabled)
      .map((entry) => `${entry.key}: ${entry.value}`)
      .join('\n');
  }

  // ── Write methods (edit the entries, then project into the headers map) ──

  /**
   * Insert a key, or update it in place when it already exists under any casing. The key ends
   * up enabled.
   *
   * @param {string} key
   * @param {*} value
   */
  upsert(key, value) {
    this._assertWritable('upsert');

    if (typeof key !== 'string' || !key.length) {
      return;
    }

    this.#write({ key, value, disabled: false });
  }

  /**
   * Upsert an entry from the `{ key, value, disabled? }` shape `all()` returns, so an entry read
   * from one list can be handed straight to another.
   *
   * @param {object} item
   */
  add(item) {
    this._assertWritable('add');

    if (!item || typeof item !== 'object' || typeof item.key !== 'string' || !item.key.length) {
      return;
    }

    this.#write({ key: item.key, value: item.value, disabled: item.disabled === true });
  }

  /**
   * Remove the entry with the given key, enabled or disabled.
   * @param {string} key
   */
  remove(key) {
    this._assertWritable('remove');

    const entries = liveHeaderEntries(this.#request);

    for (let i = entries.length - 1; i >= 0; i--) {
      if (this._keyMatches(entries[i].key, key)) {
        entries.splice(i, 1);
      }
    }

    projectHeaderEntries(entries, this.#request.headers);
  }

  /** Remove every entry, enabled and disabled. */
  clear() {
    this._assertWritable('clear');

    const entries = liveHeaderEntries(this.#request);

    // Emptied in place rather than reassigned: the request owns the array.
    entries.length = 0;

    projectHeaderEntries(entries, this.#request.headers);
  }

  #write({ key, value, disabled }) {
    const entries = liveHeaderEntries(this.#request);
    // A server reads `X-Token` and `x-token` as one key, so a re-cased write replaces in place
    // instead of leaving two entries the transport would send as duplicates.
    const existing = entries.find((entry) => this._keyMatches(entry.key, key));

    if (existing) {
      existing.key = key;
      existing.value = value;
      if (disabled) {
        existing.disabled = true;
      } else {
        delete existing.disabled;
      }
    } else {
      entries.push(disabled ? { key, value, disabled: true } : { key, value });
    }

    projectHeaderEntries(entries, this.#request.headers);
  }
}

module.exports = GrpcMetadataList;
