const PropertyList = require('./property-list');
const ReadOnlyPropertyList = require('./readonly-property-list');

/**
 * HeaderList — the `req.headerList` / `res.headerList` API in scripts.
 *
 * Extends PropertyList in dynamic mode: the header list is freshly read from the
 * request's headers object on every access, and write operations manipulate the
 * request config directly (preserving `__headersToDelete` tracking).
 *
 * Key differences from the base PropertyList:
 * - **Case-insensitive** key lookups (HTTP headers are case-insensitive)
 * - **Disabled headers** surfaced with `disabled: true`
 * - **Read-only mode** for response headers (write methods throw)
 * - Write operations manipulate the request config directly (preserving `__headersToDelete`)
 *
 * Accepts the raw request config object (`req`) directly — no dependency on BrunoRequest.
 * Access: `req.headerList` (PropertyList API) vs `req.headers` (raw headers object).
 *
 * ---
 *
 * ## Header object shape
 *
 * Every header surfaced by this list is a plain object:
 *
 * ```js
 * { key, value }              // enabled header
 * { key, value, disabled: true }  // disabled header
 * ```
 *
 * ---
 *
 * ## Read methods (case-insensitive key matching)
 *
 * | Method             | Description                                        | Example return value                            |
 * |--------------------|----------------------------------------------------|-------------------------------------------------|
 * | `get(name)`        | Value of the header with matching key              | `'application/json'`                            |
 * | `one(name)`        | Full header object for matching key                | `{ key: 'Content-Type', value: 'application/json' }` |
 * | `all()`            | Cloned array of all header objects                 | `[{ key: 'Content-Type', … }, …]`              |
 * | `idx(index)`       | Header at positional index                         | `{ key: 'Content-Type', … }`                   |
 * | `count()`          | Number of headers                                  | `3`                                             |
 *
 * ## Search methods (case-insensitive key matching)
 *
 * | Method             | Description                                        | Example return value |
 * |--------------------|----------------------------------------------------|----------------------|
 * | `has(name)`        | `true` if a header with that key exists            | `true`               |
 * | `has(name, value)` | `true` if key exists **and** value matches          | `false`              |
 * | `has(object)`      | `true` if a header with `object.key` exists         | `true`               |
 * | `find(fn, context?)`   | First header matching the predicate function       | `{ key: … }`         |
 * | `filter(fn, context?)` | Array of headers matching the predicate            | `[{ key: … }, …]`   |
 * | `indexOf(item)`    | Index of a header by string key or object, or `-1` | `0`                  |
 *
 * ## Iteration methods (optional `context` binds `this` in callbacks)
 *
 * | Method                       | Description                                  |
 * |------------------------------|----------------------------------------------|
 * | `each(fn, context?)`         | Calls `fn(header, index)` for every header   |
 * | `map(fn, context?)`          | Returns a new array of mapped values         |
 * | `reduce(fn, initial?, context?)` | Reduces headers to a single value        |
 *
 * ## Transform methods
 *
 * | Method                                                        | Description                                           |
 * |---------------------------------------------------------------|-------------------------------------------------------|
 * | `toObject(excludeDisabled?, caseSensitive?, multiValue?, sanitizeKeys?)` | `{ key: value }` map of all headers      |
 * | `toString()`                                                  | HTTP wire format `Key: Value\n...`, skips disabled     |
 * | `toJSON()`                                                    | Same as `all()` — suitable for `JSON.stringify()`      |
 *
 * ## Write methods (HeaderList overrides — synchronous, case-insensitive)
 *
 * | Method                        | Description                                              |
 * |-------------------------------|----------------------------------------------------------|
 * | `add(headerObj\|string)`      | Sets a header; accepts `{key,value}` or `"Key: Value"`    |
 * | `upsert(headerObj)`           | Sets (or replaces) a header; returns true/false/null      |
 * | `remove(predicate, context?)`     | Deletes header(s) by name, predicate, or object           |
 * | `clear()`                     | Removes **all** headers (enabled and disabled)            |
 * | `populate(items\|string)`     | Replaces all; accepts array or multi-line header string    |
 * | `repopulate(items)`           | Alias for `populate()`                                    |
 * | `assimilate(source, prune?)` | Merges headers; prune removes items not in source          |
 */
class HeaderList extends PropertyList {
  #req;
  #writable;

