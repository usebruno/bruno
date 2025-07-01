import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  IconSearch,
  IconX,
  IconFolder,
  IconDatabase,
  IconFileText,
  IconBook
} from '@tabler/icons';
import { flattenItems, isItemARequest, isItemAFolder, findParentItemInCollection } from 'utils/collections';
import { useDispatch } from 'react-redux';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { hideHomePage } from 'providers/ReduxStore/slices/app';
import { getDefaultRequestPaneTab } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { collapseCollection, collectionFolderClicked } from 'providers/ReduxStore/slices/collections';

// Helper to construct the documentation search result
const createDocumentationResult = () => ({
  type: 'documentation',
  item: { id: 'docs', name: 'Bruno Documentation', path: '/', description: 'Browse the official Bruno documentation' },
  name: 'Bruno Documentation',
  path: '/',
  description: 'Browse the official Bruno documentation',
  matchType: 'documentation'
});

const CommandKSearch = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const dispatch = useDispatch();
  
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);

  const performSearch = (query) => {
    // Clean up the query
    const cleanedQuery = query.trim().replace(/\/+/g, '/');
    
    // If no query, show all collections and documentation
    if (!cleanedQuery) {
      const collectionResults = collections.map(collection => ({
        type: 'collection',
        item: collection,
        name: collection.name,
        path: collection.name,
        matchType: 'collection',
        collectionUid: collection.uid
      }));
      
      // Add documentation option
      const docResult = createDocumentationResult();
      
      // Sort collections alphabetically and add docs at the top
      collectionResults.sort((a, b) => a.name.localeCompare(b.name));
      
      setSearchResults([docResult, ...collectionResults]);
      return;
    }

    // Don't show results for just slashes or single special characters
    if (cleanedQuery === '/' || (cleanedQuery.length === 1 && !cleanedQuery.match(/[a-zA-Z0-9]/))) {
      setSearchResults([]);
      return;
    }

    const results = [];
    const queryLower = cleanedQuery.toLowerCase();
    const searchTerms = queryLower.split(/[\s\/]+/).filter(Boolean);
    
    // If no valid search terms after splitting, don't show results
    if (!searchTerms.length) {
      setSearchResults([]);
      return;
    }

    // Check if query matches documentation
    if ('documentation'.includes(queryLower) || 'docs'.includes(queryLower) || 'bruno docs'.includes(queryLower)) {
      results.push(createDocumentationResult());
    }

    // Only enable path based matching when the user explicitly searches with a slash character
    const enablePathMatch = cleanedQuery.includes('/');

    collections.forEach(collection => {
      // Search collection name
      const collectionNameLower = collection.name.toLowerCase();
      if (searchTerms.every(term => collectionNameLower.includes(term))) {
        results.push({
          type: 'collection',
          item: collection,
          name: collection.name,
          path: collection.name, // Collections are at root level
          matchType: 'collection',
          collectionUid: collection.uid // Collections are their own collection
        });
      }

      // Search through collection items
      const flattenedItems = flattenItems(collection.items);
      
      flattenedItems.forEach(item => {
        let matchType = '';
        let isMatch = false;
        const itemPath = getItemPath(item, collection);
        const itemPathLower = itemPath.toLowerCase();

        // Search request name and path
        if (isItemARequest(item)) {
          const nameLower = item.name.toLowerCase();
          const urlLower = (item.request?.url || '').toLowerCase();
          const method = item.request?.method || '';
          
          const nameMatches = searchTerms.every(term => nameLower.includes(term));
          const urlMatches = searchTerms.every(term => urlLower.includes(term));
          const pathMatches = enablePathMatch && searchTerms.every(term => itemPathLower.includes(term));

          if (nameMatches || urlMatches || pathMatches) {
            if (nameMatches) matchType = 'request';
            else if (urlMatches) matchType = 'url';
            else matchType = 'path';
            isMatch = true;
          }

          if (isMatch) {
            results.push({
              type: 'request',
              item,
              name: item.name,
              path: itemPath,
              matchType,
              method,
              collectionUid: collection.uid
            });
          }
        }
        // Search folder name and path
        else if (isItemAFolder(item)) {
          const nameLower = item.name.toLowerCase();
          
          const nameMatches = searchTerms.every(term => nameLower.includes(term));
          const pathMatches = enablePathMatch && searchTerms.every(term => itemPathLower.includes(term));

          if (nameMatches || pathMatches) {
            matchType = nameMatches ? 'folder' : 'path';
            isMatch = true;
          }

          if (isMatch) {
            results.push({
              type: 'folder',
              item,
              name: item.name,
              path: itemPath,
              matchType,
              collectionUid: collection.uid
            });
          }
        }
      });
    });

    // Sort results to keep documentation at the top if present
    results.sort((a, b) => {
      if (a.type === 'documentation') return -1;
      if (b.type === 'documentation') return 1;
      
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Then sort by match type (name matches first, then path matches)
      const matchTypeOrder = { collection: 0, folder: 1, request: 2, url: 3, path: 4 };
      const aMatchType = matchTypeOrder[a.matchType] ?? 5;
      const bMatchType = matchTypeOrder[b.matchType] ?? 5;
      
      if (aMatchType !== bMatchType) return aMatchType - bMatchType;
      
      // Then sort by type (collections first, then folders, then requests)
      const typeOrder = { collection: 0, folder: 1, request: 2 };
      const aType = typeOrder[a.type] ?? 3;
      const bType = typeOrder[b.type] ?? 3;
      
      if (aType !== bType) return aType - bType;
      
      // Finally sort alphabetically by name
      return aName.localeCompare(bName);
    });

    setSearchResults(results);
    setSelectedIndex(0);
  };

  // Get the full path of an item for display and matching
  const getItemPath = (item, collection) => {
    const pathParts = [];
    let currentItem = item;
    let depth = 0;
    const maxDepth = 20; // Prevent infinite loops

    // Traverse up to the collection root
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
    // Add collection name at the start
    pathParts.unshift(collection.name);
    return pathParts.join('/');
  };

  // Helper to expand collection/folder path in sidebar
  const expandResultPath = (result) => {
    const collection = collections.find(c => c.uid === result.collectionUid);
    if (!collection) return;

    if (collection.collapsed) {
      dispatch(collapseCollection(collection.uid));
    }

    let currentItem = null;
    if (result.type === 'folder') currentItem = result.item;
    else if (result.type === 'request') currentItem = findParentItemInCollection(collection, result.item.uid);

    while (currentItem && currentItem.type === 'folder') {
      if (currentItem.collapsed) {
        dispatch(collectionFolderClicked({ collectionUid: collection.uid, itemUid: currentItem.uid }));
      }
      currentItem = findParentItemInCollection(collection, currentItem.uid);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const nextIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : searchResults.length - 1;
          return nextIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleResultSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'PageDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const nextIndex = Math.min(prev + 5, searchResults.length - 1);
          return nextIndex;
        });
        break;
      case 'PageUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const nextIndex = Math.max(prev - 5, 0);
          return nextIndex;
        });
        break;
      case 'Home':
        e.preventDefault();
        setSelectedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setSelectedIndex(searchResults.length - 1);
        break;
    }
  };

  // Handle result selection
  const handleResultSelect = (result) => {
    if (result.type === 'documentation') {
      window.open('https://docs.usebruno.com/', '_blank');
      onClose();
      return;
    }

    // Expand sidebar path to the selected item/collection
    expandResultPath(result);

    if (result.type === 'request') {
      dispatch(hideHomePage());
      
      // Check if tab already exists
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
    } else if (result.type === 'folder') {
      dispatch(addTab({
        uid: result.item.uid,
        collectionUid: result.collectionUid,
        type: 'folder-settings',
      }));
    } else if (result.type === 'collection') {
      // Open collection settings
      dispatch(addTab({
        uid: result.item.uid,
        collectionUid: result.collectionUid,
        type: 'collection-settings',
      }));
    }
    onClose();
  };

  // Handle input change
  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setSearchQuery('');
      // Show collections when modal opens
      performSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && searchResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex, searchResults]);

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'documentation':
        return <IconBook size={18} stroke={1.5} />;
      case 'collection':
        return <IconDatabase size={18} stroke={1.5} />;
      case 'folder':
        return <IconFolder size={18} stroke={1.5} />;
      case 'request':
        return <IconFileText size={18} stroke={1.5} />;
      default:
        return <IconFileText size={18} stroke={1.5} />;
    }
  };

  const getTypeLabel = (type, matchType) => {
    const baseLabel = (() => {
      switch (type) {
        case 'documentation':
          return 'Documentation';
        case 'collection':
          return 'Collection';
        case 'folder':
          return 'Folder';
        default:
          return '';
      }
    })();
    
    if (matchType === 'path') return `${baseLabel} (path match)`;
    return baseLabel;
  };

  // Highlight query match in text
  const getHighlightedText = (text, query) => {
    if (!query) return text;
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.split(regex).map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="highlight">{part}</span>
        ) : (
          part
        )
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
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="search-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="clear-button"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div className="command-k-results" ref={resultsRef}>
            {searchResults.length === 0 && searchQuery ? (
              <div className="no-results">
                <p>No results found for "{searchQuery}"</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="empty-state">
                <p>No results found</p>
              </div>
            ) : (
              searchResults.map((result, index) => {
                const isSelected = index === selectedIndex;
                const className = `result-item ${isSelected ? 'selected' : ''}`;
                const typeLabel = getTypeLabel(result.type, result.matchType);
                
                return (
                  <div
                    key={`${result.type}-${result.item.id || result.item.uid}-${index}`}
                    className={className}
                    onClick={() => handleResultSelect(result)}
                    data-selected={isSelected}
                    data-type={result.type}
                  >
                    <div className="result-icon">
                      {getIcon(result.type)}
                    </div>
                    <div className="result-content">
                      <div className="result-info">
                        <div className="result-name">{getHighlightedText(result.name, searchQuery)}</div>
                        <div className="result-path">
                          {result.type === 'documentation' 
                            ? result.description 
                            : getHighlightedText(result.path, searchQuery)}
                        </div>
                      </div>
                      <div className="result-badges">
                        {result.type === 'request' && result.method && (
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

export default CommandKSearch; 