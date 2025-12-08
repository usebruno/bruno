import React, { useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import Dropdown from 'components/Dropdown';

const ButtonIcon = forwardRef(({ disabled, className, style, prefix, selectedLabel, suffix, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={classnames('button-dropdown-button flex items-center gap-1.5 text-xs',
        'cursor-pointer select-none',
        'h-7 rounded-[6px] border px-2 transition-colors',
        { 'opacity-50 cursor-not-allowed': disabled },
        className)}
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
    dropdownTippyRef.current?.hide();
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

  return (
    <StyledWrapper>
      <Dropdown
        onCreate={onDropdownCreate}
        icon={<ButtonIcon selectedLabel={selectedLabel} prefix={prefix} suffix={suffix} disabled={disabled} className={className} style={style} {...props} />}
        placement="bottom-end"
        disabled={disabled}
      >
        <div {...(props['data-testid'] && { 'data-testid': props['data-testid'] + '-dropdown' })}>
          {header && (
            <div className="dropdown-header-container" onClick={() => dropdownTippyRef.current?.hide()}>
              {header}
              <div className="dropdown-divider"></div>
            </div>
          )}
          {renderOptions()}
        </div>
      </Dropdown>
    </StyledWrapper>
  );
};

export default ButtonDropdown;