  /**
   * @param {object} source - Request config (dynamic mode) or response object
   *   (static mode). Both must have a `headers` property.
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
          const headers = source.headers || {};
          const enabled = Object.entries(headers).map(([key, value]) => ({ key, value }));
          const disabled = (source.disabledHeaders || []).map((h) => ({
            key: h.name,
            value: h.value,
            disabled: true
          }));
          return [...disabled, ...enabled];
        }
      });
      this.#req = source;
    } else {
      // Static read-only mode — snapshot of response headers
      const rawHeaders = (source && source.headers) || {};
      super({
        keyProperty: 'key',
        valueProperty: 'value',
        items: Object.entries(rawHeaders).map(([key, value]) => ({ key, value }))
      });
      this.#req = null;
    }
    this.#writable = writable;
  }

  #assertWritable() {
    if (!this.#writable) {
      throw new Error('HeaderList is read-only (response headers cannot be modified)');
    }
  }

  // ── Case-insensitive key helpers ──────────────────────────────────────

  /**
   * Case-insensitive string comparison.
   * @param {string} a
   * @param {string} b
   * @returns {boolean}
   */
  static #ciEquals(a, b) {
    return typeof a === 'string' && typeof b === 'string'
      ? a.toLowerCase() === b.toLowerCase()
      : a === b;
  }

  /**
   * Parse a "Key: Value" string into a { key, value } object.
   * @param {string} str
   * @returns {object|null}
   */
  static #parseHeaderString(str) {
    if (typeof str !== 'string') return null;
    const idx = str.indexOf(':');
    if (idx === -1) return null;
    return { key: str.substring(0, idx).trim(), value: str.substring(idx + 1).trim() };
  }

  // ── Read method overrides (case-insensitive) ──────────────────────────

  /**
   * Get the value of a header by key (case-insensitive).
   * @param {string} name
   * @returns {*}
   */
  get(name) {
    const item = this.all().findLast((i) => HeaderList.#ciEquals(i.key, name));
    return item ? item.value : undefined;
  }

  /**
   * Get the full header object by key (case-insensitive).
   * @param {string} name
   * @returns {object|undefined}
   */
  one(name) {
    return this.all().findLast((i) => HeaderList.#ciEquals(i.key, name));
  }

  /**
   * Check if a header exists (case-insensitive).
   * Accepts a string key, a string key + value, or an object with `key`.
   * @param {string|object} name - Header key string or object with `key` property
   * @param {*} [value]
   * @returns {boolean}
   */
  has(name, value) {
    if (name && typeof name === 'object' && name.key) {
      return this.all().some((i) => HeaderList.#ciEquals(i.key, name.key));
    }
    const items = this.all();
    if (value !== undefined) {
      return items.some((i) => HeaderList.#ciEquals(i.key, name) && i.value === value);
    }
    return items.some((i) => HeaderList.#ciEquals(i.key, name));
  }

  /**
   * Get the index of an item (case-insensitive key matching).
   * Accepts a string key or an object with { key, value }.
   * @param {string|object} item
   * @returns {number} -1 if not found
   */
  indexOf(item) {
    const items = this.all();
    if (typeof item === 'string') {
      return items.findIndex((i) => HeaderList.#ciEquals(i.key, item));
    }
    if (!item || typeof item !== 'object') return -1;
    return items.findIndex(
      (i) => HeaderList.#ciEquals(i.key, item.key) && i.value === item.value
    );
  }

  // ── Iteration overrides (optional context binding) ─────────────────

  /** @param {Function} fn @param {*} [context] */
  each(fn, context) {
    super.each(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] @returns {Array} */
  filter(fn, context) {
    return super.filter(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] @returns {object|undefined} */
  find(fn, context) {
    return super.find(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] @returns {Array} */
  map(fn, context) {
    return super.map(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [accumulator] @param {*} [context] @returns {*} */
  reduce(fn, ...args) {
    const hasAccumulator = args.length > 0;
    const hasContext = args.length > 1;
    const bound = hasContext ? fn.bind(args[1]) : fn;
    return hasAccumulator ? super.reduce(bound, args[0]) : super.reduce(bound);
  }

  // ── Write methods (direct request config manipulation) ────────────────

  /**
   * Add a header. Accepts a { key, value } object or a "Key: Value" string.
   * @param {object|string} item
   */
  add(item) {
    if (typeof item === 'string') {
      item = HeaderList.#parseHeaderString(item);
    }
    this.upsert(item);
  }

  /**
   * Set (or replace) a header on the request (case-insensitive key match).
   * @param {object} item - Header object with `key` and `value`.
   * @returns {boolean|null} `true` if added, `false` if updated, `null` if input was nil
   */
  upsert(item) {
    this.#assertWritable();
    if (!item || typeof item !== 'object' || !item.key) return null;
    const headers = this.#req.headers || {};
    const existingKey = Object.keys(headers).find(
      (k) => HeaderList.#ciEquals(k, item.key)
    );
    const existed = existingKey !== undefined;
    // Remove old-cased key if casing differs, tracking it for the axios interceptor
    if (existed && existingKey !== item.key) {
      this.#deleteHeader(existingKey);
    }
    headers[item.key] = item.value;
    return !existed;
  }

  /**
   * Remove header(s) matching a predicate, key string, or item reference.
   * String and object removal are case-insensitive.
   * @param {Function|string|object} predicate
   * @param {*} [context] - Bind `this` for function predicates
   */
  remove(predicate, context) {
    this.#assertWritable();
    if (typeof predicate === 'function') {
      const bound = context !== undefined ? predicate.bind(context) : predicate;
      const headers = this.all();
      for (const header of headers) {
        if (bound(header)) {
          if (header.disabled) {
            this.#removeDisabledHeader(header.key);
          } else {
            this.#deleteHeaderCI(header.key);
          }
        }
      }
    } else if (typeof predicate === 'string') {
      this.#deleteHeaderCI(predicate);
      this.#removeDisabledHeader(predicate);
    } else if (predicate && typeof predicate === 'object' && predicate.key) {
      this.#deleteHeaderCI(predicate.key);
      this.#removeDisabledHeader(predicate.key);
    }
  }

  /**
   * Delete a header by exact key and track it in `__headersToDelete`
   * so the axios interceptor can suppress default headers added later.
   * @param {string} name
   */
  #deleteHeader(name) {
    delete this.#req.headers[name];
    if (!this.#req.__headersToDelete) {
      this.#req.__headersToDelete = [];
    }
    if (!this.#req.__headersToDelete.includes(name)) {
      this.#req.__headersToDelete.push(name);
    }
  }

  /**
   * Delete an enabled header by key (case-insensitive).
   * @param {string} key
   */
  #deleteHeaderCI(key) {
    const headers = this.#req.headers || {};
    const matchingKey = Object.keys(headers).find(
      (k) => HeaderList.#ciEquals(k, key)
    );
    if (matchingKey) {
      this.#deleteHeader(matchingKey);
    }
  }

  /**
   * Remove all disabled headers matching a key (case-insensitive).
   * @param {string} key
   */
  #removeDisabledHeader(key) {
    const arr = this.#req.disabledHeaders;
    if (!arr) return;
    this.#req.disabledHeaders = arr.filter(
      (h) => !HeaderList.#ciEquals(h.name, key)
    );
  }

  /**
   * Remove all headers (enabled and disabled) from the request.
   */
  clear() {
    this.#assertWritable();
    const headers = this.all();
    for (const header of headers) {
      if (!header.disabled) {
        this.#deleteHeader(header.key);
      }
    }
    if (this.#req.disabledHeaders) {
      this.#req.disabledHeaders = [];
    }
  }

  /**
   * Replace all headers with a new set.
   * Accepts an array of { key, value } objects or a multi-line "Key: Value" string.
   * @param {Array|string} items
   */
  populate(items) {
    this.#assertWritable();
    this.clear();
    if (typeof items === 'string') {
      const lines = items.split(/\r?\n/).filter((l) => l.trim());
      for (const line of lines) {
        this.add(line);
      }
      return;
    }
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

  // ── Transform overrides ───────────────────────────────────────────────

  /**
   * Convert to a plain object. Matches Postman's PropertyList.toObject() signature.
   * @param {boolean} [excludeDisabled=false] - If true, skip disabled headers
   * @param {boolean} [caseSensitive=true] - If false, lowercase all keys
   * @param {boolean} [multiValue=false] - If true, only the first value of a duplicate key is kept
   * @param {boolean} [sanitizeKeys=false] - If true, skip headers with falsy keys
   * @returns {object}
   */
  toObject(excludeDisabled, caseSensitive, multiValue, sanitizeKeys) {
    const result = {};
    for (const item of this.all()) {
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

  /**
   * Convert to HTTP wire-format string, skipping disabled headers.
   * Matches Postman's Header.unparse() behavior: `Key: Value\n...`
   * @returns {string}
   */
  toString() {
    const headers = this.all().filter((h) => !h.disabled);
    if (headers.length === 0) return '';
    return headers.map((h) => `${h.key}: ${h.value}`).join('\n') + '\n';
  }

  /**
   * Merge items from another PropertyList or array.
   * @param {PropertyList|Array} source - Source of items to merge
   * @param {boolean} [prune=false] - If true, remove items not present in source after merging
   */
  assimilate(source, prune) {
    this.#assertWritable();
    let items;
    if (ReadOnlyPropertyList.isPropertyList(source)) {
      items = source.all();
    } else if (Array.isArray(source)) {
      items = source;
    } else {
      items = [];
    }
    // Merge source items into this list
    for (const item of items) {
      this.add(item);
    }
    // Prune: remove items from this list that are not in source
    if (prune && items.length > 0) {
      const sourceKeys = new Set(items.map((i) => (i.key || '').toLowerCase()));
      const toRemove = this.all().filter(
        (h) => !sourceKeys.has(h.key.toLowerCase())
      );
      for (const header of toRemove) {
        if (header.disabled) {
          this.#removeDisabledHeader(header.key);
        } else {
          this.#deleteHeader(header.key);
        }
      }
    }
  }
}

module.exports = HeaderList;
