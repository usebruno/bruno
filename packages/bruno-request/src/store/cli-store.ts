interface CLIStoreConfig {
  name: string;
}

class CLIStore {
  private name: string;
  private data: Record<string, any>;
  private static stores: Map<string, Record<string, any>> = new Map();

  constructor({ name }: CLIStoreConfig) {
    this.name = name;
    this.data = CLIStore.stores.get(name) || {};

    if (!CLIStore.stores.has(name)) {
      CLIStore.stores.set(name, this.data);
    }
  }

  public get(key: string): any {
    return this.data[key] ?? null;
  }

  public set(key: string, value: any): void {
    this.data[key] = value;
  }
}

export default CLIStore;
