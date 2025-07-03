import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  IconNetwork
} from '@tabler/icons';
import { 
  closeTerminal, 
  clearLogs, 
  updateFilter, 
  toggleAllFilters,
  setActiveTab 
} from 'providers/ReduxStore/slices/logs';
import NetworkTab from './NetworkTab';
import RequestDetailsPanel from './RequestDetailsPanel';
import DebugTab from './DebugTab';
import ErrorDetailsPanel from './ErrorDetailsPanel';
import StyledWrapper from './StyledWrapper';

const LogIcon = ({ type }) => {
  const iconProps = { size: 16, strokeWidth: 1.5 };
  
  switch (type) {
    case 'error':
      return <IconAlertCircle className="log-icon error" {...iconProps} />;
    case 'warn':
      return <IconAlertTriangle className="log-icon warn" {...iconProps} />;
    case 'info':
      return <IconAlertTriangle className="log-icon info" {...iconProps} />;
    case 'debug':
      return <IconBug className="log-icon debug" {...iconProps} />;
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

  const filterLabels = {
    error: 'Errors',
    warn: 'Warnings', 
    info: 'Info',
    debug: 'Debug',
    log: 'Logs'
  };

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button 
        className="filter-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Filter logs"
      >
        <IconFilter size={16} strokeWidth={1.5} />
        <span className="filter-summary">
          {activeFilters.length === 5 ? 'All' : `${activeFilters.length}/5`}
        </span>
        <IconChevronDown size={14} strokeWidth={1.5} />
      </button>
      
      {isOpen && (
        <div className={`filter-dropdown-menu right`}>
          <div className="filter-dropdown-header">
            <span>Filter Logs</span>
            <button 
              className="filter-toggle-all"
              onClick={() => onToggleAll(!allFiltersEnabled)}
            >
              {allFiltersEnabled ? 'Hide All' : 'Show All'}
            </button>
          </div>
          
          <div className="filter-dropdown-options">
            {['error', 'warn', 'info', 'debug', 'log'].map(type => (
              <label key={type} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters[type]}
                  onChange={(e) => onFilterToggle(type, e.target.checked)}
                />
                <div className="filter-option-content">
                  <LogIcon type={type} />
                  <span className="filter-option-label">{filterLabels[type]}</span>
                  <span className="filter-option-count">({logCounts[type] || 0})</span>
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
  
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const filteredLogs = logs.filter(log => filters[log.type]);

  return (
    <div className="tab-content">
      <div className="tab-header">
        <div className="tab-title">
          <IconTerminal2 size={16} strokeWidth={1.5} />
          <span>Console</span>
          <span className="log-count">({filteredLogs.length} of {logs.length})</span>
        </div>
        
        <div className="tab-controls">
          <div className="filter-controls">
            <FilterDropdown
              filters={filters}
              logCounts={logCounts}
              onFilterToggle={onFilterToggle}
              onToggleAll={onToggleAll}
            />
          </div>

          <div className="action-controls">
            <button 
              className="control-button"
              onClick={onClearLogs}
              title="Clear all logs"
            >
              <IconTrash size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="tab-content-area">
        {filteredLogs.length === 0 ? (
          <div className="terminal-empty">
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

const MIN_TERMINAL_HEIGHT = 200;
const MAX_TERMINAL_HEIGHT = window.innerHeight * 0.8;
const DEFAULT_TERMINAL_HEIGHT = 300;

const Terminal = () => {
  const dispatch = useDispatch();
  const { logs, filters, activeTab, selectedRequest, selectedError } = useSelector(state => state.logs);
  const terminalRef = useRef(null);
  const [height, setHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const rect = terminalRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const newHeight = rect.bottom - e.clientY;
    const clampedHeight = Math.min(MAX_TERMINAL_HEIGHT, Math.max(MIN_TERMINAL_HEIGHT, newHeight));
    setHeight(clampedHeight);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const logCounts = logs.reduce((counts, log) => {
    counts[log.type] = (counts[log.type] || 0) + 1;
    return counts;
  }, {});

  const handleFilterToggle = (filterType, enabled) => {
    dispatch(updateFilter({ filterType, enabled }));
  };

  const handleClearLogs = () => {
    dispatch(clearLogs());
  };

  const handleCloseTerminal = () => {
    dispatch(closeTerminal());
  };

  const handleToggleAllFilters = (enabled) => {
    dispatch(toggleAllFilters(enabled));
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
      case 'debug':
        return <DebugTab />;
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

  return (
    <StyledWrapper style={{ height }} ref={terminalRef}>
      <div 
        className="terminal-resize-handle"
        onMouseDown={handleMouseDown}
      />
      
      <div className="terminal-header">
        <div className="terminal-tabs">
          <button 
            className={`terminal-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => handleTabChange('console')}
          >
            <IconTerminal2 size={16} strokeWidth={1.5} />
            <span>Console</span>
          </button>
          
          <button 
            className={`terminal-tab ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => handleTabChange('network')}
          >
            <IconNetwork size={16} strokeWidth={1.5} />
            <span>Network</span>
          </button>
          
          <button 
            className={`terminal-tab ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => handleTabChange('debug')}
          >
            <IconBug size={16} strokeWidth={1.5} />
            <span>Debug</span>
          </button>
        </div>
        
        <div className="terminal-controls">
          <button 
            className="control-button close-button"
            onClick={handleCloseTerminal}
            title="Close terminal"
          >
            <IconX size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="terminal-content">
        {activeTab === 'network' && selectedRequest ? (
          <div className="network-with-details">
            <div className="network-main">
              {renderTabContent()}
            </div>
            <RequestDetailsPanel />
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

export default Terminal; 