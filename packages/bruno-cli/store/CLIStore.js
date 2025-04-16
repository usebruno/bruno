class CLIStore {
  name;
  data;
  static stores = new Map();

  constructor({ name }) {
    this.name = name;
    this.data = CLIStore.stores.get(name) || {};

    if (!CLIStore.stores.has(name)) {
      CLIStore.stores.set(name, this.data);
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

module.exports = CLIStore;
