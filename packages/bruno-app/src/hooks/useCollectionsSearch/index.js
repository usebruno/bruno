import { useMemo, useSyncExternalStore } from 'react';

const ROW_HEIGHT = 26;
const EXTRA_ROWS = 10;
const DEBOUNCE_MS = 300;

const getVisibleRows = () => Math.ceil(window.innerHeight / ROW_HEIGHT);

const mergeItems = (existing = [], incoming = []) => {
  const merged = [...existing];
  const indexByUid = new Map(existing.map((item, index) => [item.uid, index]));
  for (const item of incoming) {
    const index = indexByUid.get(item.uid);
    if (index === undefined) {
      merged.push(item);
    } else if (item.type === 'folder') {
      merged[index] = { ...merged[index], items: mergeItems(merged[index].items, item.items) };
    }
  }
  return merged;
};

const hasMatchingRequest = (items = [], query) => items.some((item) => (item.type === 'folder'
  ? hasMatchingRequest(item.items, query)
  : item.name?.toLowerCase().includes(query.toLowerCase())));

const getEntryPath = (entry) => (entry.kind === 'ghost' ? entry.entry?.path : entry.collection?.pathname);

const findRootToLoad = ({ rows, range, roots, order, matches, requested, collapsedUids }) => {
  const position = new Map(order.map((pathname, index) => [pathname, index]));
  const lastRowByRoot = new Map();
  const collapsedRoots = new Set();
  rows.forEach((row, index) => {
    if (row.collectionPathname) lastRowByRoot.set(row.collectionPathname, index);
    if (row.kind === 'collection' && collapsedUids.has(row.collectionUid)) collapsedRoots.add(row.collectionPathname);
  });
  const edgeFor = (root) => {
    if (lastRowByRoot.has(root)) return lastRowByRoot.get(root);
    return rows.filter((row) => position.get(row.collectionPathname) < position.get(root)).length;
  };
  return roots.find((root) => {
    const matched = matches.get(root);
    if (!matched || collapsedRoots.has(root) || (requested.get(root) || 0) >= matched.length) return false;
    const edge = edgeFor(root);
    return edge >= range.startIndex - EXTRA_ROWS && edge <= range.endIndex + EXTRA_ROWS;
  });
};

const createSearchStore = () => {
  const listeners = new Set();
  const context = { roots: [], order: [], rows: [], range: { startIndex: 0, endIndex: getVisibleRows() } };
  let snapshot = { query: '', itemsByRoot: new Map(), collapsedUids: new Set() };
  let searchId = null;
  let generation = 0;
  let matches = new Map();
  let requested = new Map();
  let loading = false;
  let recheck = false;
  let timer = null;
  let unsubscribeResults = null;

  const emit = () => listeners.forEach((listener) => listener());

  const loadVisible = async () => {
    const id = searchId;
    if (!id) return;
    if (loading) {
      recheck = true;
      return;
    }

    const root = findRootToLoad({ ...context, collapsedUids: snapshot.collapsedUids, matches, requested });
    if (!root) return;

    loading = true;
    let loaded = false;
    let showsRows = false;
    try {
      const alreadyRequested = requested.get(root) || 0;
      const matched = matches.get(root);
      const sorted = [...matched.slice(0, alreadyRequested), ...matched.slice(alreadyRequested).sort()];
      matches.set(root, sorted);
      const relativePaths = sorted.slice(alreadyRequested, alreadyRequested + getVisibleRows() + EXTRA_ROWS);
      requested.set(root, alreadyRequested + relativePaths.length);

      const result = await window.ipcRenderer.invoke('renderer:search-window', { id, collectionPath: root, relativePaths });
      if (id === searchId && !result.stale) {
        const itemsByRoot = new Map(snapshot.itemsByRoot).set(root, mergeItems(snapshot.itemsByRoot.get(root), result.items));
        snapshot = { ...snapshot, itemsByRoot };
        loaded = true;
        showsRows = hasMatchingRequest(result.items, snapshot.query);
        emit();
      }
    } catch (error) {
      console.error('Failed to load search results', error);
    } finally {
      loading = false;
    }

    const again = recheck;
    recheck = false;
    if ((!loaded && again) || (loaded && !showsRows)) loadVisible();
  };

  const onResults = (message) => {
    if (message.id !== searchId || message.type !== 'batch') return;
    const matched = matches.get(message.root);
    if (matched) matched.push(...message.paths);
    else matches.set(message.root, [...message.paths]);
    loadVisible();
  };

  const start = (query) => {
    const current = ++generation;
    searchId = null;
    matches = new Map();
    requested = new Map();
    context.range = { startIndex: 0, endIndex: getVisibleRows() };
    snapshot = { query, itemsByRoot: new Map(), collapsedUids: new Set() };
    emit();

    if (!query || !context.roots.length) {
      window.ipcRenderer.invoke('renderer:search-cancel');
      return;
    }
    window.ipcRenderer.invoke('renderer:search-collections', { roots: context.roots, query })
      .then((id) => {
        if (current === generation) searchId = id;
      })
      .catch((error) => console.error('Failed to search collections', error));
  };

  return {
    context,
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      if (!unsubscribeResults) unsubscribeResults = window.ipcRenderer.on('main:search-results', onResults);
      return () => {
        listeners.delete(listener);
        if (listeners.size) return;
        clearTimeout(timer);
        if (snapshot.query) start('');
        unsubscribeResults?.();
        unsubscribeResults = null;
      };
    },
    setQuery: (text) => {
      const query = text.trim();
      clearTimeout(timer);
      if (!query) {
        if (snapshot.query) start('');
        return;
      }
      timer = setTimeout(() => {
        if (query !== snapshot.query) start(query);
      }, DEBOUNCE_MS);
    },
    toggleCollapsed: (uid) => {
      const collapsedUids = new Set(snapshot.collapsedUids);
      if (collapsedUids.has(uid)) collapsedUids.delete(uid);
      else collapsedUids.add(uid);
      snapshot = { ...snapshot, collapsedUids };
      emit();
    },
    warmup: () => window.ipcRenderer.invoke('renderer:search-warmup'),
    onRangeChanged: (range) => {
      context.range = range;
      loadVisible();
    },
    onItemsRendered: () => loadVisible()
  };
};

const store = createSearchStore();

const useCollectionsSearch = ({ sidebarEntries }) => {
  const roots = useMemo(
    () => sidebarEntries
      .filter((entry) => entry.kind === 'loaded' && entry.collection.mountStatus !== 'mounted')
      .map((entry) => entry.collection.pathname),
    [sidebarEntries]
  );
  const order = useMemo(() => sidebarEntries.map(getEntryPath), [sidebarEntries]);
  store.context.roots = roots;
  store.context.order = order;
  const { query, itemsByRoot, collapsedUids } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    query,
    itemsByRoot,
    collapsedUids,
    searchContext: store.context,
    setQuery: store.setQuery,
    toggleCollapsed: store.toggleCollapsed,
    warmup: store.warmup,
    onRangeChanged: store.onRangeChanged,
    onItemsRendered: store.onItemsRendered
  };
};

export default useCollectionsSearch;
