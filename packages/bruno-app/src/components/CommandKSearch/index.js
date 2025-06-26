import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { IconSearch, IconX, IconFolder, IconFile, IconDatabase } from '@tabler/icons';
import { flattenItems, isItemARequest, isItemAFolder, findParentItemInCollection } from 'utils/collections';
import { useDispatch } from 'react-redux';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { hideHomePage } from 'providers/ReduxStore/slices/app';
import { getDefaultRequestPaneTab } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const CommandKSearch = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const dispatch = useDispatch();
  
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);

  // Enhanced search function that searches through requests, folders, and collections
  const performSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = [];
    const queryLower = query.toLowerCase();

    // Only enable path based matching when the user explicitly searches with a slash character
    const enablePathMatch = query.includes('/');

    collections.forEach(collection => {
      // Search collection name
      if (collection.name.toLowerCase().includes(queryLower)) {
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

        // Search request name and path
        if (isItemARequest(item)) {
          const nameMatches = item.name.toLowerCase().includes(queryLower);
          const pathMatches = enablePathMatch && isPathMatch(itemPath, queryLower);

          if (nameMatches || pathMatches) {
            matchType = nameMatches ? 'request' : 'path';
            isMatch = true;
          }
        }
        // Search folder name and path
        else if (isItemAFolder(item)) {
          const nameMatches = item.name.toLowerCase().includes(queryLower);
          const pathMatches = enablePathMatch && isPathMatch(itemPath, queryLower);

          if (nameMatches || pathMatches) {
            matchType = nameMatches ? 'folder' : 'path';
            isMatch = true;
          }
        }

        if (isMatch) {
          results.push({
            type: isItemARequest(item) ? 'request' : 'folder',
            item,
            name: item.name,
            path: itemPath,
            matchType,
            collectionUid: collection.uid
          });
        }
      });
    });

    // Sort results by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === queryLower;
      const bExact = b.name.toLowerCase() === queryLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then sort by match type (name matches first, then path matches)
      const matchTypeOrder = { collection: 0, folder: 1, request: 2, path: 3 };
      const aMatchType = matchTypeOrder[a.matchType];
      const bMatchType = matchTypeOrder[b.matchType];
      
      if (aMatchType !== bMatchType) return aMatchType - bMatchType;
      
      // Then sort by type (collections first, then folders, then requests)
      const typeOrder = { collection: 0, folder: 1, request: 2 };
      const aType = typeOrder[a.type];
      const bType = typeOrder[b.type];
      
      if (aType !== bType) return aType - bType;
      
      // Finally sort alphabetically
      return a.name.localeCompare(b.name);
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
    return pathParts.join(' / ');
  };

  // Enhanced path matching function
  const isPathMatch = (itemPath, query) => {
    const itemPathLower = itemPath.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Direct path match
    if (itemPathLower.includes(queryLower)) {
      return true;
    }
    
    // Handle slash-separated paths by converting to space-separated
    const normalizedPath = itemPathLower.replace(/\//g, ' / ');
    const normalizedQuery = queryLower.replace(/\//g, ' / ');
    
    if (normalizedPath.includes(normalizedQuery)) {
      return true;
    }
    
    // Handle space-separated paths by converting to slash-separated
    const slashPath = itemPathLower.replace(/ \/ /g, '/');
    const slashQuery = queryLower.replace(/ \/ /g, '/');
    
    if (slashPath.includes(slashQuery)) {
      return true;
    }
    
    // Handle partial path segments
    const pathSegments = itemPathLower.split(/[\/\s]+/).filter(Boolean);
    const querySegments = queryLower.split(/[\/\s]+/).filter(Boolean);
    
    // Check if all query segments are found in path segments
    return querySegments.every(segment => 
      pathSegments.some(pathSegment => pathSegment.includes(segment))
    );
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
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
    }
  };

  // Handle result selection
  const handleResultSelect = (result) => {
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
      setSearchResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && searchResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, searchResults]);

  // Debug logging
  useEffect(() => {
    if (searchResults.length > 0) {
      console.log('Search results:', searchResults);
      console.log('Selected index:', selectedIndex);
      console.log('Selected result:', searchResults[selectedIndex]);
    }
  }, [searchResults, selectedIndex]);

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'collection':
        return <IconDatabase size={16} />;
      case 'folder':
        return <IconFolder size={16} />;
      case 'request':
        return <IconFile size={16} />;
      default:
        return <IconFile size={16} />;
    }
  };

  const getTypeLabel = (type, matchType) => {
    const baseLabel = (() => {
      switch (type) {
        case 'collection':
          return 'Collection';
        case 'folder':
          return 'Folder';
        case 'request':
          return 'Request';
        default:
          return 'Item';
      }
    })();
    
    // Add match type indicator
    if (matchType === 'path') {
      return `${baseLabel} (path match)`;
    }
    
    return baseLabel;
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
                placeholder="Search by name or path (e.g., 'api/users', 'echo/file', or 'auth login')..."
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
                  onClick={() => setSearchQuery('')}
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
                <p>Start typing to search...</p>
              </div>
            ) : (
              searchResults.map((result, index) => {
                const isSelected = index === selectedIndex;
                const className = `result-item ${isSelected ? 'selected' : ''}`;
                
                return (
                  <div
                    key={`${result.type}-${result.item.uid}-${index}`}
                    className={className}
                    onClick={() => handleResultSelect(result)}
                    data-selected={isSelected}
                    data-type={result.type}
                  >
                    <div className="result-icon">
                      {getIcon(result.type)}
                    </div>
                    <div className="result-content">
                      <div className="result-name">{result.name}</div>
                      <div className="result-path">{result.path}</div>
                    </div>
                    <div className={`result-type ${result.matchType === 'path' ? 'path-match' : ''}`}>
                      {getTypeLabel(result.type, result.matchType)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="command-k-footer">
            <div className="keyboard-hints">
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CommandKSearch; 