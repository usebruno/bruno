import { IconFilter, IconX } from '@tabler/icons';
import React, { useMemo } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import { Tooltip as ReactInfotip } from 'react-tooltip';

const QueryResultFilter = ({ filter, onChange, mode }) => {
  const inputRef = useRef(null);
  const [isExpanded, toggleExpand] = useState(false);

  const handleFilterClick = () => {
    // Toggle filter search bar
    toggleExpand(!isExpanded);
    // Reset filter search input
    onChange({ target: { value: '' } });
    // Reset input value
    if (inputRef?.current) {
      inputRef.current.value = '';
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
    <div
      className={
        'response-filter absolute bottom-2 w-full justify-end right-0 flex flex-row items-center gap-2 py-4 px-2 pointer-events-none'
      }
    >
      {infotipText && !isExpanded && <ReactInfotip anchorId={'request-filter-icon'} html={infotipText} />}
      <input
        ref={inputRef}
        type="text"
        name="response-filter"
        id="response-filter"
        placeholder={placeholderText}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className={`block ml-14 p-2 py-1 sm:text-sm transition-all duration-200 ease-in-out border border-gray-300 rounded-md ${
          isExpanded ? 'w-full opacity-100 pointer-events-auto' : 'w-[0] opacity-0'
        }`}
        onChange={onChange}
      />
      <div className="text-gray-500 sm:text-sm cursor-pointer pointer-events-auto" id="request-filter-icon" onClick={handleFilterClick}>
        {isExpanded ? <IconX size={20} strokeWidth={1.5} /> : <IconFilter size={20} strokeWidth={1.5} />}
      </div>
    </div>
  );
};

export default QueryResultFilter;
