const ReadOnlyPropertyList = require('./readonly-property-list');
const { liveHeaderEntries, projectHeaderEntries, snapshotHeaderEntries } = require('./utils/header-entries');

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
 */

/**
 * A header of the request or the response.
 * @typedef {object} Header
 * @property {string} key - The header's name, in the case it was written in.
 * @property {*} value - The header's value; an array of values for a repeated response header.
 * @property {boolean} [disabled] - `true` for a header switched off in the request's Headers tab. It is not sent.
 */

/**
 * The read-only header list of a response.
 * @typedef {Omit<HeaderList, 'add' | 'upsert' | 'remove' | 'clear' | 'populate' | 'repopulate' | 'assimilate'>} ReadOnlyHeaderList
 */

/**
 * The headers of a request, as a list of `{ key, value, disabled? }` entries.
 *
 * Keys match case-insensitively, as HTTP header names do. Headers disabled in the request's
 * Headers tab are in the list with `disabled: true` and are not sent.
 * @extends {ReadOnlyPropertyList<Header>}
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

  /** @protected */
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
   * Set a header, replacing any header of the same name.
   *
   * Takes a header object, a `'Name: value'` string, or the name and value as two arguments.
   * @param {Header | string} itemOrName - A header, a `'Name: value'` string, or the header's name.
   * @param {*} [value] - The header's value, when `itemOrName` is its name.
   * @example
   * req.headerList.add({ key: 'X-Request-Id', value: bru.getVar('requestId') });
   * req.headerList.add('Accept: application/json');
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
   * Set a header, replacing any header of the same name, and report whether it was new.
   *
   * A header written with `disabled: true` stays in the list but is not sent; any other write
   * enables it.
   * @param {Header | string} itemOrName - A header, or the header's name.
   * @param {*} [value] - The header's value, when `itemOrName` is its name.
   * @returns {boolean | null} `true` when the header was added, `false` when it replaced one, and
   *   `null` when no header was given.
   * @example
   * req.headerList.upsert({ key: 'Authorization', value: `Bearer ${bru.getVar('token')}` });
   * @category Write
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
   * Remove headers by name, by a header object's name, or by a predicate.
   *
   * Removing a default header such as `User-Agent` keeps it from being sent at all.
   * @param {((header: Header) => unknown) | string | Header} predicate - A header name, a header,
   *   or a function that returns `true` for each header to remove.
   * @param {*} [context] - The `this` of a function `predicate`.
   * @example
   * req.headerList.remove('X-Debug');
   * req.headerList.remove((header) => header.key.startsWith('X-Internal-'));
   * @category Write
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
   * Remove every header, disabled ones included.
   * @category Write
   */
  clear() {
    this._assertWritable('clear');
    this.#removeWhere(() => true);
    this.#project();
  }

  /**
   * Add headers that aren't set yet; a header whose name is already in the list is skipped.
   * @param {Header[] | string} items - Headers, or `'Name: value'` lines.
   * @example
   * req.headerList.populate('Accept: application/json\nX-Client: bruno');
   * @category Write
   */
  // Postman's populate adds duplicate keys because Postman supports multiple headers with the same
  // name. Bruno does not, so existing keys are skipped to preserve the current value.
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
   * Replace every header with the given ones.
   * @param {Header[] | string} items - Headers, or `'Name: value'` lines.
   * @category Write
   */
  repopulate(items) {
    this.clear();
    this.populate(items);
  }

  /**
   * Set every header of another list, replacing headers of the same name.
   * @param {ReadOnlyHeaderList | Header[]} source - Another header list, such as `res.headerList`, or an array of headers.
   * @param {boolean} [prune] - Also remove the headers `source` doesn't have.
   * @category Write
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
   * Convert the headers to a `{ name: value }` object.
   *
   * An enabled header wins over a disabled one of the same name.
   * @param {boolean} [excludeDisabled] - Leave out disabled headers.
   * @param {boolean} [caseSensitive] - `false` lower-cases every name.
   * @param {boolean} [multiValue] - Keep the first value of a repeated name instead of the last.
   * @param {boolean} [sanitizeKeys] - Leave out headers with an empty name.
   * @returns {Record<string, any>} The values, by header name.
   * @example
   * const headers = req.headerList.toObject(true);
   * @category Transform
   */
  // Matches Postman's PropertyList.toObject() signature.
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
   * Convert the enabled headers to HTTP format: one `Name: value` line per header.
   * @returns {string} The header lines, each ending in a newline; `''` when there are none.
   * @category Transform
   */
  // Matches Postman's Header.unparse() behavior.
  toString() {
    const headers = this.all().filter((h) => !h.disabled);
    if (headers.length === 0) return '';
    return headers.map((h) => `${h.key}: ${h.value}`).join('\n') + '\n';
  }
}

module.exports = HeaderList;
