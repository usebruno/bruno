import { IconFilter, IconX, IconTrash } from '@tabler/icons';
import React, { useMemo, useRef, useState } from 'react';
import { Tooltip as ReactInfotip } from 'react-tooltip';

const QueryResultFilter = ({ onChange, onCommit, onDeleteHistory, mode, filterHistory }) => {
  const inputRef = useRef(null);
  const [isExpanded, toggleExpand] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onCommit(e.target.value);
    }
  };

  const handleFocus = () => setIsFocused(true);

  const handleBlur = () => {
    // Delay so mousedown on history items registers before dropdown hides
    setTimeout(() => setIsFocused(false), 150);
  };

  const handleHistorySelect = (value) => {
    if (inputRef?.current) {
      inputRef.current.value = value;
    }
    onChange({ target: { value } });
    setIsFocused(false);
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
      className="response-filter absolute bottom-2 w-full justify-end right-0 flex flex-row items-center gap-2 py-4 px-2 pointer-events-none"
    >
      {infotipText && !isExpanded && <ReactInfotip anchorId="request-filter-icon" html={infotipText} />}
      <div className={`relative ml-14 transition-all duration-200 ease-in-out ${isExpanded ? 'w-full opacity-100 pointer-events-auto' : 'w-[0] opacity-0'}`}>
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
          className="block w-full p-2 py-1 border border-gray-300 rounded-md"
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {isFocused && filterHistory && filterHistory.length > 0 && (
          <ul className="filter-history absolute bottom-full mb-1 right-0 w-full z-50 max-h-48 overflow-y-auto pointer-events-auto">
            {filterHistory.map((entry, idx) => (
              <li
                key={idx}
                className="flex items-center gap-1 px-3 py-1 text-sm group"
                title={entry}
              >
                <span
                  className="flex-1 truncate font-mono cursor-pointer"
                  onMouseDown={() => handleHistorySelect(entry)}
                >
                  {entry}
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onDeleteHistory(entry);
                  }}
                  title="Delete"
                >
                  <IconTrash size={13} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="text-gray-500 cursor-pointer pointer-events-auto" id="request-filter-icon" onClick={handleFilterClick}>
        {isExpanded ? <IconX size={20} strokeWidth={1.5} /> : <IconFilter size={20} strokeWidth={1.5} />}
      </div>
    </div>
  );
};

export default QueryResultFilter;
