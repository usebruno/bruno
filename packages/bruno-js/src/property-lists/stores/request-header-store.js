const { PropertyList } = require('../property-list');
const { ciEquals, findKeyCI } = require('../key-matching');

/**
 * Parse a "Key: Value" string into a { key, value } object.
 */
const parseHeaderString = (str) => {
  if (typeof str !== 'string') return null;
  const idx = str.indexOf(':');
  if (idx === -1) return null;
  return { key: str.substring(0, idx).trim(), value: str.substring(idx + 1).trim() };
};

/**
 * RequestHeaderStore — StoreAdapter over the live request config.
 *
 * Reads rebuild the list from `req.headers` (enabled) and `req.disabledHeaders`
 * (surfaced with `disabled: true`) on every call, so the list can never diverge
 * from the raw `req.headers` object scripts also touch directly. Writes manipulate
 * the request config in place, preserving `__headersToDelete` tracking so the
 * axios interceptor can suppress default headers added after the script ran.
 *
 * Header object shape: `{ key, value }` for enabled, `{ key, value, disabled: true }`
 * for disabled headers.
 */
class RequestHeaderStore {
  #req;

  /**
   * @param {object} req - The raw request config (must have a `headers` property)
   */
  constructor(req) {
    this.#req = req;
  }

  read() {
    const headers = this.#req.headers || {};
    const enabled = Object.entries(headers).map(([key, value]) => ({ key, value }));
    const disabled = (this.#req.disabledHeaders || []).map((h) => ({
      key: h.name,
      value: h.value,
      disabled: true
    }));
    return [...disabled, ...enabled];
  }

  #hasKey(key) {
    return this.read().some((i) => ciEquals(i.key, key));
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
    const matchingKey = findKeyCI(this.#req.headers || {}, key);
    if (matchingKey !== undefined) {
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
    this.#req.disabledHeaders = arr.filter((h) => !ciEquals(h.name, key));
  }

  // ── Write methods ──────────────────────────────────────────────────────

  /**
   * Add a header. Accepts a { key, value } object, a "Key: Value" string,
   * or two arguments (name, value). Delegates to upsert().
   * @param {object|string} itemOrName
   * @param {string} [value]
   */
  add(itemOrName, value) {
    if (typeof itemOrName === 'string' && value !== undefined) {
      this.upsert({ key: itemOrName, value });
      return;
    }
    if (typeof itemOrName === 'string') {
      itemOrName = parseHeaderString(itemOrName);
    }
    this.upsert(itemOrName);
  }

  /**
   * Set (or replace) a header on the request (case-insensitive key match).
   * Accepts a { key, value } object or two arguments (name, value).
   * @param {object|string} itemOrName
   * @param {string} [value]
   * @returns {boolean|null} `true` if added, `false` if updated, `null` if input was nil
   */
  upsert(itemOrName, value) {
    let item = itemOrName;
    if (typeof itemOrName === 'string') {
      item = { key: itemOrName, value };
    }
    if (!item || typeof item !== 'object' || !item.key) return null;
    const headers = this.#req.headers || {};
    const existingKey = findKeyCI(headers, item.key);
    const existed = existingKey !== undefined;
    // Remove old-cased key if casing differs, tracking it for the axios interceptor
    if (existed && existingKey !== item.key) {
      this.#deleteHeader(existingKey);
    }
    headers[item.key] = item.value;
    // Remove from __headersToDelete since we just (re-)added this header
    const toDelete = this.#req.__headersToDelete;
    if (toDelete) {
      const idx = toDelete.findIndex((k) => ciEquals(k, item.key));
      if (idx !== -1) toDelete.splice(idx, 1);
    }
    return !existed;
  }

  /**
   * Remove header(s) matching a predicate, key string, or item reference.
   * String and object removal are case-insensitive.
   * @param {Function|string|object} predicate
   * @param {*} [context] - Bind `this` for function predicates
   */
  remove(predicate, context) {
    if (typeof predicate === 'function') {
      const bound = context !== undefined ? predicate.bind(context) : predicate;
      for (const header of this.read()) {
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
   * Remove all headers (enabled and disabled) from the request.
   */
  clear() {
    for (const header of this.read()) {
      if (!header.disabled) {
        this.#deleteHeader(header.key);
      }
    }
    if (this.#req.disabledHeaders) {
      this.#req.disabledHeaders = [];
    }
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
    if (typeof items === 'string') {
      const lines = items.split(/\r?\n/).filter((l) => l.trim());
      for (const line of lines) {
        const parsed = parseHeaderString(line);
        if (parsed && !this.#hasKey(parsed.key)) {
          this.add(parsed);
        }
      }
      return;
    }
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
      if (item && item.key && !this.#hasKey(item.key)) {
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
   * Merge items from another PropertyList or array.
   * @param {PropertyList|Array} source
   * @param {boolean} [prune=false] - If true, remove items not present in source after merging
   */
  assimilate(source, prune) {
    let items;
    if (PropertyList.isPropertyList(source)) {
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
      const toRemove = this.read().filter((h) => !sourceKeys.has(h.key.toLowerCase()));
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

module.exports = RequestHeaderStore;
