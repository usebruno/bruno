class Cache {
  get(key) {
    return window.localStorage.getItem(key);
  }
  set(key, val) {
    window.localStorage.setItem(key, val);
  }
}

module.exports = new Cache();
