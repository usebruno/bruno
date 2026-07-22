import React, { forwardRef, useState } from 'react';
import { IconEye, IconCaretDown, IconBraces, IconCode, IconFileCode, IconBrandJavascript, IconFileText, IconHexagons, IconBinaryTree } from '@tabler/icons';
import classnames from 'classnames';
import MenuDropdown from 'ui/MenuDropdown';
import ToggleSwitch from 'components/ToggleSwitch';
import StyledWrapper from './StyledWrapper';

// Icon mapping for format options
const FORMAT_ICONS = {
  json: IconBraces,
  html: IconCode,
  xml: IconFileCode,
  javascript: IconBrandJavascript,
  raw: IconFileText,
  hex: IconHexagons,
  base64: IconBinaryTree
};

const ButtonIcon = forwardRef(({ disabled, className, style, prefix, selectedLabel, suffix, isActive, ...props }, ref) => {
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
      {prefix && <span className={isActive ? 'active' : 'icon-muted'}>{prefix}</span>}
      <span>{selectedLabel}</span>
      {suffix && <span>{suffix}</span>}
      {isActive && <IconCaretDown className="caret ml-0.5" size={12} strokeWidth={2} />}
    </button>
  );
});
ButtonIcon.displayName = 'ButtonIcon';

const QueryResultTypeSelector = ({
  formatOptions,
  formatValue,
  onFormatChange,
  onPreviewTabSelect,
  selectedTab,
  isActiveTab,
  onTabSelect
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Handle dropdown state change - only allow opening when active tab
  const handleDropdownChange = (open) => {
    if (!isActiveTab && open) {
      // First click when not active - select this tab, don't open dropdown
      onTabSelect?.();
      return;
    }
    setDropdownOpen(open);
  };
  // Find the selected item's label
  const findSelectedLabel = () => {
    if (formatValue != null) {
      const selectedItem = formatOptions.find((item) => item.id === formatValue && (item.type === 'item' || !item.type));
      if (selectedItem) return selectedItem.label;
    }
    return formatValue;
  };

  const selectedLabel = findSelectedLabel();

  // Get the icon for the currently selected format
  const SelectedFormatIcon = FORMAT_ICONS[formatValue];

  // Determine the prefix icon - eye icon when in preview mode, format icon otherwise
  const getPrefixIcon = () => {
    if (selectedTab === 'preview') {
      return <IconEye size={14} strokeWidth={2} />;
    }
    if (SelectedFormatIcon) {
      return <SelectedFormatIcon size={14} strokeWidth={1.5} />;
    }
    return null;
  };

  // Enhance items with onChange handler and icons
  const enhancedItems = formatOptions.map((item) => {
    const IconComponent = FORMAT_ICONS[item.id];
    return {
      ...item,
      leftSection: IconComponent ? <IconComponent size={14} strokeWidth={1.5} /> : null,
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
          onPreviewTabSelect(selectedTab === 'preview' ? 'editor' : 'preview');
        }}
        size="2xs"
        data-testid="preview-response-tab"
        title={selectedTab === 'preview' ? 'Turn off Preview Mode' : 'Turn on Preview Mode'}
      />
    </div>
  );

  return (
    <StyledWrapper className={isActiveTab ? 'tab-active' : ''}>
      <MenuDropdown
        items={enhancedItems}
        header={header}
        selectedItemId={formatValue}
        showTickMark={true}
        placement="bottom-end"
        data-testid="format-response-tab"
        opened={dropdownOpen}
        onChange={handleDropdownChange}
      >
        <ButtonIcon
          selectedLabel={selectedLabel}
          prefix={getPrefixIcon()}
          isActive={isActiveTab}
          disabled={false}
          className="h-[22px] text-[10px]"
          data-testid="format-response-tab"
        />
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default QueryResultTypeSelector;
