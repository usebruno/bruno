import React from 'react';
import { IconPlayerPlay } from '@tabler/icons';
import ButtonDropdown from 'components/ButtonDropdown';
import classnames from 'classnames';

const QueryResultTypeSelector = ({
  formatOptions,
  formatValue,
  onFormatChange,
  onPreviewTabSelect,
  onEditorTabSelect,
  selectedTab
}) => {
  return (
    <div className="flex items-center gap-2" role="tablist">
      <button
        role="tabitem"
        onClick={onPreviewTabSelect}
        className={classnames('flex items-center gap-1.5 text-xs',
          'cursor-pointer select-none',
          'h-7 rounded-[6px] border px-2 transition-colors',
          // Text color
          'text-gray-700 dark:text-gray-300',
          // Border color
          'border-gray-300 dark:border-[#343434]',
          // Background color
          'dark:bg-[#252526]',
          // Hover background color
          'hover:bg-gray-200 dark:hover:bg-[#303030]',
          {
            // Active/Selected styles for preview tab
            'tab active bg-gray-200 dark:bg-[#303030]': selectedTab === 'preview',
            'hover:bg-gray-300 dark:hover:bg-[#363636]': selectedTab === 'preview'
          },
          'h-[20px] text-[11px]')}
        data-testid="preview-response-tab"
      >
        <IconPlayerPlay size={14} strokeWidth={2} />
        <span>Preview</span>
      </button>
      <ButtonDropdown
        label={formatValue}
        options={formatOptions}
        value={formatValue}
        onChange={onFormatChange}
        isTab={true}
        isTabSelected={selectedTab === 'editor'}
        onTabClick={onEditorTabSelect}
        className="h-[20px] text-[11px]"
        data-testid="format-response-tab"
      />
    </div>
  );
};

export default QueryResultTypeSelector;
