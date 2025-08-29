import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconSearch } from '@tabler/icons';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { flattenItems, isItemARequest } from 'utils/collections';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const QuickRequestSearch = ({ onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const collections = useSelector((state) => state.collections.collections);

  const getAllRequests = () => {
    const allRequests = [];
    
    if (!collections || !collections.length) {
      return allRequests;
    }
    
    collections.forEach(collection => {
      if (!collection?.items) return;
      
      const flattened = flattenItems(collection.items);
      
      flattened.forEach(item => {
        if (isItemARequest(item)) {
          allRequests.push({
            ...item,
            collectionUid: collection.uid,
            collectionName: collection.name
          });
        }
      });
    });
    
    return allRequests;
  };

  const allRequests = getAllRequests();
  const filteredRequests = searchTerm
    ? allRequests
        .filter(request => {
          const searchLower = searchTerm.toLowerCase().trim();
          const searchWords = searchLower.split(/\s+/);
          
          const nameMatch = searchWords.every(word => 
            request.name?.toLowerCase().includes(word)
          );
          
          const urlMatch = request.request?.url?.toLowerCase().includes(searchLower);
          const methodMatch = request.request?.method?.toLowerCase().includes(searchLower);
          
          return nameMatch || urlMatch || methodMatch;
        })
        .sort((a, b) => {
          const searchLower = searchTerm.toLowerCase().trim();
          const aName = a.name?.toLowerCase() || '';
          const bName = b.name?.toLowerCase() || '';
          
          const aExact = aName === searchLower;
          const bExact = bName === searchLower;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          const aWordBoundary = new RegExp(`\\b${searchLower}\\b`, 'i').test(a.name || '');
          const bWordBoundary = new RegExp(`\\b${searchLower}\\b`, 'i').test(b.name || '');
          if (aWordBoundary && !bWordBoundary) return -1;
          if (!aWordBoundary && bWordBoundary) return 1;
          
          const aStarts = aName.startsWith(searchLower);
          const bStarts = bName.startsWith(searchLower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          const aIndex = aName.indexOf(searchLower);
          const bIndex = bName.indexOf(searchLower);
          if (aIndex !== -1 && bIndex !== -1 && aIndex !== bIndex) {
            return aIndex - bIndex;
          }
          
          return aName.localeCompare(bName);
        })
    : allRequests;

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredRequests.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredRequests[selectedIndex]) {
        openRequest(filteredRequests[selectedIndex]);
      }
    }
  };

  const openRequest = (request) => {
    if (!request?.uid || !request?.collectionUid) return;
    
    dispatch(
      addTab({
        uid: request.uid,
        collectionUid: request.collectionUid,
        type: request.type || 'http-request'
      })
    );
    onClose();
  };

  const getMethodClassName = (method) => {
    const methodUpper = method?.toUpperCase();
    const methodClasses = {
      GET: 'method-get',
      POST: 'method-post',
      PUT: 'method-put',
      DELETE: 'method-delete',
      PATCH: 'method-patch',
      OPTIONS: 'method-options',
      HEAD: 'method-head'
    };
    return methodClasses[methodUpper] || 'method-default';
  };

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Search Requests"
        confirmText="Open"
        handleConfirm={() => {
          if (filteredRequests[selectedIndex]) {
            openRequest(filteredRequests[selectedIndex]);
          }
        }}
        handleCancel={onClose}
        hideFooter={true}
      >
        <div className="quick-request-search">
          <div className="search-input-wrapper">
            <div className="search-icon">
              <IconSearch size={18} strokeWidth={1.5} />
            </div>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search requests by name, URL, or method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {searchTerm && (
              <button
                className="clear-button"
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="results-container">
            {collections.length === 0 ? (
              <div className="no-results">
                No collections open. Please open a collection first.
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="no-results">
                {searchTerm ? 'No requests found' : allRequests.length === 0 ? 'No requests in collections' : 'Start typing to search'}
              </div>
            ) : (
              <div className="results-list">
                {filteredRequests.map((request, index) => (
                  <div
                    key={request.uid}
                    className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => openRequest(request)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className={`method ${getMethodClassName(request.request?.method)}`}>
                      {request.request?.method || 'GET'}
                    </span>
                    <div className="request-info">
                      <div className="request-name">{request.name}</div>
                      <div className="request-path">
                        <span className="collection-name">{request.collectionName}</span>
                        {request.request?.url && (
                          <>
                            <span className="separator">•</span>
                            <span className="request-url">{request.request.url}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shortcuts-footer">
            <div className="shortcuts-hint">
              <span className="shortcut">
                <kbd>↑</kbd> <kbd>↓</kbd> Navigate
              </span>
              <span className="shortcut">
                <kbd>↵</kbd> Open
              </span>
              <span className="shortcut">
                <kbd>ESC</kbd> Close
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default QuickRequestSearch;
