const ReadOnlyPropertyList = require('./readonly-property-list');
const { liveHeaderEntries, projectHeaderEntries, snapshotHeaderEntries } = require('./utils/header-entries');

/**
 * HeaderList — the `req.headerList` / `res.headerList` API in scripts.
 *
 * Request side (writable): array-backed. The store is `req.headerEntries`, an ordered array of
 * `{ key, value, disabled? }` on the prepared request; `req.headers` is the `{ name: value }`
 * projection of its enabled entries that transport and `req.headers` in scripts use. Reads
 * reconcile the object into the entries first (so `req.headers.x = 'y'`, `req.setHeader()` and
 * headers added by prepare or interpolation show up), writes edit the entries and project them
 * back. See `utils/header-entries.js`.
 *
 * Response side (read-only): a static snapshot of `res.headers`.
 *
 * Key differences from the base ReadOnlyPropertyList:
 * - **Case-insensitive** key lookups (HTTP headers are case-insensitive)
 * - **Disabled headers** surfaced with `disabled: true`
 * - **Read-only mode** for response headers (write methods throw)
 * - Deleted or disabled headers are tracked in `req.__headersToDelete` so the axios interceptor
 *   keeps suppressing defaults (User-Agent, Accept-Encoding) that axios adds after the script ran
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
 * | Method                            | Description                                              |
 * |-----------------------------------|----------------------------------------------------------|
 * | `add(headerObj\|name, value?)`    | Sets a header; accepts `{key,value,disabled?}`, `"Key: Value"`, or `(name, value)` |
 * | `upsert(headerObj\|name, value?)` | Sets (or replaces) a header; returns true/false/null      |
 * | `remove(predicate, context?)`     | Deletes header(s) by name, predicate, or object           |
 * | `clear()`                         | Removes **all** headers (enabled and disabled)            |
 * | `populate(items\|string)`         | Adds items, skipping keys that already exist              |
 * | `repopulate(items)`               | Clears all, then populates with new items                 |
 * | `assimilate(source, prune?)`      | Merges headers; prune removes items not in source         |
 */
class HeaderList extends ReadOnlyPropertyList {
  #req;

  /**
   * @param {object} source - Request config (writable, dynamic mode) or response object
   *   (read-only, static snapshot). Both must have a `headers` property.
   * @param {object} [options]
   * @param {boolean} [options.writable=true] - When false, write methods throw.
   */
  constructor(source, { writable = true } = {}) {
    super({
      caseInsensitiveKeys: true,
      writable,
      // Writable: every read reconciles req.headers into req.headerEntries and hands out copies,
      // so `one(k).disabled = true` on the result cannot bypass the write methods.
      // Read-only: static snapshot of response headers.
      ...(writable
        ? { dataSource: () => liveHeaderEntries(source).map((entry) => ({ ...entry })) }
        : { items: snapshotHeaderEntries(source?.headers) })
    });
    this.#req = writable ? source : null;
  }

  _readOnlyMessage() {
    return 'HeaderList is read-only (response headers cannot be modified)';
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

  // ── Store access ───────────────────────────────────────────────────────

  /** The live, reconciled entries array (never handed to scripts). */
  #entries() {
    return liveHeaderEntries(this.#req);
  }

  /** Push the entries back into `req.headers` after a write. */
  #project() {
    projectHeaderEntries(this.#req.headerEntries, this.#req.headers);
  }

  /**
   * Remember an enabled header the script removed, so the axios interceptor can suppress a
   * default header of that name that axios would otherwise add back after the script.
   * @param {string} name - Exact key
   */
  #trackDeleted(name) {
    const toDelete = (this.#req.__headersToDelete ??= []);
    if (!toDelete.includes(name)) {
      toDelete.push(name);
    }
  }

  /** Forget a tracked deletion once the header is (re-)enabled, case-insensitively. */
  #untrackDeleted(key) {
    const toDelete = this.#req.__headersToDelete;
    if (!toDelete) return;
    const idx = toDelete.findIndex((name) => this._keyMatches(name, key));
    if (idx !== -1) toDelete.splice(idx, 1);
  }

