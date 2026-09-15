const { setMetadataKey } = require('../../grpc/grpc-metadata');
const { findKeyCI } = require('../key-matching');

/**
 * GrpcMetadataStore — StoreAdapter over the live `{ key: value }` metadata map.
 *
 * A writable surface needs `readMetadata` to return the same live object every
 * call, since that object is what writes edit.
 */
class GrpcMetadataStore {
  #readMetadata;

  /**
   * @param {Function} readMetadata - Returns the `{ key: value }` map backing the list
   */
  constructor(readMetadata) {
    this.#readMetadata = readMetadata;
  }

  read() {
    return Object.entries(this.#readMetadata()).map(([key, value]) => ({ key, value }));
  }

  /**
   * Insert a key, or update it in place when it already exists.
   * @param {string} key
   * @param {*} value
   */
  upsert(key, value) {
    if (typeof key !== 'string' || !key.length) {
      return;
    }
    const metadata = this.#readMetadata();
    const existing = findKeyCI(metadata, key);
    // A server reads `X-Token` and `x-token` as one key, so a re-cased upsert replaces instead of
    // leaving two entries the transport would send as duplicates.
    if (existing !== undefined && existing !== key) {
      delete metadata[existing];
    }
    setMetadataKey(metadata, key, value);
  }

  /**
   * Upsert an entry from the `{ key, value }` shape `all()` returns, so an entry read
   * from one list can be handed straight to another.
   * @param {object} item
   */
  add(item) {
    if (!item || typeof item !== 'object') {
      return;
    }
    this.upsert(item.key, item.value);
  }

  /**
   * Remove the entry with the given key (case-insensitive).
   * @param {string} key
   */
  remove(key) {
    const metadata = this.#readMetadata();
    const existing = findKeyCI(metadata, key);
    if (existing !== undefined) {
      delete metadata[existing];
    }
  }

  /** Remove every entry — emptied in place rather than reassigned. */
  clear() {
    const metadata = this.#readMetadata();
    for (const key of Object.keys(metadata)) {
      delete metadata[key];
    }
  }
}

module.exports = GrpcMetadataStore;
