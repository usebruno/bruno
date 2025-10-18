import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ReactJson from 'react-json-view';
import { useTheme } from 'providers/Theme';
import {
  IconX,
  IconTrash,
  IconFilter,
  IconAlertTriangle,
  IconAlertCircle,
  IconBug,
  IconCode,
  IconChevronDown,
  IconTerminal2,
  IconNetwork,
  IconDashboard,
} from '@tabler/icons';
import {
  closeConsole,
  clearLogs,
  updateFilter,
  toggleAllFilters,
  setActiveTab,
  clearDebugErrors,
  updateNetworkFilter,
  toggleAllNetworkFilters
} from 'providers/ReduxStore/slices/logs';

import NetworkTab from './NetworkTab';
import RequestDetailsPanel from './RequestDetailsPanel';
// import DebugTab from './DebugTab';
import ErrorDetailsPanel from './ErrorDetailsPanel';
import Performance from '../Performance';
import StyledWrapper from './StyledWrapper';
import { savePreferences } from 'providers/ReduxStore/slices/app';

const LogIcon = ({ type }) => {
  const iconProps = { size: 16, strokeWidth: 1.5 };

  switch (type) {
    case 'error':
      return <IconAlertCircle className="log-icon error" {...iconProps} />;
    case 'warn':
      return <IconAlertTriangle className="log-icon warn" {...iconProps} />;
    case 'info':
      return <IconAlertTriangle className="log-icon info" {...iconProps} />;
    // case 'debug':
    //   return <IconBug className="log-icon debug" {...iconProps} />;
    default:
      return <IconCode className="log-icon log" {...iconProps} />;
  }
};

const LogTimestamp = ({ timestamp }) => {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });

  return <span className="log-timestamp">{time}</span>;
};

const LogMessage = ({ message, args }) => {
  const { displayedTheme } = useTheme();

  const formatMessage = (msg, originalArgs) => {
    if (originalArgs && originalArgs.length > 0) {
      return originalArgs.map((arg, index) => {
        if (typeof arg === 'object' && arg !== null) {
          return (
            <div key={index} className="log-object">
              <ReactJson
                src={arg}
                theme={displayedTheme === 'light' ? 'rjv-default' : 'monokai'}
                iconStyle="triangle"
                indentWidth={2}
                collapsed={1}
                displayDataTypes={false}
                displayObjectSize={false}
                enableClipboard={false}
                name={false}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: '12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
                }}
              />
            </div>
          );
        }
        return String(arg);
      });
    }
    return msg;
  };

  const formattedMessage = formatMessage(message, args);

  return (
    <span className="log-message">
      {Array.isArray(formattedMessage) ? formattedMessage.map((item, index) => (
        <span key={index}>{item} </span>
      )) : formattedMessage}
    </span>
  );
};

