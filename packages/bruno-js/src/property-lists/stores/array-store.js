const { PropertyList } = require('../property-list');

/**
 * ArrayStore — a StoreAdapter that owns its items outright.
 *
 * The one store with a real ordering, so it is the only one providing the
 * positional mutators (insert/insertAfter/prepend/append). Backs static
 * snapshots such as `res.headerList`.
 */
class ArrayStore {
  #items;

  /**
   * @param {Array} [items] - Initial items; copied, never aliased
   */
  constructor(items) {
    this.#items = Array.isArray(items) ? [...items] : [];
  }

  read() {
    return this.#items;
  }

  #findIndex(ref) {
    if (typeof ref === 'string') {
      return this.#items.findIndex((i) => i.key === ref);
    }
    if (ref && typeof ref === 'object') {
      return this.#items.findIndex((i) => i.key === ref.key && i.value === ref.value);
    }
    return -1;
  }

  // ── Write methods ──────────────────────────────────────────────────────

  /**
   * Append an item to the end of the list.
   * @param {object} item
   */
  add(item) {
    this.#items.push(item);
  }

  /**
   * Update an existing item by key, or append if not found.
   * @param {object} item
   */
  upsert(item) {
    const index = this.#items.findIndex((i) => i.key === item.key);
    if (index !== -1) {
      this.#items[index] = item;
    } else {
      this.#items.push(item);
    }
  }

  /**
   * Remove items matching a predicate, key string, or item reference.
   * @param {Function|string|object} predicate
   */
  remove(predicate) {
    if (typeof predicate === 'function') {
      this.#items = this.#items.filter((item) => !predicate(item));
    } else if (typeof predicate === 'string') {
      this.#items = this.#items.filter((item) => item.key !== predicate);
    } else if (predicate && typeof predicate === 'object') {
      const index = this.#findIndex(predicate);
      if (index !== -1) {
        this.#items.splice(index, 1);
      }
    }
  }

  /** Remove all items. */
  clear() {
    this.#items = [];
  }

  /**
   * Replace all items with a new array.
   * @param {Array} items
   */
  populate(items) {
    this.#items = Array.isArray(items) ? [...items] : [];
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
   * @param {PropertyList|Array} source
   * @param {boolean} [prune=false] - If true, clear existing items first
   */
  assimilate(source, prune) {
    if (prune) {
      this.#items = [];
    }
    let items;
    if (PropertyList.isPropertyList(source)) {
      items = source.all();
    } else if (Array.isArray(source)) {
      items = source;
    } else {
      items = [];
    }
    for (const item of items) {
      this.#items.push(item);
    }
  }

  // ── Positional methods ─────────────────────────────────────────────────

  /**
   * Alias for add().
   * @param {object} item
   */
  append(item) {
    this.add(item);
  }

  /**
   * Insert an item at the beginning of the list.
   * @param {object} item
   */
  prepend(item) {
    this.#items.unshift(item);
  }

  /**
   * Insert an item before a reference (key string or item object); appends when not found.
   * @param {object} item
   * @param {string|object} before
   */
  insert(item, before) {
    const index = this.#findIndex(before);
    if (index === -1) {
      this.#items.push(item);
    } else {
      this.#items.splice(index, 0, item);
    }
  }

  /**
   * Insert an item after a reference (key string or item object); appends when not found.
   * @param {object} item
   * @param {string|object} after
   */
  insertAfter(item, after) {
    const index = this.#findIndex(after);
    if (index === -1) {
      this.#items.push(item);
    } else {
      this.#items.splice(index + 1, 0, item);
    }
  }
}

module.exports = ArrayStore;
