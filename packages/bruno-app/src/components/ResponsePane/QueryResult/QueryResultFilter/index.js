import React, { useMemo } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { Filter } from 'lucide-react';

const QueryResultFilter = ({ onChange, mode }) => {
  const tooltipText = useMemo(() => {
    if (mode.includes('json')) {
      return 'Filter with JSONPath';
    }
    if (mode.includes('xml')) {
      return 'Filter with XPath';
    }
    return null;
  }, [mode]);

  return (
    <div className={'response-filter relative'}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
        <div className="text-gray-500 sm:text-sm" id="request-filter-icon">
          <Filter size={16} />
        </div>
      </div>
      {tooltipText && <ReactTooltip anchorId={'request-filter-icon'} html={tooltipText} />}
      <input
        type="text"
        name="response-filter"
        id="response-filter"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className="block w-full pl-10 py-1 sm:text-sm !rounded"
        onChange={onChange}
      />
    </div>
  );
};

export default QueryResultFilter;
