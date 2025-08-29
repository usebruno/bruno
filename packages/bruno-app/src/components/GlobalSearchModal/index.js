import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  IconSearch,
  IconX,
  IconFolder,
  IconBox,
  IconFileText,
  IconBook
} from '@tabler/icons';
import { flattenItems, isItemARequest, isItemAFolder, findParentItemInCollection } from 'utils/collections';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { hideHomePage } from 'providers/ReduxStore/slices/app';
import { toggleCollectionItem, toggleCollection } from 'providers/ReduxStore/slices/collections';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { getDefaultRequestPaneTab } from 'utils/collections';
import { normalizeQuery, isValidQuery, highlightText, sortResults, getTypeLabel, getItemPath } from './utils/searchUtils';
import { SEARCH_TYPES, MATCH_TYPES, SEARCH_CONFIG, DOCUMENTATION_RESULT } from './constants';
import StyledWrapper from './StyledWrapper';



const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const dispatch = useDispatch();

  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);



  const createCollectionResults = () => {
    const collectionResults = collections.map(collection => ({
      type: SEARCH_TYPES.COLLECTION,
      item: collection,
      name: collection.name,
      path: collection.name,
      matchType: MATCH_TYPES.COLLECTION,
      collectionUid: collection.uid
    }));

    collectionResults.sort((a, b) => a.name.localeCompare(b.name));
    return [DOCUMENTATION_RESULT, ...collectionResults];
  };

  const searchInCollections = (searchTerms, enablePathMatch) => {
    const results = [];

    // Check for documentation match
    const queryLower = searchTerms.join(' ');
    if (['documentation', 'docs', 'bruno docs'].some(term => term.includes(queryLower))) {
      results.push(DOCUMENTATION_RESULT);
    }

    collections.forEach(collection => {
      // Search collection name
      if (searchTerms.every(term => collection.name.toLowerCase().includes(term))) {
        results.push({
          type: SEARCH_TYPES.COLLECTION,
          item: collection,
          name: collection.name,
          path: collection.name,
          matchType: MATCH_TYPES.COLLECTION,
          collectionUid: collection.uid
        });
      }

      // Search collection items
      const flattenedItems = flattenItems(collection.items);
      flattenedItems.forEach(item => {
        const itemPath = getItemPath(item, collection, findParentItemInCollection);
        const itemPathLower = itemPath.toLowerCase();

        if (isItemARequest(item)) {
          const nameMatch = searchTerms.every(term => item.name.toLowerCase().includes(term));
          const urlMatch = searchTerms.every(term => (item.request?.url || '').toLowerCase().includes(term));
          const pathMatch = enablePathMatch && searchTerms.every(term => itemPathLower.includes(term));

          if (nameMatch || urlMatch || pathMatch) {
            // Check if this is a gRPC request and get the method type
            const isGrpcRequest = item.request?.type === 'grpc';
            
            let method = item.request?.method || '';
            
            if (isGrpcRequest) {
              // For gRPC requests, use the methodType
              const methodType = item.request?.methodType || 'UNARY';
              method = methodType.toLowerCase().replace(/[_]/g, '-');
            }
            
            results.push({
              type: SEARCH_TYPES.REQUEST,
              item,
              name: item.name,
              path: itemPath,
              matchType: nameMatch ? MATCH_TYPES.REQUEST : urlMatch ? MATCH_TYPES.URL : MATCH_TYPES.PATH,
              method,
              collectionUid: collection.uid
            });
          }
        } else if (isItemAFolder(item)) {
          const nameMatch = searchTerms.every(term => item.name.toLowerCase().includes(term));
          const pathMatch = enablePathMatch && searchTerms.every(term => itemPathLower.includes(term));

          if (nameMatch || pathMatch) {
            results.push({
              type: SEARCH_TYPES.FOLDER,
              item,
              name: item.name,
              path: itemPath,
              matchType: nameMatch ? MATCH_TYPES.FOLDER : MATCH_TYPES.PATH,
              collectionUid: collection.uid
            });
          }
        }
      });
    });

    return results;
  };



  const performSearch = (searchQuery) => {
    const normalizedQuery = normalizeQuery(searchQuery);

    if (!normalizedQuery) {
      setResults(createCollectionResults());
      return;
    }

    if (!isValidQuery(normalizedQuery)) {
      setResults([]);
      return;
    }

    const searchTerms = normalizedQuery.toLowerCase().split(/[\s\/]+/).filter(Boolean);
    if (!searchTerms.length) {
      setResults([]);
      return;
    }

    const enablePathMatch = normalizedQuery.includes('/');
    const searchResults = searchInCollections(searchTerms, enablePathMatch);
    const sortedResults = sortResults(searchResults);

    setResults(sortedResults);
    setSelectedIndex(0);
  };

  const debouncedSearch = useCallback((searchQuery) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);
  }, [collections]); // Depend on collections to recreate when they change



  const expandItemPath = (result) => {
    const collection = collections.find(c => c.uid === result.collectionUid);
    if (!collection) return;

    ensureCollectionIsMounted(collection);

    if (collection.collapsed) {
      dispatch(toggleCollection(collection.uid));
    }

    let currentItem = result.type === SEARCH_TYPES.FOLDER 
      ? result.item 
      : findParentItemInCollection(collection, result.item.uid);

    while (currentItem?.type === 'folder') {
      if (currentItem.collapsed) {
        dispatch(toggleCollectionItem({ collectionUid: collection.uid, itemUid: currentItem.uid }));
      }
      currentItem = findParentItemInCollection(collection, currentItem.uid);
    }
  };

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
        setSelectedIndex(prev => prev < results.length - 1 ? prev + 1 : 0);
      },
      ArrowUp: () => {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : results.length - 1);
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
        setSelectedIndex(prev => Math.min(prev + 5, results.length - 1));
      },
      PageUp: () => {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 5, 0));
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

  const handleResultSelection = (result) => {
    const targetCollection = collections.find(c => c.uid === result.collectionUid);
    ensureCollectionIsMounted(targetCollection);

    if (result.type === SEARCH_TYPES.DOCUMENTATION) {
      window.open('https://docs.usebruno.com/', '_blank');
      onClose();
      return;
    }

    expandItemPath(result);

    if (result.type === SEARCH_TYPES.REQUEST) {
      dispatch(hideHomePage());

      const existingTab = tabs.find(tab => tab.uid === result.item.uid);

      if (existingTab) {
        dispatch(focusTab({ uid: result.item.uid }));
      } else {
        dispatch(addTab({
          uid: result.item.uid,
          collectionUid: result.collectionUid,
          requestPaneTab: getDefaultRequestPaneTab(result.item),
          type: 'request',
        }));
      }
    } else if (result.type === SEARCH_TYPES.FOLDER) {
      dispatch(addTab({
        uid: result.item.uid,
        collectionUid: result.collectionUid,
        type: 'folder-settings',
      }));
    } else if (result.type === SEARCH_TYPES.COLLECTION) {
      dispatch(addTab({
        uid: result.item.uid,
        collectionUid: result.collectionUid,
        type: 'collection-settings',
      }));
    }

    onClose();
  };

  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    if (newQuery.trim()) {
      debouncedSearch(newQuery);
    } else {
      // For empty queries, search immediately to show collections
      performSearch(newQuery);
    }
  };

  const clearSearch = () => {
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    setQuery('');
    setResults([]);
  };

  // Initialize modal when opened
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => inputRef.current?.focus(), SEARCH_CONFIG.FOCUS_DELAY);
      setQuery('');
      performSearch('');
      setSelectedIndex(0);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Clear any pending debounced search when modal closes
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    }
  }, [isOpen]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      selectedElement?.scrollIntoView({
        behavior: SEARCH_CONFIG.SCROLL_BEHAVIOR,
        block: SEARCH_CONFIG.SCROLL_BLOCK
      });
    }
  }, [selectedIndex, results]);

  // Cleanup debounce timeout on unmount or modal close
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

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
                : ''
            }
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

          <div 
            className="command-k-results" 
            ref={resultsRef}
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
              results.map((result, index) => {
                const isSelected = index === selectedIndex;
                const typeLabel = getTypeLabel(result.type);

                return (
                  <div
                    key={`${result.type}-${result.item.id || result.item.uid}-${index}`}
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
                              ? highlightText(result.item.request?.url || '', query)
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
              })
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