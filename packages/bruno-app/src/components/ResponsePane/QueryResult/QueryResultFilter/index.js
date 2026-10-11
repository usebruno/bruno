import { IconFilter, IconX } from '@tabler/icons';
import React, { useMemo, useRef, useState } from 'react';
import { Tooltip as ReactInfotip } from 'react-tooltip';
import StyledWrapper from './StyledWrapper';

const QueryResultFilter = ({ filter, filterExpanded, onChange, onExpandChange, mode }) => {
  const inputRef = useRef(null);
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = filterExpanded ?? localExpanded;

  const handleFilterClick = () => {
    const newExpanded = !isExpanded;
    setLocalExpanded(newExpanded);
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

  const infotipText = useMemo(() => {
    if (mode.includes('json')) {
      return 'Filter with JSONPath';
    }

    if (mode.includes('xml')) {
      return 'Filter with XPath';
    }

    return null;
  }, [mode]);

  const placeholderText = useMemo(() => {
    if (mode.includes('json')) {
      return '$.store.books..author';
    }

    if (mode.includes('xml')) {
      return '/store/books//author';
    }

    return null;
  }, [mode]);

  return (
    <StyledWrapper className="response-filter-toolbar flex flex-row items-center gap-2 pointer-events-auto">
      {infotipText && !isExpanded && <ReactInfotip anchorId="request-filter-icon" html={infotipText} className="z-50" />}
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
        tabIndex={isExpanded ? 0 : -1}
        className={`block p-1.5 transition-all duration-200 ease-in-out border rounded-md focus:outline-none ${
          isExpanded ? 'w-48 opacity-100 pointer-events-auto' : 'w-[0] opacity-0'
        }`}
        onChange={handleInputChange}
      />
      <div className="cursor-pointer pointer-events-auto" id="request-filter-icon" onClick={handleFilterClick}>
        {isExpanded ? <IconX size={20} strokeWidth={1.5} /> : <IconFilter size={20} strokeWidth={1.5} />}
      </div>
    </StyledWrapper>
  );
};

export default QueryResultFilter;
