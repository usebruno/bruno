import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch, useStore } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import path from 'path';
import {
  IconSearch,
  IconX,
  IconFolder,
  IconBox,
  IconFileText,
  IconBook
} from '@tabler/icons';
import { findItemInCollectionByPathname, getDefaultRequestPaneTab } from 'utils/collections';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { toggleCollection } from 'providers/ReduxStore/slices/collections';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { normalizePath } from 'utils/common/path';
import { normalizeQuery, isValidQuery, highlightText, sortResults, getTypeLabel } from './utils/searchUtils';
import { SEARCH_TYPES, MATCH_TYPES, SEARCH_CONFIG, DOCUMENTATION_RESULT } from './constants';
import IndeterminateProgressBar from 'ui/IndeterminateProgressBar';
import StyledWrapper from './StyledWrapper';

// Fixed row height (px). Must stay in sync with `.result-item` in StyledWrapper.js, since it's
// passed to Virtuoso as `fixedItemHeight`.
const RESULT_ROW_HEIGHT = 52;
// The list scrolls beyond this; it caps how tall the modal grows, not how many results exist.
const MAX_VISIBLE_RESULTS = 8;

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localResults, setLocalResults] = useState([]);
  const [externalResults, setExternalResults] = useState([]);
  const inputRef = useRef(null);
  const virtuosoRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const searchRequestIdRef = useRef(0);
  const dispatch = useDispatch();
  const store = useStore();
  const { ipcRenderer } = window;

  const allCollections = useSelector((state) => state.collections.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const searchIndexBuilding = useSelector((state) => state.app.searchIndexBuilding);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  const collections = useMemo(() => {
    if (!activeWorkspace) return allCollections;

    const workspacePaths = new Set(
      activeWorkspace.collections?.map((wc) => normalizePath(wc.path)) || []
    );
    return allCollections.filter((c) => workspacePaths.has(normalizePath(c.pathname)));
  }, [activeWorkspace, allCollections, workspaces]);

  // Folder/Request results come from the search index, which isn't scoped to a workspace - so
  // resolving them back to a Redux collection must check every collection, not just the active
  // workspace's (that narrower list is still correct for collection name/path matching below).
  const findCollectionByPath = useCallback(
    (collectionPath) => allCollections.find((c) => normalizePath(c.pathname) === normalizePath(collectionPath)),
    [allCollections]
  );

  const createCollectionResults = useCallback(() => {
    const collectionResults = collections.map((collection) => ({
      type: SEARCH_TYPES.COLLECTION,
      item: collection,
      name: collection.name,
      path: collection.name,
      matchType: MATCH_TYPES.COLLECTION,
      collectionUid: collection.uid
    }));

    collectionResults.sort((a, b) => a.name.localeCompare(b.name));
    return [DOCUMENTATION_RESULT, ...collectionResults];
  }, [collections]);

  // Collections are always cheap and always fresh in Redux (mounted or not), so this never needs
  // the search index - only Folder/Request reach into collections that aren't mounted.
  const performLocalSearch = useCallback((searchQuery) => {
    const normalizedQuery = normalizeQuery(searchQuery);
    if (!normalizedQuery) {
      setLocalResults(createCollectionResults());
      return;
    }
    if (!isValidQuery(normalizedQuery)) {
      setLocalResults([]);
      return;
    }

    const searchTerms = normalizedQuery.toLowerCase().split(/[\s\/]+/).filter(Boolean);
    if (!searchTerms.length) {
      setLocalResults([]);
      return;
    }

    const results = [];
    const queryLower = searchTerms.join(' ');
    if (['documentation', 'docs', 'bruno docs'].some((term) => term.includes(queryLower))) {
      results.push(DOCUMENTATION_RESULT);
    }

    collections.forEach((collection) => {
      const nameMatch = searchTerms.every((term) => collection.name.toLowerCase().includes(term));
      const pathMatch = searchTerms.every((term) => collection.pathname.toLowerCase().includes(term));

      if (nameMatch || pathMatch) {
        results.push({
          type: SEARCH_TYPES.COLLECTION,
          item: collection,
          name: collection.name,
          path: collection.name,
          matchType: nameMatch ? MATCH_TYPES.COLLECTION : MATCH_TYPES.PATH,
          collectionUid: collection.uid
        });
      }
    });

    setLocalResults(results);
  }, [collections, createCollectionResults]);

  // Folder/Request results always come from the search index - it's kept fresh for mounted
  // collections too (via the live watcher), so there's no need for a separate Redux-tree pass.
  // Both scopes are always queried together: the search box has no filters, so one query term
  // matches collection/folder/request name, path, type, and URL all at once.
  const fetchIndexResults = useCallback((searchQuery) => {
    const requestId = ++searchRequestIdRef.current;

    if (!ipcRenderer) {
      setExternalResults([]);
      return;
    }

    const normalizedQuery = normalizeQuery(searchQuery);
    if (!normalizedQuery || !isValidQuery(normalizedQuery)) {
      setExternalResults([]);
      return;
    }

    const term = normalizedQuery.toLowerCase();

    Promise.all(
      [SEARCH_TYPES.FOLDER, SEARCH_TYPES.REQUEST].map((scope) => ipcRenderer
        .invoke('renderer:search-index', term, { scope })
        .then((rows) => (rows || []).map((row) => ({ ...row, __scope: scope })))
        .catch(() => []))
    ).then((batches) => {
      if (searchRequestIdRef.current !== requestId) return;
      setExternalResults(batches.flat());
    });
  }, [ipcRenderer]);

  const mappedExternalResults = useMemo(() => {
    return externalResults
      .map((row) => {
        const collection = findCollectionByPath(row.collectionPath);
        if (!collection) return null;

        if (row.__scope === SEARCH_TYPES.FOLDER) {
          if (!row.folderName) return null;
          return {
            type: SEARCH_TYPES.FOLDER,
            external: true,
            row,
            name: row.folderName,
            path: `${row.collectionName}/${row.folderPath}`,
            matchType: MATCH_TYPES.FOLDER,
            collectionUid: collection.uid
          };
        }

        if (!row.requestName) return null;
        return {
          type: SEARCH_TYPES.REQUEST,
          external: true,
          row,
          name: row.requestName,
          path: `${row.collectionName}/${row.requestPath}`,
          matchType: MATCH_TYPES.REQUEST,
          method: row.requestType,
          collectionUid: collection.uid
        };
      })
      .filter(Boolean);
  }, [externalResults, findCollectionByPath]);

  const results = useMemo(
    () => sortResults([...localResults, ...mappedExternalResults]),
    [localResults, mappedExternalResults]
  );

  const showIndexingStatus = Boolean(query.trim()) && searchIndexBuilding;

  const ensureCollectionIsMounted = (collection) => {
    if (!collection || collection.mountStatus === 'mounted') return;
    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));
  };

  const handleKeyNavigation = (e) => {
    const handlers = {
      ArrowDown: () => {
        e.preventDefault();
        setSelectedIndex((prev) => prev < results.length - 1 ? prev + 1 : 0);
      },
      ArrowUp: () => {
        e.preventDefault();
        setSelectedIndex((prev) => prev > 0 ? prev - 1 : results.length - 1);
      },
      Enter: () => {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultSelection(results[selectedIndex]);
        }
      },
      Escape: () => {
        e.preventDefault();
        onClose();
      },
      PageDown: () => {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 5, results.length - 1));
      },
      PageUp: () => {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 5, 0));
      },
      Home: () => {
        e.preventDefault();
        setSelectedIndex(0);
      },
      End: () => {
        e.preventDefault();
        setSelectedIndex(results.length - 1);
      }
    };

    const handler = handlers[e.key];
    if (handler) handler();
  };

  const openExternalResult = async (result) => {
    let collection = findCollectionByPath(result.row.collectionPath);
    if (!collection) return;

    if (collection.mountStatus !== 'mounted') {
      await dispatch(mountCollection({
        collectionUid: collection.uid,
        collectionPathname: collection.pathname,
        brunoConfig: collection.brunoConfig
      })).catch(() => null);
      collection = store.getState().collections.collections.find((c) => c.uid === collection.uid);
    }
    if (!collection) return;

    const relativePath = result.type === SEARCH_TYPES.FOLDER ? result.row.folderPath : result.row.requestPath;
    const item = findItemInCollectionByPathname(collection, path.join(result.row.collectionPath, relativePath));
    if (!item) return;

    if (result.type === SEARCH_TYPES.REQUEST) {
      const existingTab = store.getState().tabs.tabs.find((tab) => tab.uid === item.uid);
      if (existingTab) {
        dispatch(focusTab({ uid: item.uid }));
      } else {
        dispatch(addTab({
          uid: item.uid,
          collectionUid: collection.uid,
          requestPaneTab: getDefaultRequestPaneTab(item),
          type: item.type,
          pathname: item.pathname
        }));
      }
    } else {
      dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, type: 'folder-settings', pathname: item.pathname }));
    }
  };

  const handleResultSelection = async (result) => {
    if (result.type === SEARCH_TYPES.DOCUMENTATION) {
      window.open('https://docs.usebruno.com/', '_blank');
      onClose();
      return;
    }

    if (result.external) {
      await openExternalResult(result);
      onClose();
      return;
    }

    const targetCollection = collections.find((c) => c.uid === result.collectionUid);
    ensureCollectionIsMounted(targetCollection);
    if (targetCollection?.collapsed) {
      dispatch(toggleCollection(targetCollection.uid));
    }
    dispatch(addTab({
      uid: result.item.uid,
      collectionUid: result.collectionUid,
      type: 'collection-settings'
    }));

    onClose();
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const clearSearch = () => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setQuery('');
  };

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => inputRef.current?.focus(), SEARCH_CONFIG.FOCUS_DELAY);
      setQuery('');
      setExternalResults([]);
      setLocalResults(createCollectionResults());
      setSelectedIndex(0);

      return () => clearTimeout(timeoutId);
    }
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    if (!query.trim()) {
      performLocalSearch(query);
      fetchIndexResults(query);
      setSelectedIndex(0);
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      performLocalSearch(query);
      fetchIndexResults(query);
      setSelectedIndex(0);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);

    return () => clearTimeout(debounceTimeoutRef.current);
  }, [isOpen, query, performLocalSearch, fetchIndexResults]);

  useEffect(() => {
    if (results.length > 0) {
      virtuosoRef.current?.scrollIntoView({ index: selectedIndex, behavior: SEARCH_CONFIG.SCROLL_BEHAVIOR });
    }
  }, [selectedIndex, results]);

  const getResultIcon = (type) => {
    const iconMap = {
      [SEARCH_TYPES.DOCUMENTATION]: IconBook,
      [SEARCH_TYPES.COLLECTION]: IconBox,
      [SEARCH_TYPES.FOLDER]: IconFolder,
      [SEARCH_TYPES.REQUEST]: IconFileText
    };
    const IconComponent = iconMap[type] || IconFileText;
    return <IconComponent size={18} stroke={1.5} />;
  };

  const resultKey = (result, index) => result.external
    ? `ext-${result.row.collectionPath}:${result.row.requestPath || result.row.folderPath}`
    : `${result.type}-${result.item.id || result.item.uid}-${index}`;

  const renderResultRow = (index, result) => {
    const isSelected = index === selectedIndex;
    const typeLabel = getTypeLabel(result.type);
    const urlText = result.type === SEARCH_TYPES.REQUEST
      ? (result.external ? (result.row.requestUrl || '') : (result.item.request?.url || ''))
      : null;

    return (
      <div
        id={`search-result-${index}`}
        className={`result-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleResultSelection(result)}
        data-selected={isSelected}
        data-type={result.type}
        role="option"
        aria-selected={isSelected}
        aria-label={`${result.name}, ${typeLabel || result.type}${result.method ? `, ${result.method}` : ''}`}
        tabIndex={-1}
      >
        <div className="result-icon">
          {getResultIcon(result.type)}
        </div>
        <div className="result-content">
          <div className="result-info">
            <div className="result-name">
              {highlightText(result.name, query)}
            </div>
            <div className="result-path">
              {result.type === SEARCH_TYPES.DOCUMENTATION
                ? result.description
                : result.type === SEARCH_TYPES.REQUEST
                  ? highlightText(urlText || '', query)
                  : highlightText(result.path, query)}
            </div>
          </div>
          <div className="result-badges">
            {result.type === SEARCH_TYPES.REQUEST && result.method && (
              <span
                className={`method-badge ${result.method.toLowerCase()}`}
                aria-label={`HTTP method ${result.method.toUpperCase().replace(/-/g, ' ')}`}
              >
                {result.method.toUpperCase().replace(/-/g, ' ')}
              </span>
            )}
            {typeLabel && (
              <div className="result-type" aria-label={`Item type ${typeLabel}`}>
                {typeLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <StyledWrapper>
      <div
        className="command-k-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        aria-describedby="search-modal-description"
      >
        <div className="command-k-modal" onClick={(e) => e.stopPropagation()}>
          <h1 id="search-modal-title" className="sr-only">Global Search</h1>
          <p id="search-modal-description" className="sr-only">
            Search through collections, requests, folders, and documentation. Use arrow keys to navigate results and Enter to select.
          </p>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {results.length > 0 && query
              ? `${results.length} result${results.length === 1 ? '' : 's'} found`
              : query && results.length === 0
                ? 'No results found'
                : ''}
          </div>
          <div className="command-k-header">
            <div className="search-input-container">
              <IconSearch size={20} className="search-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search collections, requests, or documentation..."
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyNavigation}
                className="search-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Search collections, requests, or documentation"
                aria-expanded={results.length > 0}
                aria-controls="search-results"
                aria-activedescendant={results.length > 0 ? `search-result-${selectedIndex}` : undefined}
                role="combobox"
                aria-autocomplete="list"
                data-testid="global-search-input"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="clear-button"
                  aria-label="Clear search query"
                  type="button"
                >
                  <IconX size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {showIndexingStatus && (
            <div className="search-index-status" data-testid="global-search-indexing-status">Indexing…</div>
          )}
          {showIndexingStatus && (
            <IndeterminateProgressBar active data-testid="global-search-indexing-progress" />
          )}

          <div
            className="command-k-results"
            id="search-results"
            role="listbox"
            aria-label="Search results"
          >
            {results.length === 0 && query ? (
              <div className="no-results">
                <p>
                  No results found for "{query}".
                  <br />
                  <span className="block mt-2">
                    The item might not exist yet, or its collection isn’t mounted. Press <strong>Enter</strong> here (or open it from the sidebar) to mount the collection automatically.
                  </span>
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <p>
                  No collections are currently mounted or visible.
                  <br />
                  <span className="block mt-2">
                    Mount a collection via the sidebar or this search modal, then try again.
                  </span>
                </p>
              </div>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
                data={results}
                style={{ height: Math.min(results.length, MAX_VISIBLE_RESULTS) * RESULT_ROW_HEIGHT }}
                fixedItemHeight={RESULT_ROW_HEIGHT}
                increaseViewportBy={RESULT_ROW_HEIGHT * 4}
                computeItemKey={(index, result) => resultKey(result, index)}
                itemContent={renderResultRow}
              />
            )}
          </div>

          <div className="command-k-footer">
            <div className="keyboard-hints" role="region" aria-label="Keyboard shortcuts">
              <span aria-label="Use up and down arrows to navigate">
                <span className="keycap" aria-hidden="true">↑</span>
                <span className="keycap" aria-hidden="true">↓</span>
                <span className="hint-label">to navigate</span>
              </span>
              <span aria-label="Press Enter to select">
                <span className="keycap" aria-hidden="true">↵</span>
                <span className="hint-label">to select</span>
              </span>
              <span aria-label="Press Escape to close">
                <span className="keycap" aria-hidden="true">esc</span>
                <span className="hint-label">to close</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GlobalSearchModal;
