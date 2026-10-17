import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ROW_HEIGHT = 26;
const EXTRA_ROWS = 10;

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

const useCollectionsSearch = ({ enabled, searchText, sidebarEntries, collapsedUids }) => {
  const roots = useMemo(
    () => sidebarEntries
      .filter((entry) => entry.kind === 'loaded' && entry.collection.mountStatus !== 'mounted')
      .map((entry) => entry.collection.pathname),
    [sidebarEntries]
  );
  const order = useMemo(() => sidebarEntries.map(getEntryPath), [sidebarEntries]);
  const [matchedRoots, setMatchedRoots] = useState(() => new Set());
  const [itemsByRoot, setItemsByRoot] = useState(() => new Map());
  const rootsRef = useRef(roots);
  rootsRef.current = roots;
  const orderRef = useRef(order);
  orderRef.current = order;
  const collapsedUidsRef = useRef(collapsedUids);
  collapsedUidsRef.current = collapsedUids;
  const rowsRef = useRef([]);
  const rangeRef = useRef({ startIndex: 0, endIndex: getVisibleRows() });
  const searchIdRef = useRef(null);
  const matchesRef = useRef(new Map());
  const requestedRef = useRef(new Map());
  const loadingRef = useRef(false);
  const recheckRef = useRef(false);
  const rootsKey = [...roots].sort().join('\n');

  const loadVisible = useCallback(async () => {
    const id = searchIdRef.current;
    if (!id) return;
    if (loadingRef.current) {
      recheckRef.current = true;
      return;
    }

    const root = findRootToLoad({
      rows: rowsRef.current,
      range: rangeRef.current,
      roots: rootsRef.current,
      order: orderRef.current,
      matches: matchesRef.current,
      requested: requestedRef.current,
      collapsedUids: collapsedUidsRef.current
    });
    if (!root) return;

    loadingRef.current = true;
    let loaded = false;
    try {
      const requested = requestedRef.current.get(root) || 0;
      const matched = matchesRef.current.get(root);
      const sorted = [...matched.slice(0, requested), ...matched.slice(requested).sort()];
      matchesRef.current.set(root, sorted);
      const relativePaths = sorted.slice(requested, requested + getVisibleRows() + EXTRA_ROWS);
      requestedRef.current.set(root, requested + relativePaths.length);

      const result = await window.ipcRenderer.invoke('renderer:search-window', { id, collectionPath: root, relativePaths });
      if (id === searchIdRef.current && !result.stale) {
        setItemsByRoot((prev) => new Map(prev).set(root, mergeItems(prev.get(root), result.items)));
        loaded = true;
      }
    } catch (error) {
      console.error('Failed to load search results', error);
    } finally {
      loadingRef.current = false;
    }

    const recheck = recheckRef.current;
    recheckRef.current = false;
    if (!loaded && recheck) loadVisible();
  }, []);

  const onRangeChanged = useCallback((range) => {
    rangeRef.current = range;
    loadVisible();
  }, [loadVisible]);

  useEffect(() => {
    loadVisible();
  }, [matchedRoots, itemsByRoot, collapsedUids, loadVisible]);

  useEffect(() => window.ipcRenderer.on('main:search-results', (message) => {
    if (message.id !== searchIdRef.current || message.type !== 'batch') return;
    const matched = matchesRef.current.get(message.root);
    if (matched) {
      matched.push(...message.paths);
      loadVisible();
    } else {
      matchesRef.current.set(message.root, [...message.paths]);
      setMatchedRoots((prev) => new Set(prev).add(message.root));
    }
  }), [loadVisible]);

  useEffect(() => {
    if (enabled) window.ipcRenderer.invoke('renderer:search-warmup');
  }, [enabled]);

  useEffect(() => {
    searchIdRef.current = null;
    matchesRef.current = new Map();
    requestedRef.current = new Map();
    setMatchedRoots(new Set());
    setItemsByRoot(new Map());

    if (!searchText || !rootsRef.current.length) {
      window.ipcRenderer.invoke('renderer:search-cancel');
      return;
    }

    let isCurrent = true;
    window.ipcRenderer.invoke('renderer:search-collections', { roots: rootsRef.current, query: searchText })
      .then((id) => {
        if (isCurrent) searchIdRef.current = id;
      })
      .catch((error) => console.error('Failed to search collections', error));
    return () => {
      isCurrent = false;
    };
  }, [searchText, rootsKey]);

  return { matchedRoots, itemsByRoot, rowsRef, onRangeChanged };
};

export default useCollectionsSearch;
