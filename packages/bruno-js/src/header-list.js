const ReadOnlyPropertyList = require('./readonly-property-list');
const {
  headerEntriesToObject,
  liveHeaderEntries,
  orderedHeaderEntries,
  projectHeaderEntries,
  snapshotHeaderEntries
} = require('./utils/header-entries');

/*
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

/**
 * An HTTP header.
 * @category Types
 * @typedef {object} Header
 * @property {string} key - The header's name.
 * @property {any} value - The header's value: usually a string, and an array for a repeated
 *   response header such as `set-cookie`.
 * @property {boolean} [disabled] - `true` for a request header that is disabled, so not sent.
 */

/**
 * The response's headers: a header list without the methods that change it.
 * @typedef {Omit<HeaderList, 'add' | 'upsert' | 'remove' | 'clear' | 'populate' | 'repopulate' | 'assimilate'>} ReadOnlyHeaderList
 */

/**
 * HTTP headers, as a list of `{ key, value }` entries. Header names match case-insensitively.
 *
 * On `req.headerList` the request's disabled headers are listed too, with `disabled: true`.
 * @extends {ReadOnlyPropertyList<Header>}
 */
class HeaderList extends ReadOnlyPropertyList {
  #req;
  #writable;

  /**
   * @param {object} source - Request config (writable, dynamic mode) or response object
   *   (read-only, static snapshot). Both must have a `headers` property.
   * @param {object} [options]
   * @param {boolean} [options.writable=true] - When false, write methods throw.
   */
  constructor(source, { writable = true } = {}) {
    super({
      caseInsensitiveKeys: true,
      // Writable: every read reconciles req.headers into req.headerEntries and hands out copies,
      // so `one(k).disabled = true` on the result cannot bypass the write methods.
      // Read-only: static snapshot of response headers.
      ...(writable
        ? { dataSource: () => orderedHeaderEntries(source) }
        : { items: snapshotHeaderEntries(source?.headers) })
    });
    this.#req = writable ? source : null;
    this.#writable = writable;
  }

  #assertWritable() {
    if (!this.#writable) {
      throw new Error('HeaderList is read-only (response headers cannot be modified)');
    }
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
   * Set a header on the request, the same as `upsert`.
   *
   * A header with `disabled: true` is listed but not sent.
   * @param {Header | string} itemOrName - A header, a `Name: value` string, or a header name.
   * @param {string} [value] - The value, with a header name.
   * @example
   * req.headerList.add('X-Request-Id', String(Date.now()));
   * req.headerList.add({ key: 'Accept', value: 'application/json' });
   * @category Write
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
   * Set a header on the request, replacing the header of the same name.
   *
   * Header names match case-insensitively; the replaced header takes the new name's case. It
   * replaces an enabled or a disabled header, so upserting a disabled header's name enables it. A
   * header with `disabled: true` is listed but not sent, and disables a header it replaces.
   * @param {Header | string} itemOrName - A header, or a header name.
   * @param {string} [value] - The value, with a header name.
   * @returns {boolean | null | undefined} `true` when the header is new, `false` when it replaced
   *   one, and `null` when no name was given. Safe Mode always returns `undefined`.
   * @example
   * req.headerList.upsert('Content-Type', 'application/json');
   * @category Write
   */
  upsert(itemOrName, value) {
    this.#assertWritable();
    let item = itemOrName;
    if (typeof itemOrName === 'string') {
      item = { key: itemOrName, value };
    }
    if (!item || typeof item !== 'object' || !item.key) return null;

    const disabled = item.disabled === true;
    const entries = this.#entries();
    const firstMatch = entries.find((entry) => this._keyMatches(entry.key, item.key));
    // COMPAT: the request can carry two casings of one header (collection `X-Token`, request
    // `x-token`). Like the pre-refactor upsert, an exact key wins and the first variant is dropped;
    // renaming the first in place would leave a duplicate whose older value wins the projection.
    const existing = entries.find((entry) => entry.key === item.key) ?? firstMatch;

    if (firstMatch && firstMatch !== existing) {
      if (!firstMatch.disabled) {
        this.#trackDeleted(firstMatch.key);
      }
      entries.splice(entries.indexOf(firstMatch), 1);
    }

    if (existing && !existing.disabled && (existing.key !== item.key || disabled)) {
      // The old exact key is what axios would see when it adds defaults back.
      this.#trackDeleted(existing.key);
    }

    const entry = existing ?? {};
    if (!existing) {
      entries.push(entry);
    }
    entry.key = item.key;
    entry.value = item.value;
    if (disabled) {
      entry.disabled = true;
    } else {
      delete entry.disabled;
    }

    if (!disabled) {
      this.#untrackDeleted(item.key);
    }
    this.#project();
    return !existing;
  }

