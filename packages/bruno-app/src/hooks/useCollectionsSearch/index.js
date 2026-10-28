import { useMemo, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import get from 'lodash/get';

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

const hasMatchingRequest = (items = [], query) => {
  const needle = query.toLowerCase();
  return items.some((item) => (item.type === 'folder'
    ? hasMatchingRequest(item.items, query)
    : item.name?.toLowerCase().includes(needle) || item.request?.url?.toLowerCase().includes(needle)));
};

const getEntryPath = (entry) => (entry.kind === 'ghost' ? entry.entry?.path : entry.collection?.pathname);

const findRootToLoad = ({ rows, range, roots, order, matches, requested }) => {
  const position = new Map(order.map((pathname, index) => [pathname, index]));
  const lastRowByRoot = new Map();
  rows.forEach((row, index) => {
    if (row.collectionPathname) lastRowByRoot.set(row.collectionPathname, index);
  });
  const edgeFor = (root) => {
    if (lastRowByRoot.has(root)) return lastRowByRoot.get(root);
    return rows.filter((row) => position.get(row.collectionPathname) < position.get(root)).length;
  };
  return roots.find((root) => {
    const matched = matches.get(root);
    if (!matched || (requested.get(root) || 0) >= matched.length) return false;
    const edge = edgeFor(root);
    return edge >= range.startIndex - EXTRA_ROWS && edge <= range.endIndex + EXTRA_ROWS;
  });
};

export const createSearchStore = () => {
  const listeners = new Set();
  const context = { roots: [], indexRoots: [], order: [], rows: [], range: { startIndex: 0, endIndex: getVisibleRows() } };
  let snapshot = { query: '', itemsByRoot: new Map(), indexing: false, matchCount: null };
  let searchId = null;
  let generation = 0;
  let matches = new Map();
  let requested = new Map();
  let early = [];
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

    const root = findRootToLoad({ ...context, matches, requested });
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

  const applyResult = (message) => {
    if (message.type === 'status') {
      snapshot = { ...snapshot, indexing: Boolean(message.indexing), matchCount: message.matchCount ?? null };
      emit();
      return;
    }
    if (message.type !== 'batch' || !context.roots.includes(message.root)) return;
    const matched = matches.get(message.root);
    if (matched) matched.push(...message.paths);
    else matches.set(message.root, [...message.paths]);
    loadVisible();
  };

  const onResults = (message) => {
    if (searchId === null && snapshot.query) {
      early.push(message);
      return;
    }
    if (message.id === searchId) applyResult(message);
  };

  const start = (query) => {
    const current = ++generation;
    searchId = null;
    early = [];
    matches = new Map();
    requested = new Map();
    context.range = { startIndex: 0, endIndex: getVisibleRows() };
    snapshot = { query, itemsByRoot: new Map(), indexing: false, matchCount: null };
    emit();

    if (!query || !context.indexRoots.length) {
      window.ipcRenderer.invoke('renderer:search-cancel');
      return;
    }
    window.ipcRenderer.invoke('renderer:search-collections', { roots: context.indexRoots, query })
      .then((id) => {
        if (current !== generation) return;
        searchId = id;
        const buffered = early;
        early = [];
        buffered.filter((message) => message.id === id).forEach(applyResult);
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
    onRangeChanged: (range) => {
      context.range = range;
      loadVisible();
    },
    onItemsRendered: () => loadVisible()
  };
};

const store = createSearchStore();

const useCollectionsSearch = ({ sidebarEntries }) => {
  const searchIndexEnabled = useSelector((state) => get(state, 'app.preferences.cache.searchIndex.enabled', false));
  const roots = useMemo(
    () => searchIndexEnabled
      ? sidebarEntries
          .filter((entry) => entry.kind === 'loaded' && entry.collection.mountStatus !== 'mounted')
          .map((entry) => entry.collection.pathname)
      : [],
    [sidebarEntries, searchIndexEnabled]
  );
  const indexRoots = useMemo(
    () => searchIndexEnabled
      ? sidebarEntries
          .filter((entry) => entry.kind === 'loaded' && entry.collection.pathname)
          .map((entry) => entry.collection.pathname)
      : [],
    [sidebarEntries, searchIndexEnabled]
  );
  const order = useMemo(() => sidebarEntries.map(getEntryPath), [sidebarEntries]);
  store.context.roots = roots;
  store.context.indexRoots = indexRoots;
  store.context.order = order;
  const { query, itemsByRoot, indexing, matchCount } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    query,
    itemsByRoot,
    indexing,
    matchCount,
    searchContext: store.context,
    setQuery: store.setQuery,
    onRangeChanged: store.onRangeChanged,
    onItemsRendered: store.onItemsRendered
  };
};

export default useCollectionsSearch;
