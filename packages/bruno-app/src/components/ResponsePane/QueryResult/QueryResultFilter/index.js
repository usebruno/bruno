import { IconFilter, IconX } from '@tabler/icons';
import React, { useMemo, useRef, useState } from 'react';
import { Tooltip as ReactInfotip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';

const QueryResultFilter = ({ filter, filterExpanded, onChange, onExpandChange, mode }) => {
  const { t } = useTranslation();
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

  const infotipText = useMemo(() => {
    if (mode.includes('json')) {
      return t('QUERY_RESULT_FILTER.FILTER_WITH_JSONPATH');
    }

    if (mode.includes('xml')) {
      return t('QUERY_RESULT_FILTER.FILTER_WITH_XPATH');
    }

    return null;
  }, [mode, t]);

  const placeholderText = useMemo(() => {
    if (mode.includes('json')) {
      return t('QUERY_RESULT_FILTER.JSONPATH_PLACEHOLDER');
    }

    if (mode.includes('xml')) {
      return t('QUERY_RESULT_FILTER.XPATH_PLACEHOLDER');
    }

    return null;
  }, [mode, t]);

  return (
    <div
      className="response-filter absolute bottom-2 w-full justify-end right-0 flex flex-row items-center gap-2 py-4 px-2 pointer-events-none"
    >
      {infotipText && !isExpanded && <ReactInfotip anchorId="request-filter-icon" html={infotipText} />}
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
        className={`block ml-14 p-2 py-1 transition-all duration-200 ease-in-out border border-gray-300 rounded-md ${
          isExpanded ? 'w-full opacity-100 pointer-events-auto' : 'w-[0] opacity-0'
        }`}
        onChange={handleInputChange}
      />
      <div className="text-gray-500 cursor-pointer pointer-events-auto" id="request-filter-icon" onClick={handleFilterClick}>
        {isExpanded ? <IconX size={20} strokeWidth={1.5} /> : <IconFilter size={20} strokeWidth={1.5} />}
      </div>
    </div>
  );
};

export default QueryResultFilter;
