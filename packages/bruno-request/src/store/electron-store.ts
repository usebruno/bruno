import Store from 'electron-store';

interface StoreConfig {
  name: string;
  clearInvalidConfig: boolean;
}

class ElectronStoreWrapper {
  private store: Store;

  constructor({ name, clearInvalidConfig }: StoreConfig) {
    this.store = new Store({
      name,
      clearInvalidConfig
    });
  }

  public get(key: string): any {
    return this.store.get(key);
  }

  public set(key: string, value: any): void {
    this.store.set(key, value);
  }
}

export default ElectronStoreWrapper;
