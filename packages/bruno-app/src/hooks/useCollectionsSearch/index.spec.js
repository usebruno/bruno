import { createSearchStore } from './index';

const flush = () => new Promise((resolve) => jest.requireActual('timers').setImmediate(resolve));

describe('createSearchStore', () => {
  let listener;
  let resolveSearch;

  beforeEach(() => {
    jest.useFakeTimers();
    listener = null;
    window.ipcRenderer = {
      on: jest.fn((channel, callback) => {
        listener = callback;
        return jest.fn();
      }),
      invoke: jest.fn((channel) => {
        if (channel === 'renderer:search-collections') return new Promise((resolve) => { resolveSearch = resolve; });
        if (channel === 'renderer:search-window') return Promise.resolve({ items: [] });
        return Promise.resolve();
      })
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.ipcRenderer;
  });

  const startSearch = (store, query) => {
    store.setQuery(query);
    jest.advanceTimersByTime(300);
  };

  it('searches every sidebar collection and applies status that arrives before the search id', async () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.context.roots = ['/unmounted'];
    store.context.indexRoots = ['/mounted', '/unmounted'];

    startSearch(store, 'hit');
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:search-collections', { roots: ['/mounted', '/unmounted'], query: 'hit' });

    listener({ type: 'status', id: 7, indexing: true, matchCount: 3 });
    expect(store.getSnapshot().indexing).toBe(false);

    resolveSearch(7);
    await flush();
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ query: 'hit', indexing: true, matchCount: 3 }));

    listener({ type: 'status', id: 7, indexing: false, matchCount: 4 });
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ indexing: false, matchCount: 4 }));
  });

  it('ignores status and batches from other searches and mounted roots', async () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.context.roots = ['/unmounted'];
    store.context.indexRoots = ['/mounted', '/unmounted'];

    startSearch(store, 'hit');
    resolveSearch(2);
    await flush();

    listener({ type: 'status', id: 1, indexing: true, matchCount: 9 });
    listener({ type: 'batch', id: 2, root: '/mounted', paths: ['a.bru'] });
    await flush();

    expect(store.getSnapshot().matchCount).toBe(null);
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:search-window', expect.anything());
  });

  it('clears indexing and cancels when the search term is removed', async () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.context.indexRoots = ['/c'];

    startSearch(store, 'hit');
    resolveSearch(1);
    await flush();
    listener({ type: 'status', id: 1, indexing: true, matchCount: 1 });

    store.setQuery('');
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ query: '', indexing: false, matchCount: null }));
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:search-cancel');
  });

  it('does not use the main-process search when the index is off', () => {
    const store = createSearchStore();
    store.subscribe(() => {});

    startSearch(store, 'hit');

    expect(store.getSnapshot().query).toBe('hit');
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:search-collections', expect.anything());
  });
});
