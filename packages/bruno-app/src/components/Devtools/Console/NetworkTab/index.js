import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  IconFilter,
  IconChevronDown,
  IconNetwork,
} from '@tabler/icons';
import { 
  updateNetworkFilter, 
  toggleAllNetworkFilters, 
  setSelectedRequest
} from 'providers/ReduxStore/slices/logs';
import StyledWrapper from './StyledWrapper';

const MethodBadge = ({ method }) => {
  const getMethodColor = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET': return '#10b981';
      case 'POST': return '#8b5cf6';
      case 'PUT': return '#f59e0b';
      case 'DELETE': return '#ef4444';
      case 'PATCH': return '#06b6d4';
      case 'HEAD': return '#6b7280';
      case 'OPTIONS': return '#84cc16';
      default: return '#6b7280';
    }
  };

  return (
    <span 
      className="method-badge" 
      style={{ backgroundColor: getMethodColor(method) }}
    >
      {method?.toUpperCase() || 'GET'}
    </span>
  );
};

const StatusBadge = ({ status, statusCode }) => {
  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return '#10b981';
    if (code >= 300 && code < 400) return '#f59e0b';
    if (code >= 400 && code < 500) return '#ef4444';
    if (code >= 500) return '#dc2626';
    return '#6b7280';
  };

  const displayStatus = statusCode || status;
  
  return (
    <span 
      className="status-badge" 
      style={{ color: getStatusColor(statusCode) }}
    >
      {displayStatus}
    </span>
  );
};

const NetworkFilterDropdown = ({ filters, requestCounts, onFilterToggle, onToggleAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const allFiltersEnabled = Object.values(filters).every(f => f);
  const activeFilters = Object.entries(filters).filter(([_, enabled]) => enabled);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button 
        className="filter-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Filter requests by method"
      >
        <IconFilter size={16} strokeWidth={1.5} />
        <span className="filter-summary">
          {activeFilters.length === Object.keys(filters).length ? 'All' : `${activeFilters.length}/${Object.keys(filters).length}`}
        </span>
        <IconChevronDown size={14} strokeWidth={1.5} />
      </button>
      
      {isOpen && (
        <div className={`filter-dropdown-menu right`}>
          <div className="filter-dropdown-header">
            <span>Filter by Method</span>
            <button 
              className="filter-toggle-all"
              onClick={() => onToggleAll(!allFiltersEnabled)}
            >
              {allFiltersEnabled ? 'Hide All' : 'Show All'}
            </button>
          </div>
          
          <div className="filter-dropdown-options">
            {Object.keys(filters).map(method => (
              <label key={method} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters[method]}
                  onChange={(e) => onFilterToggle(method, e.target.checked)}
                />
                <div className="filter-option-content">
                  <MethodBadge method={method} />
                  <span className="filter-option-label">{method}</span>
                  <span className="filter-option-count">({requestCounts[method] || 0})</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RequestRow = ({ request, isSelected, onClick }) => {
  const { data } = request;
  const { request: req, response: res, timestamp } = data;
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return '-';
    if (duration < 1000) return `${Math.round(duration)}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatSize = (size) => {
    if (!size) return '-';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getUrl = () => {
    return req?.url || 'Unknown URL';
  };

  const getDomain = () => {
    try {
      const url = new URL(getUrl());
      return url.hostname;
    } catch {
      return getUrl();
    }
  };

  const getPath = () => {
    try {
      const url = new URL(getUrl());
      return url.pathname + url.search;
    } catch {
      return getUrl();
    }
  };

  return (
    <div 
      className={`request-row ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="request-method">
        <MethodBadge method={req?.method} />
      </div>
      
      <div className="request-status">
        <StatusBadge status={res?.status} statusCode={res?.statusCode} />
      </div>
      
      <div className="request-domain" title={getDomain()}>
        {getDomain()}
      </div>
      
      <div className="request-path" title={getPath()}>
        {getPath()}
      </div>
      
      <div className="request-time">
        {formatTime(timestamp)}
      </div>
      
      <div className="request-duration">
        {formatDuration(res?.duration)}
      </div>
      
      <div className="request-size">
        {formatSize(res?.size)}
      </div>
    </div>
  );
};

const NetworkTab = () => {
  const dispatch = useDispatch();
  const { networkFilters, selectedRequest } = useSelector(state => state.logs);
  const collections = useSelector(state => state.collections.collections);

  const allRequests = useMemo(() => {
    const requests = [];
    
    collections.forEach(collection => {
      if (collection.timeline) {
        collection.timeline
          .filter(entry => entry.type === 'request')
          .forEach(entry => {
            requests.push({
              ...entry,
              collectionName: collection.name,
              collectionUid: collection.uid
            });
          });
      }
    });
    
    return requests.sort((a, b) => a.timestamp - b.timestamp);
  }, [collections]);

  const filteredRequests = useMemo(() => {
    return allRequests.filter(request => {
      const method = request.data?.request?.method?.toUpperCase() || 'GET';
      return networkFilters[method];
    });
  }, [allRequests, networkFilters]);

  const requestCounts = useMemo(() => {
    return allRequests.reduce((counts, request) => {
      const method = request.data?.request?.method?.toUpperCase() || 'GET';
      counts[method] = (counts[method] || 0) + 1;
      return counts;
    }, {});
  }, [allRequests]);

  const handleFilterToggle = (method, enabled) => {
    dispatch(updateNetworkFilter({ method, enabled }));
  };

  const handleToggleAllFilters = (enabled) => {
    dispatch(toggleAllNetworkFilters(enabled));
  };

  const handleRequestClick = (request) => {
    dispatch(setSelectedRequest(request));
  };

  return (
    <StyledWrapper>
      <div className="network-content">
        {filteredRequests.length === 0 ? (
          <div className="network-empty">
            <IconNetwork size={48} strokeWidth={1} />
            <p>No network requests</p>
            <span>Requests will appear here as you make API calls</span>
          </div>
        ) : (
          <div className="requests-container">
            <div className="requests-header">
              <div className="header-method">Method</div>
              <div className="header-status">Status</div>
              <div className="header-domain">Domain</div>
              <div className="header-path">Path</div>
              <div className="header-time">Time</div>
              <div className="header-duration">Duration</div>
              <div className="header-size">Size</div>
            </div>
            
            <div className="requests-list">
              {filteredRequests.map((request, index) => (
                <RequestRow
                  key={`${request.collectionUid}-${request.itemUid}-${request.timestamp}-${index}`}
                  request={request}
                  isSelected={selectedRequest?.timestamp === request.timestamp && selectedRequest?.itemUid === request.itemUid}
                  onClick={() => handleRequestClick(request)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default NetworkTab; 