import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconSearch } from '@tabler/icons-react';
import {
  setSearchFilter,
  toggleMethodFilter,
  setSelectedRequest,
  selectFilteredRequests,
  selectSelectedRequestId,
  selectFilters,
  selectIsProxyRunning
} from 'providers/ReduxStore/slices/networkIntercept';
import StyledWrapper from './StyledWrapper';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const NetworkLogs = () => {
  const dispatch = useDispatch();
  const filteredRequests = useSelector(selectFilteredRequests);
  const selectedRequestId = useSelector(selectSelectedRequestId);
  const filters = useSelector(selectFilters);
  const isRunning = useSelector(selectIsProxyRunning);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (ms) => {
    if (ms === undefined || ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatSize = (bytes) => {
    if (bytes === undefined || bytes === null) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusClass = (statusCode) => {
    if (!statusCode) return 'status-pending';
    if (statusCode >= 200 && statusCode < 300) return 'status-2xx';
    if (statusCode >= 300 && statusCode < 400) return 'status-3xx';
    if (statusCode >= 400 && statusCode < 500) return 'status-4xx';
    return 'status-5xx';
  };

  const parseUrl = (url) => {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.host,
        path: parsed.pathname + parsed.search
      };
    } catch {
      return { host: '', path: url };
    }
  };

  const handleRowClick = (request) => {
    dispatch(setSelectedRequest(request.id));
  };

  return (
    <StyledWrapper>
      <div className="logs-toolbar">
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Filter by URL or domain..."
            value={filters.search}
            onChange={(e) => dispatch(setSearchFilter(e.target.value))}
          />
        </div>

        <div className="filter-group">
          {METHODS.map((method) => (
            <button
              key={method}
              className={`filter-btn ${method} ${filters.methods[method] ? 'active' : ''}`}
              onClick={() => dispatch(toggleMethodFilter(method))}
            >
              {method}
            </button>
          ))}
        </div>

        <span className="request-count">
          {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="logs-table-container">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <div className="empty-title">
              {isRunning ? 'No requests captured yet' : 'Proxy not running'}
            </div>
            <div className="empty-description">
              {isRunning
                ? 'Open a browser or configure your terminal to route traffic through the proxy.'
                : 'Start the proxy and open a browser to begin capturing network traffic.'}
            </div>
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>URL</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const { host, path } = parseUrl(request.url);
                const isSelected = request.id === selectedRequestId;
                const isPending = !request.statusCode;

                return (
                  <tr
                    key={request.id}
                    className={`${isSelected ? 'selected' : ''} ${isPending ? 'pending' : ''}`}
                    onClick={() => handleRowClick(request)}
                  >
                    <td className="time-cell">{formatTime(request.timestamp)}</td>
                    <td>
                      <span className={`method-badge ${request.method}`}>
                        {request.method}
                      </span>
                    </td>
                    <td className="url-cell">
                      <span className="url-host">{host}</span>
                      <span className="url-path">{path}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(request.statusCode)}`}>
                        {request.statusCode || 'Pending'}
                      </span>
                    </td>
                    <td className="duration-cell">{formatDuration(request.duration)}</td>
                    <td className="size-cell">{formatSize(request.responseSize)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </StyledWrapper>
  );
};

export default NetworkLogs;
