const ReadOnlyPropertyList = require('./readonly-property-list');

/**
 * PropertyList - A mutable collection data structure for static mode.
 *
 * Extends ReadOnlyPropertyList with mutation methods that only work in static mode
 * (items stored internally in an array).
 *
 * In dynamic mode, all mutation methods throw — use CookieList for async writes.
 */
class PropertyList extends ReadOnlyPropertyList {
  // ── Mutation (static mode only) ────────────────────────────────────────

  _assertStatic(method) {
    if (this._dynamic) {
      throw new Error(`Cannot call ${method}() on a dynamic PropertyList`);
    }
  }

  /**
   * Append an item to the end.
   * @param {object} item
   */
  add(item) {
    this._assertStatic('add');
    this._items.push(item);
  }

  /**
   * Prepend an item to the beginning.
   * @param {object} item
   */
  prepend(item) {
    this._assertStatic('prepend');
    this._items.unshift(item);
  }

  /**
   * Insert an item before another item (by key or reference).
   * If `before` is not found, appends to the end.
   * @param {object} item
   * @param {object|string} [before] - Item reference or key string
   */
  insert(item, before) {
    this._assertStatic('insert');
    if (before === undefined) {
      this._items.push(item);
      return;
    }
    const idx = typeof before === 'string'
      ? this._items.findIndex((i) => i[this._keyProperty] === before)
      : this._items.indexOf(before);
    if (idx === -1) {
      this._items.push(item);
    } else {
      this._items.splice(idx, 0, item);
    }
  }

  /**
   * Insert an item after another item (by key or reference).
   * If `after` is not found, appends to the end.
   * @param {object} item
   * @param {object|string} after - Item reference or key string
   */
  insertAfter(item, after) {
    this._assertStatic('insertAfter');
    const idx = typeof after === 'string'
      ? this._items.findIndex((i) => i[this._keyProperty] === after)
      : this._items.indexOf(after);
    if (idx === -1) {
      this._items.push(item);
    } else {
      this._items.splice(idx + 1, 0, item);
    }
  }

  /**
   * Insert or update an item by key.
   * @param {object} item
   * @returns {boolean|null} true if updated, false if inserted, null if no key
   */
  upsert(item) {
    this._assertStatic('upsert');
    const key = item[this._keyProperty];
    if (key === undefined) {
      this._items.push(item);
      return null;
    }
    const idx = this._items.findIndex((i) => i[this._keyProperty] === key);
    if (idx !== -1) {
      this._items[idx] = item;
      return true;
    }
    this._items.push(item);
    return false;
  }

  /**
   * Remove items by predicate function or by key name.
   * @param {Function|string} predicateOrName
   */
  remove(predicateOrName) {
    this._assertStatic('remove');
    if (typeof predicateOrName === 'function') {
      this._items = this._items.filter((i) => !predicateOrName(i));
    } else {
      this._items = this._items.filter((i) => i[this._keyProperty] !== predicateOrName);
    }
  }

  /**
   * Remove all items.
   */
  clear() {
    this._assertStatic('clear');
    this._items = [];
  }

  /**
   * Replace all items with a new array.
   * @param {Array} items
   */
  populate(items) {
    this._assertStatic('populate');
    this._items = Array.isArray(items) ? [...items] : [];
  }

  /**
   * Clear and replace all items.
   * @param {Array} items
   */
  repopulate(items) {
    this._assertStatic('repopulate');
    this._items = Array.isArray(items) ? [...items] : [];
  }

  /**
   * Merge items from another source.
   * @param {ReadOnlyPropertyList|Array} source
   * @param {boolean} [prune=false] - If true, remove items not in source
   */
  assimilate(source, prune = false) {
    this._assertStatic('assimilate');
    const sourceItems = source instanceof ReadOnlyPropertyList ? source.all() : (Array.isArray(source) ? source : []);

    if (prune) {
      const sourceKeys = new Set(sourceItems.map((i) => i[this._keyProperty]));
      this._items = this._items.filter((i) => sourceKeys.has(i[this._keyProperty]));
    }

    for (const item of sourceItems) {
      this.upsert(item);
    }
  }
}

module.exports = PropertyList;
