const ReadOnlyPropertyList = require('./readonly-property-list');

/**
 * PropertyList - A mutable collection data structure.
 *
 * Extends ReadOnlyPropertyList with mutation methods that operate on the
 * internal _items array in static mode. In dynamic mode, all mutations
 * throw — subclasses (e.g. CookieList) override with async implementations.
 *
 * Class hierarchy:
 *   ReadOnlyPropertyList  (read-only, both modes)
 *     └── PropertyList    (sync mutations in static mode; throws in dynamic mode)
 *          └── CookieList (overrides add/upsert/remove/clear/delete with async jar ops)
 */
class PropertyList extends ReadOnlyPropertyList {
  /**
   * Guard that throws in dynamic mode. Called by all mutation methods.
   * @param {string} method - Name of the calling method (for error message)
   */
  #ensureStaticMode(method) {
    if (this._dynamic) {
      throw new Error(`${method}() is not supported in dynamic mode. Override in subclass.`);
    }
  }

  // ── Mutation methods ──────────────────────────────────────────────────

  /**
   * Append an item to the end of the list.
   * @param {object} item
   */
  add(item) {
    this.#ensureStaticMode('add');
    this._items.push(item);
  }

  /**
   * Alias for add().
   * @param {object} item
   */
  append(item) {
    return this.add(item);
  }

  /**
   * Insert an item at the beginning of the list.
   * @param {object} item
   */
  prepend(item) {
    this.#ensureStaticMode('prepend');
    this._items.unshift(item);
  }

  /**
   * Insert an item before a reference item.
   * @param {object} item - The item to insert
   * @param {string|object} before - Key string or item object to insert before
   */
  insert(item, before) {
    this.#ensureStaticMode('insert');
    const idx = this.#findIndex(before);
    if (idx === -1) {
      this._items.push(item);
    } else {
      this._items.splice(idx, 0, item);
    }
  }

  /**
   * Insert an item after a reference item.
   * @param {object} item - The item to insert
   * @param {string|object} after - Key string or item object to insert after
   */
  insertAfter(item, after) {
    this.#ensureStaticMode('insertAfter');
    const idx = this.#findIndex(after);
    if (idx === -1) {
      this._items.push(item);
    } else {
      this._items.splice(idx + 1, 0, item);
    }
  }

  /**
   * Remove items matching a predicate, key string, or item reference.
   * @param {Function|string|object} predicate
   */
  remove(predicate) {
    this.#ensureStaticMode('remove');
    if (typeof predicate === 'function') {
      this._items = this._items.filter((item) => !predicate(item));
    } else if (typeof predicate === 'string') {
      this._items = this._items.filter((item) => item[this._keyProperty] !== predicate);
    } else if (predicate && typeof predicate === 'object') {
      const idx = this.indexOf(predicate);
      if (idx !== -1) {
        this._items.splice(idx, 1);
      }
    }
  }

  /**
   * Remove all items from the list.
   */
  clear() {
    this.#ensureStaticMode('clear');
    this._items = [];
  }

  /**
   * Update an existing item by key, or append if not found.
   * @param {object} item
   */
  upsert(item) {
    this.#ensureStaticMode('upsert');
    const key = item[this._keyProperty];
    const idx = this._items.findIndex((i) => i[this._keyProperty] === key);
    if (idx !== -1) {
      this._items[idx] = item;
    } else {
      this._items.push(item);
    }
  }

  /**
   * Replace all items with a new array.
   * @param {Array} items
   */
  populate(items) {
    this.#ensureStaticMode('populate');
    this._items = Array.isArray(items) ? [...items] : [];
  }

  /**
   * Clear and repopulate with new items.
   * @param {Array} items
   */
  repopulate(items) {
    this.#ensureStaticMode('repopulate');
    this.populate(items);
  }

  /**
   * Merge items from another PropertyList or array.
   * @param {PropertyList|Array} source - Source of items to merge
   * @param {boolean} [prune=false] - If true, clear existing items first
   */
  assimilate(source, prune) {
    this.#ensureStaticMode('assimilate');
    if (prune) {
      this._items = [];
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
      this._items.push(item);
    }
  }

  // ── Internal helpers ──────────────────────────────────────────────────

  /**
   * Find the index of a reference (key string or item object).
   * @param {string|object} ref
   * @returns {number}
   */
  #findIndex(ref) {
    if (typeof ref === 'string') {
      return this._items.findIndex((i) => i[this._keyProperty] === ref);
    }
    if (ref && typeof ref === 'object') {
      return this.indexOf(ref);
    }
    return -1;
  }
}

module.exports = PropertyList;
