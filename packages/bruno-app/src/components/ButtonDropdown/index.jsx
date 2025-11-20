import React, { useRef, forwardRef } from 'react';
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
  header,
  prefix,
  suffix,
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
    onChange(optionValue);
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
            // Disabled styles
            'opacity-50 cursor-not-allowed': disabled
          },
          className)}
        data-testid={props['data-testid']}
        style={style}
        role="button"
        {...iconProps}
      >
        {prefix && (
          <span>{prefix}</span>
        )}
        <span className="active">{selectedLabel}</span>
        {suffix && (
          <span>{suffix}</span>
        )}
        <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
      </button>
    );
  });

  ButtonIcon.displayName = 'ButtonIcon';

  return (
    <StyledWrapper>
      <Dropdown
        onCreate={onDropdownCreate}
        icon={<ButtonIcon {...props} />}
        placement="bottom-end"
        disabled={disabled}
      >
        <div {...(props['data-testid'] && { 'data-testid': props['data-testid'] + '-dropdown' })}>
          {header && (
            <div className="dropdown-header-container">
              {header}
              <div className="h-px bg-[#e7e7e7] dark:bg-[#444] my-1"></div>
            </div>
          )}
          {renderOptions()}
        </div>
      </Dropdown>
    </StyledWrapper>
  );
};

export default ButtonDropdown;
