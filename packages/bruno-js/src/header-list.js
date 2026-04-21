const PropertyList = require('./property-list');
const ReadOnlyPropertyList = require('./readonly-property-list');

/**
 * HeaderList — the `req.headerList` API for reading and writing headers in scripts.
 *
 * Extends PropertyList in dynamic mode: the header list is freshly read from the
 * request's headers object on every access, and write operations delegate to the
 * BrunoRequest instance (preserving `__headersToDelete` tracking).
 *
 * Access: `req.headerList` (PropertyList API) vs `req.headers` (raw headers object).
 *
 * ---
 *
 * ## Header object shape
 *
 * Every header surfaced by this list is a plain object:
 *
 * ```js
 * { key, value }
 * ```
 *
 * ---
 *
 * ## Read methods (inherited from ReadOnlyPropertyList)
 *
 * | Method             | Description                                        | Example return value                            |
 * |--------------------|----------------------------------------------------|-------------------------------------------------|
 * | `get(name)`        | Value of the header with `key === name`            | `'application/json'`                            |
 * | `one(name)`        | Full header object for `key === name`              | `{ key: 'Content-Type', value: 'application/json' }` |
 * | `all()`            | Cloned array of all header objects                 | `[{ key: 'Content-Type', … }, …]`              |
 * | `idx(index)`       | Header at positional index                         | `{ key: 'Content-Type', … }`                   |
 * | `count()`          | Number of headers                                  | `3`                                             |
 *
 * ## Search methods (inherited)
 *
 * | Method             | Description                                        | Example return value |
 * |--------------------|----------------------------------------------------|----------------------|
 * | `has(name)`        | `true` if a header with that key exists            | `true`               |
 * | `has(name, value)` | `true` if key exists **and** value matches          | `false`              |
 * | `find(predicate)`  | First header matching the predicate function       | `{ key: … }`         |
 * | `filter(predicate)`| Array of headers matching the predicate            | `[{ key: … }, …]`   |
 * | `indexOf(item)`    | Index of a structurally-equal header, or `-1`      | `0`                  |
 *
 * ## Iteration methods (inherited)
 *
 * | Method                  | Description                                  |
 * |-------------------------|----------------------------------------------|
 * | `each(fn)`              | Calls `fn(header, index)` for every header   |
 * | `map(fn)`               | Returns a new array of mapped values         |
 * | `reduce(fn, initial?)`  | Reduces headers to a single value            |
 *
 * ## Transform methods (inherited)
 *
 * | Method        | Description                                           | Example return value                              |
 * |---------------|-------------------------------------------------------|---------------------------------------------------|
 * | `toObject()`  | `{ key: value }` map of all headers                   | `{ 'Content-Type': 'application/json' }`          |
 * | `toString()`  | Semicolon-separated `key=value` string                 | `'Content-Type=application/json; Accept=*\/*'`    |
 * | `toJSON()`    | Same as `all()` — suitable for `JSON.stringify()`      | `[{ key: 'Content-Type', … }]`                    |
 *
 * ## Write methods (HeaderList overrides — synchronous)
 *
 * | Method                   | Description                                          |
 * |--------------------------|------------------------------------------------------|
 * | `add(headerObj)`         | Sets a header (delegates to BrunoRequest.setHeader)   |
 * | `upsert(headerObj)`      | Sets (or replaces) a header                           |
 * | `remove(predicate)`      | Deletes header(s) by name, predicate, or object       |
 * | `clear()`                | Removes **all** headers                               |
 * | `populate(items)`        | Replaces all headers with a new set                   |
 * | `repopulate(items)`      | Alias for `populate()`                                |
 * | `prepend(item)`          | Alias for `add()` (headers are unordered)             |
 * | `append(item)`           | Alias for `add()`                                     |
 * | `insert(item)`           | Alias for `add()`                                     |
 * | `insertAfter(item)`      | Alias for `add()`                                     |
 * | `assimilate(source, prune)` | Merges headers from another source                 |
 */
