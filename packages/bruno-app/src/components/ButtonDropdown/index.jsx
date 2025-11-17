import React from 'react';
import { useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import Dropdown from 'components/Dropdown';

const ButtonDropdown = ({
  label,
  options,
  onChange,
  value,
  disabled,
  className,
  style,
  dataTestId,
  isTab,
  onTabClick,
  isTabSelected,
  ...props
}) => {
  const dropdownTippyRef = useRef(null);
  // Check if options is a group array
  const isGrouped = Array.isArray(options) && options.length > 0 && 'options' in options[0];

  // Find the selected option's label
  const findSelectedLabel = () => {
    if (isGrouped) {
      const groups = options;
      for (const group of groups) {
        const option = group.options.find((opt) => opt.value === value);
        if (option) return option.label;
      }
    } else {
      const flatOptions = options;
      const option = flatOptions.find((opt) => opt.value === value);
      if (option) return option.label;
    }
    return label;
  };

  const selectedLabel = findSelectedLabel();

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
  };

  const handleOptionSelect = (optionValue) => {
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
    onChange(optionValue);
  };

  const handleTabClick = (e) => {
    if (isTab && !disabled) {
      // If tab is not selected, select it (and prevent dropdown from opening)
      if (!isTabSelected && isTab) {
        e.stopPropagation();
        if (onTabClick) {
          onTabClick();
        }
      }
      // If tab is already selected, let the dropdown handle the click
    }
  };

  // Flatten options for rendering
  const renderOptions = () => {
    if (isGrouped) {
      const groups = options;
      return groups.map((group, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {group.options.map((option, optionIndex) => {
            const isFirstInGroup = optionIndex === 0;
            const isFirstGroup = groupIndex === 0;
            const showSeparator = !isFirstGroup && isFirstInGroup;

            return (
              <div
                key={option.value}
                className={classnames('dropdown-item flex items-center gap-2',
                  {
                    'active': option.value === value,
                    'border-top': showSeparator
                  })}
                onClick={() => handleOptionSelect(option.value)}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <span className="ml-auto">✓</span>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ));
    } else {
      const flatOptions = options;
      return flatOptions.map((option) => (
        <div
          key={option.value}
          className={classnames('dropdown-item flex items-center gap-2', {
            active: option.value === value
          })}
          onClick={() => handleOptionSelect(option.value)}
        >
          <span>{option.label}</span>
          {option.value === value && (
            <span className="ml-auto">✓</span>
          )}
        </div>
      ));
    }
  };

  const ButtonIcon = forwardRef((iconProps, ref) => {
    return (
      <button
        ref={ref}
        className={classnames('flex items-center gap-1.5 text-xs',
          'cursor-pointer select-none',
          'h-7 rounded-[6px] border px-2 transition-colors',
          // Text color
          'text-gray-700 dark:text-gray-300',
          // Border color
          'border-gray-300 dark:border-[#343434]',
          // Background color
          // Hover background color
          'hover:bg-gray-200 dark:hover:bg-[#303030]',
          {
            // Selected tab styles
            'tab active bg-gray-200  dark:bg-[#303030]': isTab && isTabSelected,
            'hover:bg-gray-300 dark:hover:bg-[#363636]': isTab && isTabSelected,
            // Disabled styles
            'opacity-50 cursor-not-allowed': disabled
          },
          className)}
        onClick={handleTabClick}
        data-testid={dataTestId}
        style={style}
        role={isTab ? 'tabitem' : 'button'}
        {...iconProps}
      >
        <span>{selectedLabel}</span>
        {isTab && isTabSelected && <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />}
      </button>
    );
  });

  ButtonIcon.displayName = 'ButtonIcon';

  // If isTab is true, only allow dropdown to open when tab is selected
  const canOpenDropdown = !isTab || isTabSelected;

  return (
    <StyledWrapper>
      <Dropdown
        onCreate={onDropdownCreate}
        icon={<ButtonIcon {...props} />}
        placement="bottom-end"
        disabled={disabled || !canOpenDropdown}
      >
        <div {...(props['data-testid'] && { 'data-testid': props['data-testid'] + '-dropdown' })}>
          {renderOptions()}
        </div>
      </Dropdown>
    </StyledWrapper>
  );
};

export default ButtonDropdown;
