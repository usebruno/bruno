import React, { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconSearch, IconX } from '@tabler/icons';
import { addFileToAISelection, removeFileFromAISelection, clearAIFileSelection } from 'providers/ReduxStore/slices/app';
import { isItemARequest, isItemAFolder } from 'utils/tabs';
import { debounce } from 'lodash';
import StyledWrapper from './StyledWrapper';

// Flatten collection items recursively, including path info
const flattenItems = (items, parentPath = '') => {
  const result = [];
  for (const item of items || []) {
    const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (isItemARequest(item)) {
      result.push({
        ...item,
        path: parentPath
      });
    } else if (isItemAFolder(item) && item.items) {
      result.push(...flattenItems(item.items, currentPath));
    }
  }
  return result;
};

const FileSelector = ({ collectionUid }) => {
  const dispatch = useDispatch();
  const [searchText, setSearchText] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Debounced search to avoid filtering on every keystroke
  const debouncedSetSearch = useMemo(
    () => debounce((value) => setSearchText(value), 150),
    []
  );

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearchText('');
  }, []);

  const collection = useSelector((state) =>
    state.collections.collections.find((c) => c.uid === collectionUid)
  );
  const selectedFiles = useSelector((state) => state.app.selectedFilesForAI);

  // Flatten and filter items
  const allItems = useMemo(() => {
    if (!collection) return [];
    return flattenItems(collection.items);
  }, [collection]);

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return allItems;
    const search = searchText.toLowerCase();
    return allItems.filter((item) =>
      item.name.toLowerCase().includes(search) || item.request?.url?.toLowerCase().includes(search)
    );
  }, [allItems, searchText]);

  const isSelected = (itemUid) => selectedFiles.some((f) => f.itemUid === itemUid);

  const handleToggleItem = (item) => {
    if (isSelected(item.uid)) {
      dispatch(removeFileFromAISelection(item.uid));
    } else {
      dispatch(addFileToAISelection({
        itemUid: item.uid,
        collectionUid,
        name: item.name,
        method: item.request?.method || 'GET',
        url: item.request?.url || ''
      }));
    }
  };

  const handleClearAll = () => {
    dispatch(clearAIFileSelection());
  };

  const getMethodClass = (method) => {
    return (method || 'get').toLowerCase();
  };

  if (!collection) {
    return (
      <StyledWrapper>
        <div className="empty-state">No collection found</div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="search-input">
        <IconSearch size={14} aria-hidden="true" />
        <input
          type="text"
          placeholder="Search requests..."
          value={searchInput}
          onChange={handleSearchChange}
          aria-label="Search requests"
        />
        {searchInput && (
          <IconX
            size={14}
            style={{ cursor: 'pointer' }}
            onClick={handleClearSearch}
            role="button"
            aria-label="Clear search"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClearSearch()}
          />
        )}
      </div>

      <div className="selection-header">
        <span className="selection-count">
          {selectedFiles.length} selected
        </span>
        {selectedFiles.length > 0 && (
          <button className="clear-btn" onClick={handleClearAll}>
            Clear all
          </button>
        )}
      </div>

      <div className="file-list">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            {searchText ? 'No matching requests' : 'No requests in collection'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const selected = isSelected(item.uid);
            return (
              <div
                key={item.uid}
                className={`file-item ${selected ? 'selected' : ''}`}
                onClick={() => handleToggleItem(item)}
                onKeyDown={(e) => e.key === 'Enter' && handleToggleItem(item)}
                role="checkbox"
                aria-checked={selected}
                tabIndex={0}
              >
                <div
                  className={`checkbox ${selected ? 'checked' : ''}`}
                  aria-hidden="true"
                />
                <span className={`method-badge ${getMethodClass(item.request?.method)}`}>
                  {(item.request?.method || 'GET').substring(0, 3)}
                </span>
                <span className="file-name">{item.name}</span>
                {item.path && (
                  <span className="folder-path" title={item.path}>
                    {item.path}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </StyledWrapper>
  );
};

export default FileSelector;
