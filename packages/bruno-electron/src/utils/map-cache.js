/**
 * A simple in-memory cache with TTL (time-to-live) functionality.
 * Each entry in the cache expires after a specified duration.
 */
class MapCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (new Date() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    this.cache.set(key, { value, timestamp: new Date() });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = MapCache;