const FilterDropdown = ({ filters, logCounts, onFilterToggle, onToggleAll }) => {
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
        title="Filter logs by type"
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
            <span>Filter by Type</span>
            <button
              className="filter-toggle-all"
              onClick={() => onToggleAll(!allFiltersEnabled)}
            >
              {allFiltersEnabled ? 'Hide All' : 'Show All'}
            </button>
          </div>

          <div className="filter-dropdown-options">
            {Object.entries(filters).map(([filterType, enabled]) => (
              <label key={filterType} className="filter-option">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onFilterToggle(filterType, e.target.checked)}
                />
                <div className="filter-option-content">
                  <LogIcon type={filterType} />
                  <span className="filter-option-label">{filterType}</span>
                  <span className="filter-option-count">({logCounts[filterType] || 0})</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const NetworkFilterDropdown = ({ filters, requestCounts, onFilterToggle, onToggleAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const allFiltersEnabled = Object.values(filters).every(f => f);
  const activeFilters = Object.entries(filters).filter(([_, enabled]) => enabled);

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
            {Object.entries(filters).map(([method, enabled]) => (
              <label key={method} className="filter-option">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onFilterToggle(method, e.target.checked)}
                />
                <div className="filter-option-content">
                  <span className="method-badge" style={{ backgroundColor: getMethodColor(method) }}>
                    {method}
                  </span>
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

const ConsoleTab = ({ logs, filters, logCounts, onFilterToggle, onToggleAll, onClearLogs }) => {
  const logsEndRef = useRef(null);
  const prevLogsCountRef = useRef(0);

  useEffect(() => {
    // Only scroll when new logs are added, not when switching tabs
    if (logsEndRef.current && logs.length > prevLogsCountRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
    prevLogsCountRef.current = logs.length;
  }, [logs]);

  const filteredLogs = logs.filter(log => filters[log.type]);

  return (
    <div className="tab-content">
      <div className="tab-content-area">
        {filteredLogs.length === 0 ? (
          <div className="console-empty">
            <IconTerminal2 size={48} strokeWidth={1} />
            <p>No logs to display</p>
            <span>Logs will appear here as your application runs</span>
          </div>
        ) : (
          <div className="logs-container">
            {filteredLogs.map((log) => (
              <div key={log.id} className={`log-entry ${log.type}`}>
                <div className="log-meta">
                  <LogTimestamp timestamp={log.timestamp} />
                  <LogIcon type={log.type} />
                </div>
                <LogMessage message={log.message} args={log.args} />
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

const Console = () => {
  const dispatch = useDispatch();
  const { logs, filters, activeTab, selectedRequest, selectedError, networkFilters, debugErrors } = useSelector(state => state.logs);
  const collections = useSelector(state => state.collections.collections);
  const prefs = useSelector((state) => state.app.preferences);
  const consoleRef = useRef(null);

  // DevTools Network details pane resizable width
  const DEFAULT_WIDTH = 480;
  const MIN_WIDTH = 400;
  const MAX_WIDTH = 1000;

  const clamp = (v, min = MIN_WIDTH, max = MAX_WIDTH) => Math.min(max, Math.max(min, v));

  const [detailsWidth, setDetailsWidth] = useState(() => {
    const stored = prefs?.devTools?.network?.detailsWidth;
    if (typeof stored === 'number') return clamp(stored);
    const viewport = typeof window !== 'undefined' ? window.innerWidth : DEFAULT_WIDTH * 2.5;
    const base = Math.round(viewport * 0.33);
    return clamp(base);
  });
  const widthRef = useRef(detailsWidth);
  useEffect(() => {
    widthRef.current = detailsWidth;
  }, [detailsWidth]);

  useEffect(() => {
    const w = prefs?.devTools?.network?.detailsWidth;
    if (typeof w === 'number') setDetailsWidth(clamp(w));
  }, [prefs?.devTools?.network?.detailsWidth]);

  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const draggingRef = useRef(false);

  const persistWidth = (w) => {
    const next = {
      ...prefs,
      devTools: {
        ...prefs?.devTools,
        network: {
          ...(prefs?.devTools?.network || {}),
          detailsWidth: clamp(w)
        }
      }
    };
    dispatch(savePreferences(next));
  };

  const onMouseMove = (e) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const next = clamp(startWRef.current - dx);
    setDetailsWidth(next);
    widthRef.current = next;
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', endDrag);
    persistWidth(widthRef.current);
  };

  const startDrag = (e) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = detailsWidth;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    e.preventDefault();
  };

  useEffect(() => () => {
    if (draggingRef.current) endDrag();
  }, []);

  const onKeyDownDivider = (e) => {
    const step = e.shiftKey ? 24 : 8;
    if (e.key === 'ArrowLeft') {
      const next = clamp(detailsWidth - step);
      setDetailsWidth(next);
      widthRef.current = next;
      persistWidth(next);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      const next = clamp(detailsWidth + step);
      setDetailsWidth(next);
      persistWidth(next);
      e.preventDefault();
    }
  };

  const toggleMaxMin = () => {
    const nearMax = Math.abs(detailsWidth - MAX_WIDTH) <= 4;
    const next = nearMax ? MIN_WIDTH : MAX_WIDTH;
    setDetailsWidth(next);
    widthRef.current = next;
    persistWidth(next);
  };

  const logCounts = logs.reduce((counts, log) => {
    counts[log.type] = (counts[log.type] || 0) + 1;
    return counts;
  }, {});

  const allRequests = React.useMemo(() => {
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

  const filteredLogs = logs.filter(log => filters[log.type]);
  const filteredRequests = allRequests.filter(request => {
    const method = request.data?.request?.method?.toUpperCase() || 'GET';
    return networkFilters[method];
  });

  const requestCounts = allRequests.reduce((counts, request) => {
    const method = request.data?.request?.method?.toUpperCase() || 'GET';
    counts[method] = (counts[method] || 0) + 1;
    return counts;
  }, {});

  const handleFilterToggle = (filterType, enabled) => {
    dispatch(updateFilter({ filterType, enabled }));
  };

  const handleNetworkFilterToggle = (method, enabled) => {
    dispatch(updateNetworkFilter({ method, enabled }));
  };

  const handleClearLogs = () => {
    dispatch(clearLogs());
  };

  const handleClearDebugErrors = () => {
    dispatch(clearDebugErrors());
  };

  const handlecloseConsole = () => {
    dispatch(closeConsole());
  };

  const handleToggleAllFilters = (enabled) => {
    dispatch(toggleAllFilters(enabled));
  };

  const handleToggleAllNetworkFilters = (enabled) => {
    dispatch(toggleAllNetworkFilters(enabled));
  };

  const handleTabChange = (tab) => {
    dispatch(setActiveTab(tab));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'console':
        return (
          <ConsoleTab
            logs={logs}
            filters={filters}
            logCounts={logCounts}
            onFilterToggle={handleFilterToggle}
            onToggleAll={handleToggleAllFilters}
            onClearLogs={handleClearLogs}
          />
        );
      case 'network':
        return <NetworkTab />;
      case 'performance':
        return <Performance />;
      // case 'debug':
      //   return <DebugTab />;
      default:
        return (
          <ConsoleTab
            logs={logs}
            filters={filters}
            logCounts={logCounts}
            onFilterToggle={handleFilterToggle}
            onToggleAll={handleToggleAllFilters}
            onClearLogs={handleClearLogs}
          />
        );
    }
  };

  const renderTabControls = () => {
    switch (activeTab) {
      case 'console':
        return (
          <div className="tab-controls">
            <div className="filter-controls">
              <FilterDropdown
                filters={filters}
                logCounts={logCounts}
                onFilterToggle={handleFilterToggle}
                onToggleAll={handleToggleAllFilters}
              />
            </div>
            <div className="action-controls">
              <button
                className="control-button"
                onClick={handleClearLogs}
                title="Clear all logs"
              >
                <IconTrash size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        );
      case 'network':
        return (
          <div className="tab-controls">
            <div className="filter-controls">
              <NetworkFilterDropdown
                filters={networkFilters}
                requestCounts={requestCounts}
                onFilterToggle={handleNetworkFilterToggle}
                onToggleAll={handleToggleAllNetworkFilters}
              />
            </div>
          </div>
        );
      // case 'debug':
      //   return (
      //     <div className="tab-controls">
      //       <div className="action-controls">
      //         {debugErrors.length > 0 && (
      //           <button
      //             className="control-button"
      //             onClick={handleClearDebugErrors}
      //             title="Clear all errors"
      //           >
      //             <IconTrash size={16} strokeWidth={1.5} />
      //           </button>
      //         )}
      //       </div>
      //     </div>
      //   );
      default:
        return null;
    }
  };



  return (
    <StyledWrapper ref={consoleRef}>
      <div
        className="console-resize-handle"
      />

      <div className="console-header">
        <div className="console-tabs">
          <button
            className={`console-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => handleTabChange('console')}
          >
            <IconTerminal2 size={16} strokeWidth={1.5} />
            <span>Console</span>
          </button>

          <button
            className={`console-tab ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => handleTabChange('network')}
          >
            <IconNetwork size={16} strokeWidth={1.5} />
            <span>Network</span>
          </button>

          <button
            className={`console-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => handleTabChange('performance')}
          >
            <IconDashboard size={16} strokeWidth={1.5} />
            <span>Performance</span>
          </button>

          {/* <button
            className={`console-tab ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => handleTabChange('debug')}
          >
            <IconBug size={16} strokeWidth={1.5} />
            <span>Debug</span>
          </button> */}
        </div>

        <div className="console-controls">
          {renderTabControls()}
          <button
            className="control-button close-button"
            onClick={handlecloseConsole}
            title="Close console"
          >
            <IconX size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="console-content">
        {activeTab === 'network' && selectedRequest ? (
          <div className="network-with-details">
            <div className="network-main">
              {renderTabContent()}
            </div>
            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              onMouseDown={startDrag}
              onKeyDown={onKeyDownDivider}
              onDoubleClick={toggleMaxMin}
              style={{ width: 10, cursor: 'col-resize', alignSelf: 'stretch' }}
              title="Resize details panel"
            />
            <RequestDetailsPanel
              style={{ width: detailsWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }}
            />
          </div>
        ) : activeTab === 'debug' && selectedError ? (
          <div className="debug-with-details">
            <div className="debug-main">
              {renderTabContent()}
            </div>
            <ErrorDetailsPanel />
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </StyledWrapper>
  );
};

export default Console;
