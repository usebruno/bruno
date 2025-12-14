import React, { forwardRef } from 'react';
import { IconEye, IconCaretDown } from '@tabler/icons';
import classnames from 'classnames';
import MenuDropdown from 'ui/MenuDropdown';
import ToggleSwitch from 'components/ToggleSwitch';
import StyledWrapper from './StyledWrapper';

const ButtonIcon = forwardRef(({ disabled, className, style, prefix, selectedLabel, suffix, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={classnames('button-dropdown-button flex items-center gap-1.5 text-xs',
        'cursor-pointer select-none',
        'h-7 rounded-[6px] border px-2 transition-colors',
        { 'opacity-50 cursor-not-allowed': disabled },
        className)}
      disabled={disabled}
      data-testid={props['data-testid']}
      style={style}
      role="button"
      {...props}
    >
      {prefix && <span>{prefix}</span>}
      <span className="active">{selectedLabel}</span>
      {suffix && <span>{suffix}</span>}
      <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
    </button>
  );
});
ButtonIcon.displayName = 'ButtonIcon';

const QueryResultTypeSelector = ({
  formatOptions,
  formatValue,
  onFormatChange,
  onPreviewTabSelect,
  selectedTab
}) => {
  // Find the selected item's label
  const findSelectedLabel = () => {
    if (formatValue != null) {
      const selectedItem = formatOptions.find((item) => item.id === formatValue && (item.type === 'item' || !item.type));
      if (selectedItem) return selectedItem.label;
    }
    return formatValue;
  };

  const selectedLabel = findSelectedLabel();

  // Enhance items with onChange handler
  const enhancedItems = formatOptions.map((item) => {
    return {
      ...item,
      onClick: () => {
        if (onFormatChange) {
          onFormatChange(item.id);
        }
      }
    };
  });

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
      <MenuDropdown
        items={enhancedItems}
        header={header}
        selectedItemId={formatValue}
        showTickMark={true}
        placement="bottom-end"
        data-testid="format-response-tab"
      >
        <ButtonIcon
          selectedLabel={selectedLabel}
          suffix={selectedTab === 'preview' ? <IconEye size={14} strokeWidth={2} className="active mr-[2px]" /> : null}
          disabled={false}
          className="h-[20px] text-[11px]"
          data-testid="format-response-tab"
        />
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default QueryResultTypeSelector;