  /**
   * Splice out every entry the predicate matches; removed enabled headers are tracked.
   * The predicate sees a copy, like every other callback.
   * @param {Function} matches
   */
  #removeWhere(matches) {
    const entries = this.#entries();
    for (let i = entries.length - 1; i >= 0; i--) {
      if (matches({ ...entries[i] })) {
        if (!entries[i].disabled) {
          this.#trackDeleted(entries[i].key);
        }
        entries.splice(i, 1);
      }
    }
  }

  // ── Write methods ──────────────────────────────────────────────────────

  /**
   * Add a header. Accepts a { key, value } object, a "Key: Value" string,
   * or two arguments (name, value). Delegates to upsert().
   *
   * @param {object|string} itemOrName - Header object, "Key: Value" string, or header name
   * @param {string} [value] - Header value (when using two-arg form)
   */
  add(itemOrName, value) {
    if (typeof itemOrName === 'string' && value !== undefined) {
      this.upsert({ key: itemOrName, value });
      return;
    }
    if (typeof itemOrName === 'string') {
      itemOrName = HeaderList.#parseHeaderString(itemOrName);
    }
    this.upsert(itemOrName);
  }

  /**
   * Set (or replace) a header on the request (case-insensitive key match).
   * Accepts a { key, value, disabled? } object or two arguments (name, value).
   * A key holds exactly one state after a write: `disabled: true` keeps it out of `req.headers`,
   * otherwise it lands there.
   * @param {object|string} itemOrName - Header object with `key` and `value`, or header name
   * @param {string} [value] - Header value (when using two-arg form)
   * @returns {boolean|null} `true` if added, `false` if updated, `null` if input was nil
   */
  upsert(itemOrName, value) {
    this._assertWritable('upsert');
    let item = itemOrName;
    if (typeof itemOrName === 'string') {
      item = { key: itemOrName, value };
    }
    if (!item || typeof item !== 'object' || !item.key) return null;

    const disabled = item.disabled === true;
    const entries = this.#entries();
    const existing = entries.find((entry) => this._keyMatches(entry.key, item.key));

    if (existing) {
      // COMPAT: the entry is updated in place and keeps its position. Before the array store a
      // re-cased key was deleted from `req.headers` and re-added, which moved it to the end.
      if (!existing.disabled && (existing.key !== item.key || disabled)) {
        // The old exact key is what axios would see when it adds defaults back.
        this.#trackDeleted(existing.key);
      }
      existing.key = item.key;
      existing.value = item.value;
      if (disabled) {
        existing.disabled = true;
      } else {
        delete existing.disabled;
      }
    } else {
      entries.push(disabled ? { key: item.key, value: item.value, disabled: true } : { key: item.key, value: item.value });
    }

    if (!disabled) {
      this.#untrackDeleted(item.key);
    }
    this.#project();
    return !existing;
  }

  /**
   * Remove header(s) matching a predicate, key string, or item reference.
   * String and object removal are case-insensitive.
   * @param {Function|string|object} predicate
   * @param {*} [context] - Bind `this` for function predicates
   */
  remove(predicate, context) {
    this._assertWritable('remove');
    let matches;
    if (typeof predicate === 'function') {
      matches = this._bind(predicate, context);
    } else if (typeof predicate === 'string') {
      matches = (header) => this._keyMatches(header.key, predicate);
    } else if (predicate && typeof predicate === 'object' && predicate.key) {
      matches = (header) => this._keyMatches(header.key, predicate.key);
    } else {
      return;
    }
    this.#removeWhere(matches);
    this.#project();
  }

  /**
   * Remove all headers (enabled and disabled) from the request.
   */
  clear() {
    this._assertWritable('clear');
    this.#removeWhere(() => true);
    this.#project();
  }

  /**
   * Load one or more headers into the list (without clearing existing ones).
   * Accepts an array of { key, value } objects or a multi-line "Key: Value" string.
   *
   * Headers whose key already exists are skipped (case-insensitive).
   * Note: Postman's populate adds duplicate keys because Postman supports
   * multiple headers with the same name. Bruno does not, so we skip
   * existing keys to preserve the current value.
   *
   * @param {Array|string} items
   */
  populate(items) {
    this._assertWritable('populate');
    if (typeof items === 'string') {
      const lines = items.split(/\r?\n/).filter((l) => l.trim());
      for (const line of lines) {
        const parsed = HeaderList.#parseHeaderString(line);
        if (parsed && !this.has(parsed.key)) {
          this.add(parsed);
        }
      }
      return;
    }
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
      if (item && item.key && !this.has(item.key)) {
        this.add(item);
      }
    }
  }

  /**
   * Clear all headers and repopulate with new items.
   * @param {Array|string} items
   */
  repopulate(items) {
    this.clear();
    this.populate(items);
  }

  /**
   * Merge items from another property list or array.
   * @param {ReadOnlyPropertyList|Array} source - Source of items to merge
   * @param {boolean} [prune=false] - If true, remove items not present in source after merging
   */
  assimilate(source, prune) {
    this._assertWritable('assimilate');
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
    if (prune && items.length > 0) {
      const sourceKeys = new Set(items.map((i) => (i.key || '').toLowerCase()));
      this.#removeWhere((header) => !sourceKeys.has(header.key.toLowerCase()));
      this.#project();
    }
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
    const items = this.all();
    // Disabled entries go in first so an enabled entry with the same key always wins the map,
    // whatever their relative order in the list.
    const ordered = [...items.filter((h) => h.disabled), ...items.filter((h) => !h.disabled)];
    for (const item of ordered) {
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
}

module.exports = HeaderList;