  /**
   * Remove headers from the request, enabled and disabled.
   *
   * With a name, or a header (matched by name only), it removes every header of that name; names
   * match case-insensitively. With a function, it removes every header the function accepts.
   * @param {string | Header | ((header: Header) => boolean)} predicate - A header name, a header,
   *   or a function that returns `true` for the headers to remove.
   * @param {any} [context] - The `this` of a function `predicate`. Safe Mode ignores it.
   * @example
   * req.headerList.remove('x-debug');
   * req.headerList.remove((header) => header.key.startsWith('x-internal-'));
   * @category Write
   */
  remove(predicate, context) {
    this.#assertWritable();
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
   * Remove every header from the request, enabled and disabled.
   * @category Write
   */
  clear() {
    this.#assertWritable();
    this.#removeWhere(() => true);
    this.#project();
  }

  /**
   * Add headers whose names are not in the list yet.
   *
   * A header whose name is already listed, enabled or disabled, is skipped, so the current value
   * stays. Header names match case-insensitively.
   * @param {Header[] | string} items - Headers, or `Name: value` lines.
   * @example
   * req.headerList.populate('Accept: application/json\nX-Client: bruno');
   * @category Write
   */
  populate(items) {
    this.#assertWritable();
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
   * Replace every header with the given ones, as `clear()` and then `populate(items)`.
   * @param {Header[] | string} items - Headers, or `Name: value` lines.
   * @category Write
   */
  repopulate(items) {
    this.clear();
    this.populate(items);
  }

  /**
   * Set every header of `source` on the request, replacing same-name headers.
   * @param {ReadOnlyHeaderList | Header[]} source - A header list, such as `res.headerList`, or an
   *   array of headers.
   * @param {boolean} [prune] - `true` also removes the headers whose names are not in `source`. An
   *   empty `source` removes nothing.
   * @category Write
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
   * Convert the headers to a `{ name: value }` object.
   *
   * By default a later header of a name wins, so an enabled header wins over a disabled one.
   * @param {boolean} [excludeDisabled] - `true` leaves out disabled headers.
   * @param {boolean} [caseSensitive] - `false` lowercases the names.
   * @param {boolean} [multiValue] - `true` keeps the first value of a repeated name instead of the
   *   last.
   * @param {boolean} [sanitizeKeys] - `true` leaves out headers with an empty name.
   * @returns {Record<string, any>} The object.
   * @example
   * const headers = req.headerList.toObject(true);
   * @category Transform
   */
  toObject(excludeDisabled, caseSensitive, multiValue, sanitizeKeys) {
    return headerEntriesToObject(this.all(), excludeDisabled, caseSensitive, multiValue, sanitizeKeys);
  }

  /**
   * Convert the headers to HTTP `Name: value` lines, leaving out disabled headers.
   * @returns {string} One line per header, each ending in a newline, or `''` when there are none.
   * @category Transform
   */
  toString() {
    const headers = this.all().filter((h) => !h.disabled);
    if (headers.length === 0) return '';
    return headers.map((h) => `${h.key}: ${h.value}`).join('\n') + '\n';
  }
}

module.exports = HeaderList;
