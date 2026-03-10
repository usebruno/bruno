import { IconFilter, IconX } from '@tabler/icons';
import React, { useMemo, useRef, useState } from 'react';
import { Tooltip as ReactInfotip } from 'react-tooltip';

const QueryResultFilter = ({ filter, filterExpanded, onChange, onExpandChange, mode, filterType, onFilterTypeChange, jqError }) => {
  const inputRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(filterExpanded || false);

  const handleFilterClick = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    // Reset filter search input when closing
    if (!newExpanded) {
      onChange('');
      if (inputRef?.current) {
        inputRef.current.value = '';
      }
    }
    if (onExpandChange) {
      onExpandChange(newExpanded);
    }
  };

  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleFilterTypeChange = (type) => {
    if (type === filterType) return;
    onFilterTypeChange(type);
    // Clear input when switching filter type
    onChange('');
    if (inputRef?.current) {
      inputRef.current.value = '';
    }
  };

  const infotipText = useMemo(() => {
    if (mode.includes('json')) {
      return filterType === 'jq' ? 'Filter with jq' : 'Filter with JSONPath';
    }

    if (mode.includes('xml')) {
      return 'Filter with XPath';
    }

    return null;
  }, [mode, filterType]);

  const placeholderText = useMemo(() => {
    if (mode.includes('json')) {
      return filterType === 'jq' ? '.store.books[].author' : '$.store.books..author';
    }

    if (mode.includes('xml')) {
      return '/store/books//author';
    }

    return null;
  }, [mode, filterType]);

  return (
    <div
      className="response-filter absolute bottom-2 w-full justify-end right-0 flex flex-row items-center gap-2 py-4 px-2 pointer-events-none"
    >
      {infotipText && !isExpanded && <ReactInfotip anchorId="request-filter-icon" html={infotipText} />}
      {isExpanded && mode.includes('json') && (
        <div className="filter-type-toggle flex items-center pointer-events-auto">
          <button
            className={`toggle-btn ${filterType === 'jsonpath' ? 'active' : ''}`}
            onClick={() => handleFilterTypeChange('jsonpath')}
          >
            JSONPath
          </button>
          <button
            className={`toggle-btn ${filterType === 'jq' ? 'active' : ''}`}
            onClick={() => handleFilterTypeChange('jq')}
          >
            jq
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        name="response-filter"
        id="response-filter"
        value={filter || ''}
        placeholder={placeholderText}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className={`block ${isExpanded && mode.includes('json') ? 'ml-0' : 'ml-14'} p-2 py-1 transition-all duration-200 ease-in-out border border-gray-300 rounded-md ${
          isExpanded ? 'w-full opacity-100 pointer-events-auto' : 'w-[0] opacity-0'
        }`}
        onChange={handleInputChange}
      />
      <div className="text-gray-500 cursor-pointer pointer-events-auto" id="request-filter-icon" onClick={handleFilterClick}>
        {isExpanded ? <IconX size={20} strokeWidth={1.5} /> : <IconFilter size={20} strokeWidth={1.5} />}
      </div>
      {isExpanded && jqError && (
        <div className="jq-error pointer-events-auto" title={jqError}>{jqError}</div>
      )}
    </div>
  );
};

export default QueryResultFilter;
