import React, { useState, useEffect, useRef } from 'react';
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
import { getDefaultRequestPaneTab } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

// Constants
const SEARCH_TYPES = {
  DOCUMENTATION: 'documentation',
  COLLECTION: 'collection',
  FOLDER: 'folder',
  REQUEST: 'request'
};

const MATCH_TYPES = {
  COLLECTION: 'collection',
  FOLDER: 'folder', 
  REQUEST: 'request',
  URL: 'url',
  PATH: 'path',
  DOCUMENTATION: 'documentation'
};

const DOCUMENTATION_RESULT = {
  type: SEARCH_TYPES.DOCUMENTATION,
  item: { id: 'docs', name: 'Bruno Documentation' },
  name: 'Bruno Documentation',
  path: '/',
  description: 'Browse the official Bruno documentation',
  matchType: MATCH_TYPES.DOCUMENTATION
};

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const dispatch = useDispatch();
  
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);

  const normalizeQuery = (searchQuery) => {
    return searchQuery.trim().replace(/\/+/g, '/');
  };

  const isValidQuery = (normalizedQuery) => {
    return normalizedQuery && 
           normalizedQuery !== '/' && 
           !(normalizedQuery.length === 1 && !normalizedQuery.match(/[a-zA-Z0-9]/));
  };

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
        const itemPath = getItemPath(item, collection);
        const itemPathLower = itemPath.toLowerCase();

        if (isItemARequest(item)) {
          const nameMatch = searchTerms.every(term => item.name.toLowerCase().includes(term));
          const urlMatch = searchTerms.every(term => (item.request?.url || '').toLowerCase().includes(term));
          const pathMatch = enablePathMatch && searchTerms.every(term => itemPathLower.includes(term));

          if (nameMatch || urlMatch || pathMatch) {
            results.push({
              type: SEARCH_TYPES.REQUEST,
              item,
              name: item.name,
              path: itemPath,
              matchType: nameMatch ? MATCH_TYPES.REQUEST : urlMatch ? MATCH_TYPES.URL : MATCH_TYPES.PATH,
              method: item.request?.method || '',
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

  const sortResults = (results) => {
    return results.sort((a, b) => {
      // Documentation always first
      if (a.type === SEARCH_TYPES.DOCUMENTATION) return -1;
      if (b.type === SEARCH_TYPES.DOCUMENTATION) return 1;
      
      // Sort by match type priority
      const matchTypeOrder = { 
        [MATCH_TYPES.COLLECTION]: 0, 
        [MATCH_TYPES.FOLDER]: 1, 
        [MATCH_TYPES.REQUEST]: 2, 
        [MATCH_TYPES.URL]: 3, 
        [MATCH_TYPES.PATH]: 4 
      };
      const aMatchType = matchTypeOrder[a.matchType] ?? 5;
      const bMatchType = matchTypeOrder[b.matchType] ?? 5;
      
      if (aMatchType !== bMatchType) return aMatchType - bMatchType;
      
      // Sort by type priority
      const typeOrder = { 
        [SEARCH_TYPES.COLLECTION]: 0, 
        [SEARCH_TYPES.FOLDER]: 1, 
        [SEARCH_TYPES.REQUEST]: 2 
      };
      const aType = typeOrder[a.type] ?? 3;
      const bType = typeOrder[b.type] ?? 3;
      
      if (aType !== bType) return aType - bType;
      
      // Finally sort alphabetically
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
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

  const getItemPath = (item, collection) => {
    const pathParts = [];
    let currentItem = item;
    let depth = 0;
    const maxDepth = 20;

    while (currentItem && depth < maxDepth) {
      pathParts.unshift(currentItem.name);
      const parent = findParentItemInCollection(collection, currentItem.uid);
      if (parent) {
        currentItem = parent;
        depth++;
      } else {
        break;
      }
    }
    
    pathParts.unshift(collection.name);
    return pathParts.join('/');
  };

  const expandItemPath = (result) => {
    const collection = collections.find(c => c.uid === result.collectionUid);
    if (!collection) return;

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
    performSearch(newQuery);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  // Initialize modal when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      performSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      selectedElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex, results]);

  if (!isOpen) return null;

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

  const getTypeLabel = (type, matchType) => {
    const baseLabels = {
      [SEARCH_TYPES.DOCUMENTATION]: 'Documentation',
      [SEARCH_TYPES.COLLECTION]: 'Collection',
      [SEARCH_TYPES.FOLDER]: 'Folder'
    };
    
    const baseLabel = baseLabels[type] || '';
    return matchType === MATCH_TYPES.PATH ? `${baseLabel} (path match)` : baseLabel;
  };

  const highlightText = (text, searchQuery) => {
    if (!searchQuery) return text;
    
    try {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return text.split(regex).map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="highlight">{part}</span>
        ) : part
      );
    } catch {
      return text;
    }
  };

  return (
    <StyledWrapper>
      <div className="command-k-overlay" onClick={onClose}>
        <div className="command-k-modal" onClick={(e) => e.stopPropagation()}>
          <div className="command-k-header">
            <div className="search-input-container">
              <IconSearch size={20} className="search-icon" />
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
              />
              {query && (
                <button onClick={clearSearch} className="clear-button">
                  <IconX size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div className="command-k-results" ref={resultsRef}>
            {results.length === 0 && query ? (
              <div className="no-results">
                <p>No results found for "{query}"</p>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <p>No results found</p>
              </div>
            ) : (
              results.map((result, index) => {
                const isSelected = index === selectedIndex;
                const typeLabel = getTypeLabel(result.type, result.matchType);
                
                return (
                  <div
                    key={`${result.type}-${result.item.id || result.item.uid}-${index}`}
                    className={`result-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleResultSelection(result)}
                    data-selected={isSelected}
                    data-type={result.type}
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
                          <span className={`method-badge ${result.method.toLowerCase()}`}>
                            {result.method}
                          </span>
                        )}
                        {typeLabel && (
                          <div className="result-type">
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
            <div className="keyboard-hints">
              <span>
                <span className="keycap">↑</span>
                <span className="keycap">↓</span>
                <span className="hint-label">to navigate</span>
              </span>
              <span>
                <span className="keycap">↵</span>
                <span className="hint-label">to select</span>
              </span>
              <span>
                <span className="keycap">esc</span>
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