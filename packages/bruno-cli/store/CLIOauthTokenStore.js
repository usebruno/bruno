class CLIOauthTokenStore {
  static stores = new Map();

  constructor({ name }) {
    this.name = name;
    this.data = CLIOauthTokenStore.stores.get(name) || {};

    if (!CLIOauthTokenStore.stores.has(name)) {
      CLIOauthTokenStore.stores.set(name, this.data);
    }
  }

  get(key) {
    return this.data[key] ?? null;
  }

  set(key, value) {
    this.data[key] = value;
  }

  delete(key) {
    delete this.data[key];
  }
}

module.exports = CLIOauthTokenStore;