class HeaderList extends PropertyList {
  /**
   * @param {BrunoRequest|object} source - BrunoRequest instance (dynamic mode)
   *   or a plain headers object (static mode).
   * @param {object} [options]
   * @param {boolean} [options.writable=true] - When false, write methods throw.
   */
  constructor(source, { writable = true } = {}) {
    if (writable) {
      // Dynamic mode — reads always reflect current req.headers
      super({
        keyProperty: 'key',
        valueProperty: 'value',
        dataSource: () => {
          const headers = source.req.headers || {};
          return Object.entries(headers).map(([key, value]) => ({ key, value }));
        }
      });
      this._brunoRequest = source;
    } else {
      // Static read-only mode — snapshot of response headers
      const rawHeaders = source || {};
      super({
        keyProperty: 'key',
        valueProperty: 'value',
        items: Object.entries(rawHeaders).map(([key, value]) => ({ key, value }))
      });
      this._brunoRequest = null;
    }
    this._writable = writable;
  }

  _assertWritable() {
    if (!this._writable) {
      throw new Error('HeaderList is read-only (response headers cannot be modified)');
    }
  }

  // ── Write methods (BrunoRequest delegation) ──────────────────────────

  /**
   * Add a header (alias for {@link HeaderList#upsert}).
   * @param {object} item - Header object with `key` and `value`.
   */
  add(item) {
    this.upsert(item);
  }

  /**
   * Alias for {@link HeaderList#add}.
   * @param {object} item
   */
  append(item) {
    this.add(item);
  }

  /**
   * Alias for {@link HeaderList#add} (headers are unordered).
   * @param {object} item
   */
  prepend(item) {
    this.add(item);
  }

  /**
   * Alias for {@link HeaderList#add} (headers are unordered).
   * @param {object} item
   */
  insert(item) {
    this.add(item);
  }

  /**
   * Alias for {@link HeaderList#add} (headers are unordered).
   * @param {object} item
   */
  insertAfter(item) {
    this.add(item);
  }

  /**
   * Set (or replace) a header on the request.
   * @param {object} item - Header object with `key` and `value`.
   */
  upsert(item) {
    this._assertWritable();
    if (!item || typeof item !== 'object' || !item.key) return;
    this._brunoRequest.setHeader(item.key, item.value);
  }

  /**
   * Remove header(s) matching a predicate, key string, or item reference.
   * Delegates to BrunoRequest.deleteHeader to preserve `__headersToDelete` tracking.
   * @param {Function|string|object} predicate
   */
  remove(predicate) {
    this._assertWritable();
    if (typeof predicate === 'function') {
      const headers = this.all();
      for (const header of headers) {
        if (predicate(header)) {
          this._brunoRequest.deleteHeader(header.key);
        }
      }
    } else if (typeof predicate === 'string') {
      this._brunoRequest.deleteHeader(predicate);
    } else if (predicate && typeof predicate === 'object' && predicate.key) {
      this._brunoRequest.deleteHeader(predicate.key);
    }
  }

  /**
   * Remove all headers from the request.
   */
  clear() {
    this._assertWritable();
    const headers = this.all();
    for (const header of headers) {
      this._brunoRequest.deleteHeader(header.key);
    }
  }

  /**
   * Replace all headers with a new set.
   * @param {Array} items - Array of `{ key, value }` objects
   */
  populate(items) {
    this._assertWritable();
    this.clear();
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
      this.add(item);
    }
  }

  /**
   * Clear and repopulate with new items.
   * @param {Array} items
   */
  repopulate(items) {
    this.populate(items);
  }

  /**
   * Merge items from another PropertyList or array.
   * @param {PropertyList|Array} source - Source of items to merge
   * @param {boolean} [prune=false] - If true, clear existing items first
   */
  assimilate(source, prune) {
    this._assertWritable();
    if (prune) {
      this.clear();
    }
    let items;
    if (ReadOnlyPropertyList.isPropertyList(source)) {
      items = source.all();
    } else if (Array.isArray(source)) {
      items = source;
    } else {
      items = [];
    }
    for (const item of items) {
      this.add(item);
    }
  }
}

module.exports = HeaderList;
