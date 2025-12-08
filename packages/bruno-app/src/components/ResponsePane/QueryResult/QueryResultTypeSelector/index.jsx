import React from 'react';
import { IconEye } from '@tabler/icons';
import ButtonDropdown from 'ui/ButtonDropdown';
import ToggleSwitch from 'components/ToggleSwitch';
import StyledWrapper from './StyledWrapper';

const QueryResultTypeSelector = ({
  formatOptions,
  formatValue,
  onFormatChange,
  onPreviewTabSelect,
  selectedTab
}) => {
  const header = (
    <div className="flex items-center justify-between gap-3 py-[0.35rem] px-[0.6rem]">
      <span className="text-[0.8125rem] preview-response-tab-label">Preview</span>
      <ToggleSwitch
        isOn={selectedTab === 'preview'}
        handleToggle={(e) => {
          e.preventDefault();
          // e.stopPropagation();
          onPreviewTabSelect();
        }}
        size="2xs"
        data-testid="preview-response-tab"
        title={selectedTab === 'preview' ? 'Turn off Preview Mode' : 'Turn on Preview Mode'}
      />
    </div>
  );
  return (
    <StyledWrapper>
      <ButtonDropdown
        label={formatValue}
        options={formatOptions}
        value={formatValue}
        onChange={onFormatChange}
        header={header}
        className="h-[20px] text-[11px]"
        data-testid="format-response-tab"
        suffix={selectedTab === 'preview' ? <IconEye size={14} strokeWidth={2} className="active mr-[2px]" /> : null}
      />
    </StyledWrapper>
  );
};

export default QueryResultTypeSelector;
