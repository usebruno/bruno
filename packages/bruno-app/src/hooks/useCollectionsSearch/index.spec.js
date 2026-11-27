import { createSearchStore } from './index';

const flush = () => new Promise((resolve) => jest.requireActual('timers').setImmediate(resolve));

describe('createSearchStore', () => {
  let listener;

  beforeEach(() => {
    jest.useFakeTimers();
    listener = null;
    window.ipcRenderer = {
      on: jest.fn((channel, callback) => {
        listener = callback;
        return jest.fn();
      }),
      invoke: jest.fn((channel) => {
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

  it('searches every sidebar collection and applies status for the active search id', () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.context.roots = ['/unmounted'];
    store.context.indexRoots = ['/mounted', '/unmounted'];

    startSearch(store, 'hit');
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:search-collections', {
      id: 1,
      roots: ['/mounted', '/unmounted'],
      query: 'hit',
      ignore: {}
    });

    listener({ type: 'status', id: 1, indexing: true, matchCount: 3 });
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ query: 'hit', indexing: true, matchCount: 3 }));

    listener({ type: 'status', id: 1, indexing: false, matchCount: 4 });
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ indexing: false, matchCount: 4 }));
  });

  it('ignores status and batches from other searches and mounted roots', async () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.context.roots = ['/unmounted'];
    store.context.indexRoots = ['/mounted', '/unmounted'];

    startSearch(store, 'hit');

    listener({ type: 'status', id: 99, indexing: true, matchCount: 9 });
    listener({ type: 'batch', id: 1, root: '/mounted', paths: ['a.bru'] });
    await flush();

    expect(store.getSnapshot().matchCount).toBe(null);
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:search-window', expect.anything());
  });

  it('clears indexing and cancels when the search term is removed', () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.context.indexRoots = ['/c'];

    startSearch(store, 'hit');
    listener({ type: 'status', id: 1, indexing: true, matchCount: 1 });

    store.setQuery('');
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ query: '', indexing: false, matchCount: null }));
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:search-cancel');
  });

  it('re-runs the active search when a collection is opened or closed', () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.setContext({ roots: ['/a'], indexRoots: ['/a'] });
    startSearch(store, 'hit');

    store.setContext({ roots: ['/a', '/b'], indexRoots: ['/a', '/b'] });

    expect(window.ipcRenderer.invoke).toHaveBeenLastCalledWith('renderer:search-collections', {
      id: 2,
      roots: ['/a', '/b'],
      query: 'hit',
      ignore: {}
    });
  });

  it('keeps the active search when only the mount status of a collection changes', () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.setContext({ roots: ['/a'], indexRoots: ['/a'] });
    startSearch(store, 'hit');

    store.setContext({ roots: [], indexRoots: ['/a'] });

    const searches = window.ipcRenderer.invoke.mock.calls.filter(([channel]) => channel === 'renderer:search-collections');
    expect(searches).toHaveLength(1);
  });

  it('loads a collection\'s matches once new rows bring it into view', async () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    const offscreenRows = Array.from({ length: 200 }, () => ({ collectionPathname: '/before' }));
    store.setContext({ roots: ['/a'], indexRoots: ['/a'], order: ['/before', '/a'], rows: offscreenRows });
    startSearch(store, 'hit');
    listener({ type: 'batch', id: 1, root: '/a', paths: ['req.bru'] });
    await flush();
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:search-window', expect.anything());

    store.setContext({ rows: [] });
    await flush();

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:search-window', {
      id: 1,
      collectionPath: '/a',
      relativePaths: ['req.bru']
    });
  });

  it('sends each collection\'s ignore config with the search', () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.setContext({ roots: ['/a'], indexRoots: ['/a'], ignore: { '/a': ['generated'] } });

    startSearch(store, 'hit');

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:search-collections', {
      id: 1,
      roots: ['/a'],
      query: 'hit',
      ignore: { '/a': ['generated'] }
    });
  });

  it('re-runs the active search when a collection\'s ignore config changes', () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.setContext({ roots: ['/a'], indexRoots: ['/a'], ignore: { '/a': [] } });
    startSearch(store, 'hit');

    store.setContext({ ignore: { '/a': ['generated'] } });
    store.setContext({ ignore: { '/a': ['generated'] } });

    const searches = window.ipcRenderer.invoke.mock.calls.filter(([channel]) => channel === 'renderer:search-collections');
    expect(searches).toHaveLength(2);
    expect(searches[1][1]).toEqual({ id: 2, roots: ['/a'], query: 'hit', ignore: { '/a': ['generated'] } });
  });

  it('keeps the active search when ignore patterns only change order, duplicates, or always-ignored folders', () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.setContext({ roots: ['/a'], indexRoots: ['/a'], ignore: { '/a': ['node_modules', '.git', 'generated'] } });
    startSearch(store, 'hit');

    store.setContext({ ignore: { '/a': ['generated'] } });
    store.setContext({ ignore: { '/a': ['generated', 'generated', '.git'] } });

    const searches = window.ipcRenderer.invoke.mock.calls.filter(([channel]) => channel === 'renderer:search-collections');
    expect(searches).toHaveLength(1);
  });

  it('keeps the active search when a mounting collection drops only always-ignored folders from ignore', () => {
    const store = createSearchStore();
    store.subscribe(() => {});
    store.setContext({ roots: ['/a'], indexRoots: ['/a'], ignore: { '/a': ['node_modules', '.git'] } });
    startSearch(store, 'hit');

    store.setContext({ roots: [], ignore: {} });

    const searches = window.ipcRenderer.invoke.mock.calls.filter(([channel]) => channel === 'renderer:search-collections');
    expect(searches).toHaveLength(1);
  });

  it('does not search when collections change with no active query', () => {
    const store = createSearchStore();
    store.subscribe(() => {});

    store.setContext({ roots: ['/a'], indexRoots: ['/a'] });

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:search-collections', expect.anything());
  });

  it('does not search when there are no collections to index', () => {
    const store = createSearchStore();
    store.subscribe(() => {});

    startSearch(store, 'hit');

    expect(store.getSnapshot().query).toBe('hit');
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:search-collections', expect.anything());
  });

  describe('when the search term changes while results are in flight', () => {
    let searches;
    let windows;

    const deferred = (payload) => {
      let resolve;
      const promise = new Promise((res) => {
        resolve = res;
      });
      return { payload, promise, resolve };
    };

    const request = (name) => ({ uid: name, name, type: 'http-request', request: { method: 'GET', url: '' } });

    const windowRequests = () => windows.map(({ payload }) => payload);

    beforeEach(() => {
      searches = [];
      windows = [];
      window.ipcRenderer.invoke = jest.fn((channel, payload) => {
        if (channel === 'renderer:search-collections') {
          const search = deferred(payload);
          searches.push(search);
          return search.promise;
        }
        if (channel === 'renderer:search-window') {
          const pending = deferred(payload);
          windows.push(pending);
          return pending.promise;
        }
        return Promise.resolve();
      });
    });

    const createStore = () => {
      const store = createSearchStore();
      store.subscribe(() => {});
      store.setContext({ roots: ['/a'], indexRoots: ['/a'], order: ['/a'], rows: [] });
      return store;
    };

    it('only searches for the last term typed within the debounce window', () => {
      const store = createStore();

      store.setQuery('a');
      jest.advanceTimersByTime(100);
      store.setQuery('ab');
      jest.advanceTimersByTime(100);
      store.setQuery('abc');
      jest.advanceTimersByTime(300);

      expect(searches.map(({ payload }) => payload.query)).toEqual(['abc']);
      expect(store.getSnapshot().query).toBe('abc');
    });

    it('applies only the newest search when an older search keeps emitting', async () => {
      const store = createStore();
      startSearch(store, 'a');
      startSearch(store, 'ab');

      listener({ type: 'batch', id: 1, root: '/a', paths: ['old.bru'] });
      listener({ type: 'status', id: 1, indexing: false, matchCount: 5 });
      listener({ type: 'batch', id: 2, root: '/a', paths: ['new.bru'] });
      listener({ type: 'status', id: 2, indexing: false, matchCount: 1 });
      await flush();

      expect(store.getSnapshot()).toEqual(expect.objectContaining({ query: 'ab', indexing: false, matchCount: 1 }));
      expect(windowRequests()).toEqual([{ id: 2, collectionPath: '/a', relativePaths: ['new.bru'] }]);
    });

    it('drops a window that returns after its search was replaced, then loads the new search', async () => {
      const store = createStore();
      startSearch(store, 'a');
      listener({ type: 'batch', id: 1, root: '/a', paths: ['old.bru'] });
      await flush();
      expect(windowRequests()).toEqual([{ id: 1, collectionPath: '/a', relativePaths: ['old.bru'] }]);

      startSearch(store, 'ab');
      listener({ type: 'batch', id: 2, root: '/a', paths: ['new.bru'] });
      await flush();

      windows[0].resolve({ items: [request('a-old')] });
      await flush();
      expect(store.getSnapshot().itemsByRoot.get('/a')).toBeUndefined();
      expect(windowRequests()[1]).toEqual({ id: 2, collectionPath: '/a', relativePaths: ['new.bru'] });

      windows[1].resolve({ items: [request('ab-new')] });
      await flush();
      expect(store.getSnapshot().itemsByRoot.get('/a')).toEqual([request('ab-new')]);
    });

    it('drops the previous search\'s results when the same term is typed again', async () => {
      const store = createStore();
      startSearch(store, 'a');
      startSearch(store, 'ab');
      startSearch(store, 'a');

      listener({ type: 'status', id: 1, indexing: false, matchCount: 9 });
      listener({ type: 'status', id: 2, indexing: false, matchCount: 4 });
      listener({ type: 'batch', id: 1, root: '/a', paths: ['old.bru'] });
      await flush();

      expect(store.getSnapshot()).toEqual(expect.objectContaining({ query: 'a', matchCount: null }));
      expect(windowRequests()).toEqual([]);

      listener({ type: 'status', id: 3, indexing: false, matchCount: 2 });
      expect(store.getSnapshot().matchCount).toBe(2);
    });

    it('ignores a search that keeps emitting after the term was cleared', async () => {
      const store = createStore();
      startSearch(store, 'a');
      store.setQuery('');

      listener({ type: 'status', id: 1, indexing: true, matchCount: 3 });
      listener({ type: 'batch', id: 1, root: '/a', paths: ['old.bru'] });
      await flush();

      expect(store.getSnapshot()).toEqual(expect.objectContaining({ query: '', indexing: false, matchCount: null }));
      expect(store.getSnapshot().itemsByRoot.size).toBe(0);
      expect(windowRequests()).toEqual([]);
    });
  });
});
