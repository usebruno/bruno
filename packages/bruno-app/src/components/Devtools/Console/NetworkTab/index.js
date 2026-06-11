import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  IconNetwork,
  IconArrowUp,
  IconArrowDown
} from '@tabler/icons';
import {
  setSelectedRequest
} from 'providers/ReduxStore/slices/logs';
import StyledWrapper from './StyledWrapper';

// TODO: Columns will be resizable in the future, so width can be null (for auto) or a number (for fixed width)
const COLUMNS = [
  { key: 'method', label: 'Method', width: 90, align: 'left' },
  { key: 'status', label: 'Status', width: 80, align: 'left' },
  { key: 'domain', label: 'Domain', width: 200, align: 'left' },
  { key: 'path', label: 'Path', width: null, align: 'left' },
  { key: 'time', label: 'Time', width: 100, align: 'left' },
  { key: 'duration', label: 'Duration', width: 120, align: 'right' },
  { key: 'size', label: 'Size', width: 80, align: 'right' }
];

const getSortValue = (request, key) => {
  const { request: req, response: res, timestamp } = request.data;
  switch (key) {
    case 'method': return req?.method || '';
    case 'status': return res?.statusCode || res?.status || 0;
    case 'domain': {
      try { return new URL(req?.url || '').hostname; } catch { return req?.url || ''; }
    }
    case 'path': {
      try {
        const u = new URL(req?.url || '');
        return u.pathname + u.search;
      } catch { return req?.url || ''; }
    }
    case 'time': return timestamp || 0;
    case 'duration': return res?.duration || 0;
    case 'size': return res?.size || 0;
    default: return '';
  }
};

const getGridTemplate = (columns) =>
  columns.map((c) => (c.width ? `${c.width}px` : '1fr')).join(' ');

const getSeparatorPositions = (columns) => {
  const n = columns.length;
  const positions = new Array(n - 1).fill(null);

  let leftOffset = 0;
  for (let i = 0; i < n - 1; i++) {
    if (columns[i].width === null) break;
    leftOffset += columns[i].width;
    positions[i] = { left: leftOffset };
  }

  let rightOffset = 0;
  for (let i = n - 1; i > 0; i--) {
    if (columns[i].width === null) break;
    rightOffset += columns[i].width;
    if (positions[i - 1] === null) {
      positions[i - 1] = { right: rightOffset };
    }
  }

  return positions;
};

const MethodBadge = ({ method }) => {
  const methodLower = method?.toLowerCase() || 'get';

  return (
    <span className={`method-badge ${methodLower}`}>
      {method?.toUpperCase() || 'GET'}
    </span>
  );
};

const StatusBadge = ({ status, statusCode }) => {
  const displayStatus = statusCode || status;

  return (
    <span className="status-badge">
      {displayStatus}
    </span>
  );
};

const RequestRow = ({ request, isSelected, onClick, gridTemplateColumns }) => {
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
      style={{ gridTemplateColumns }}
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const gridTemplateColumns = useMemo(() => getGridTemplate(COLUMNS), []);
  const separatorPositions = useMemo(() => getSeparatorPositions(COLUMNS), []);
  const { networkFilters, selectedRequest } = useSelector((state) => state.logs);
  const collections = useSelector((state) => state.collections.collections);

  const allRequests = useMemo(() => {
    const requests = [];

    collections.forEach((collection) => {
      if (collection.timeline) {
        collection.timeline
          .filter((entry) => entry.type === 'request')
          .forEach((entry) => {
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
    return allRequests.filter((request) => {
      const method = request.data?.request?.method?.toUpperCase() || 'GET';
      return networkFilters[method];
    });
  }, [allRequests, networkFilters]);

  const handleRequestClick = (request) => {
    dispatch(setSelectedRequest(request));
  };

  const handleHeaderClick = (key) => {
    setSortConfig((prev) => {
      // If clicking a different column, start with ascending sort
      if (prev.key !== key) return { key, direction: 'asc' };

      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const sortedRequests = useMemo(() => {
    if (!sortConfig.key) return filteredRequests;
    return [...filteredRequests].sort((a, b) => {
      const valueA = getSortValue(a, sortConfig.key);
      const valueB = getSortValue(b, sortConfig.key);
      if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRequests, sortConfig]);

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
            <div className="requests-header" style={{ gridTemplateColumns }}>
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className={`header-cell${col.align === 'right' ? ' text-right' : ''}`}
                  onClick={() => handleHeaderClick(col.key)}
                >
                  <span title={col.label}>{col.label}</span>
                  {sortConfig.key === col.key && (
                    sortConfig.direction === 'asc'
                      ? <IconArrowUp size={14} strokeWidth={2} />
                      : <IconArrowDown size={14} strokeWidth={2} />
                  )}
                </div>
              ))}
            </div>

            <div className="requests-list">
              {sortedRequests.map((request, index) => (
                <RequestRow
                  key={`${request.collectionUid}-${request.itemUid}-${request.timestamp}-${index}`}
                  request={request}
                  isSelected={selectedRequest?.timestamp === request.timestamp && selectedRequest?.itemUid === request.itemUid}
                  onClick={() => handleRequestClick(request)}
                  gridTemplateColumns={gridTemplateColumns}
                />
              ))}
            </div>

            {separatorPositions.map((pos, i) =>
              pos ? (
                <div
                  key={i}
                  className="col-separator"
                  style={'left' in pos ? { left: `${pos.left}px` } : { right: `${pos.right}px` }}
                />
              ) : null
            )}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default NetworkTab;
