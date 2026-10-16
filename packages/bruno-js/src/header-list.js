const ReadOnlyPropertyList = require('./readonly-property-list');

/*
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
 * | `add(headerObj\|name, value?)`    | Sets a header; accepts `{key,value}`, `"Key: Value"`, or `(name, value)` |
 * | `upsert(headerObj\|name, value?)` | Sets (or replaces) a header; returns true/false/null      |
 * | `remove(predicate, context?)`     | Deletes header(s) by name, predicate, or object           |
 * | `clear()`                         | Removes **all** headers (enabled and disabled)            |
 * | `populate(items\|string)`         | Adds items, skipping keys that already exist              |
 * | `repopulate(items)`               | Clears all, then populates with new items                 |
 * | `assimilate(source, prune?)`      | Merges headers; prune removes items not in source         |
 */

/**
 * An HTTP header.
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

  // ── Blocked inherited methods ─────────────────────────────────────────
  // idx is inherited from ReadOnlyPropertyList but not part of the
  // HeaderList API. Set to undefined so it is not callable.
  /** @internal */
  idx = undefined;

  // ── Read method overrides (case-insensitive) ──────────────────────────

  /**
   * Get the value of a header.
   *
   * Header names match case-insensitively. On `req.headerList` a disabled header counts too, but
   * an enabled header of the same name wins over it.
   * @param {string} name - The header's name.
   * @returns {any} The value, or `undefined` when there is no such header.
   * @example
   * const type = res.headerList.get('content-type');
   * @category Read
   */
  get(name) {
    const item = this.all().findLast((i) => HeaderList.#ciEquals(i.key, name));
    return item ? item.value : undefined;
  }

  /**
   * Get a header by name.
   *
   * Header names match case-insensitively. On `req.headerList` a disabled header counts too, but
   * an enabled header of the same name wins over it.
   * @param {string} name - The header's name.
   * @returns {Header | undefined} The header, or `undefined` when there is no such header.
   * @category Read
   */
  one(name) {
    return this.all().findLast((i) => HeaderList.#ciEquals(i.key, name));
  }

  /**
   * Check whether a header exists.
   *
   * Header names match case-insensitively.
   * @param {string | Header} name - A header name, or a header whose name to look for (its value is
   *   not compared).
   * @param {any} [value] - With a name, the header's value must also be equal (`===`) to it.
   * @returns {boolean} Whether a matching header exists.
   * @example
   * if (!req.headerList.has('authorization')) {
   *   req.headerList.add('Authorization', `Bearer ${bru.getEnvVar('token')}`);
   * }
   * @category Search
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
   * Get the position of a header.
   *
   * Header names match case-insensitively.
   * @param {string | Header} item - A header name, or a header to match by name and value.
   * @returns {number} The zero-based position of the first match, or `-1` when none matches.
   * @category Search
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

  /**
   * Call `fn` once for each header, in order.
   * @param {(item: Header, index: number) => void} fn - Called with each header and its position.
   * @param {any} [context] - The `this` of `fn`.
   * @category Iteration
   */
  each(fn, context) {
    super.each(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Get every header `fn` accepts.
   * @param {(item: Header, index: number) => boolean} fn - Called with each header and its position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {Header[]} The matching headers, in order.
   * @category Search
   */
  filter(fn, context) {
    return super.filter(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Get the first header `fn` accepts.
   * @param {(item: Header, index: number) => boolean} fn - Called with each header and its position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {Header | undefined} The header, or `undefined` when none matches.
   * @category Search
   */
  find(fn, context) {
    return super.find(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Build an array from the result of `fn` for each header.
   * @param {(item: Header, index: number) => any} fn - Called with each header and its position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {any[]} The results, in the order of the headers.
   * @example
   * const names = res.headerList.map((header) => header.key);
   * @category Iteration
   */
  map(fn, context) {
    return super.map(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Combine the headers into a single value, as `Array.prototype.reduce` does.
   *
   * Without `initialValue`, the first header is the starting value, and an empty list throws.
   * @type {(fn: (accumulator: any, item: Header, index: number) => any, initialValue?: any, context?: any) => any}
   * @param fn - Called with the value so far, each header and its position; returns the next value.
   * @param initialValue - The starting value.
   * @param context - The `this` of `fn`.
   * @category Iteration
   */
  reduce(fn, ...args) {
    const hasAccumulator = args.length > 0;
    const hasContext = args.length > 1;
    const bound = hasContext ? fn.bind(args[1]) : fn;
    return hasAccumulator ? super.reduce(bound, args[0]) : super.reduce(bound);
  }

  // ── Write methods (direct request config manipulation) ────────────────

  /**
   * Set a header on the request, the same as `upsert`.
   *
   * A `disabled` flag on the given header is ignored: the header is always sent.
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
   * Set a header on the request, replacing the enabled header of the same name.
   *
   * Header names match case-insensitively; the replaced header takes the new name's case. A
   * disabled header of that name stays in the list. A `disabled` flag on the given header is
   * ignored: the header is always sent.
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
    // Remove from __headersToDelete since we just (re-)added this header
    const toDelete = this.#req.__headersToDelete;
    if (toDelete) {
      const idx = toDelete.findIndex((k) => HeaderList.#ciEquals(k, item.key));
      if (idx !== -1) toDelete.splice(idx, 1);
    }
    return !existed;
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
   * Remove every header from the request, enabled and disabled.
   * @category Write
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
   * Convert the headers to HTTP `Name: value` lines, leaving out disabled headers.
   * @returns {string} One line per header, each ending in a newline, or `''` when there are none.
   * @category Transform
   */
  toString() {
    const headers = this.all().filter((h) => !h.disabled);
    if (headers.length === 0) return '';
    return headers.map((h) => `${h.key}: ${h.value}`).join('\n') + '\n';
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
