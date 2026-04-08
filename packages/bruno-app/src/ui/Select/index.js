import React, { useState, useRef, useCallback, useEffect, useMemo, useId } from 'react';
import Dropdown from 'components/Dropdown';
import { IconCaretDown, IconX, IconLoader2 } from '@tabler/icons';
import InputWrapper from 'ui/InputWrapper';
import StyledWrapper from './StyledWrapper';

const NAVIGATION_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'];
const ACTION_KEYS = ['Enter'];

const getNextIndex = (currentIndex, total, key) => {
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  if (key === 'ArrowDown') return currentIndex === -1 ? 0 : (currentIndex + 1) % total;
  if (key === 'ArrowUp') return currentIndex === -1 ? total - 1 : (currentIndex - 1 + total) % total;
  return currentIndex;
};

const normalizeData = (data) => {
  if (!data) return [];
  return data.map((item) => {
    if (typeof item === 'string') {
      return { value: item, label: item };
    }
    return { value: item.value, label: item.label || item.value, disabled: item.disabled };
  });
};

const sameWidthModifier = {
  name: 'sameWidth',
  enabled: true,
  phase: 'beforeWrite',
  requires: ['computeStyles'],
  fn: ({ state }) => {
    state.styles.popper.width = `${state.rects.reference.width}px`;
  },
  effect: ({ state }) => {
    state.elements.popper.style.width = `${state.elements.reference.offsetWidth}px`;
  }
};

/**
 * Select - A reusable select/dropdown component for forms
 *
 * @param {Array} props.data - Array of strings or { value, label, disabled? } objects
 * @param {string} props.value - Controlled selected value
 * @param {function} props.onChange - Called with the selected value string
 * @param {string} props.placeholder - Placeholder text when no value selected
 * @param {boolean} props.disabled - Disables interaction
 * @param {string} props.error - Error message displayed below the select
 * @param {boolean} props.searchable - Enables type-to-filter when dropdown is open
 * @param {string} props.nothingFoundMessage - Message shown when search yields no results
 * @param {boolean} props.clearable - Shows a clear button when a value is selected
 * @param {boolean} props.allowDeselect - Clicking the selected option deselects it (default: true)
 * @param {number} props.maxDropdownHeight - Max height of the dropdown in px (default: 250)
 * @param {function} props.renderOption - Custom option renderer: ({ option, isSelected, isFocused }) => ReactNode
 * @param {boolean} props.loading - Shows a loading spinner in the right section
 * @param {ReactNode} props.leftSection - Element rendered on the left side of the trigger
 * @param {ReactNode} props.rightSection - Element rendered on the right side (replaces default caret)
 * @param {string} props.label - Label text displayed above the select
 * @param {string} props.description - Description text displayed below the label
 * @param {string} props.className - Additional CSS class for the wrapper
 */
const Select = ({
  data,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  error,
  label,
  description,
  searchable = false,
  nothingFoundMessage = 'No options found',
  clearable = false,
  allowDeselect = true,
  maxDropdownHeight = 250,
  renderOption,
  loading = false,
  leftSection,
  rightSection,
  required = false,
  size = 'md',
  className,
  'data-testid': testId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchValue, setSearchValue] = useState('');
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const tippyRef = useRef(null);
  const autoId = useId();
  const labelId = label ? `${autoId}-label` : undefined;
  const descriptionId = description ? `${autoId}-desc` : undefined;
  const errorId = error ? `${autoId}-err` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const options = useMemo(() => normalizeData(data), [data]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchValue) return options;
    const query = searchValue.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, searchable, searchValue]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearchValue('');
    const idx = options.findIndex((opt) => opt.value === value);
    setFocusedIndex(idx >= 0 ? idx : 0);
  }, [disabled, options, value]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchValue('');
  }, []);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [isOpen, handleOpen, handleClose]);

  const handleSelect = useCallback(
    (option) => {
      if (option.disabled) return;
      if (allowDeselect && option.value === value) {
        onChange?.(null);
      } else {
        onChange?.(option.value);
      }
      handleClose();
    },
    [onChange, handleClose, allowDeselect, value]
  );

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange?.(null);
    },
    [onChange]
  );

  const handleClickOutside = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleTriggerKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      if (ACTION_KEYS.includes(e.key) || NAVIGATION_KEYS.includes(e.key)) {
        e.preventDefault();
        if (!isOpen) {
          handleOpen();
        }
      }
    },
    [disabled, isOpen, handleOpen]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (NAVIGATION_KEYS.includes(e.key)) {
        e.preventDefault();
        if (e.key === 'Escape') {
          handleClose();
          return;
        }
        const enabledIndices = filteredOptions.reduce((acc, opt, i) => {
          if (!opt.disabled) acc.push(i);
          return acc;
        }, []);
        if (enabledIndices.length === 0) return;
        const currentEnabledIdx = enabledIndices.indexOf(focusedIndex);
        const nextEnabledIdx = getNextIndex(currentEnabledIdx, enabledIndices.length, e.key);
        setFocusedIndex(enabledIndices[nextEnabledIdx] ?? 0);
      }

      if (ACTION_KEYS.includes(e.key)) {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[focusedIndex]);
        }
      }

      if (e.key === 'Tab') {
        handleClose();
      }
    },
    [filteredOptions, focusedIndex, handleClose, handleSelect]
  );

  const handleSearchChange = useCallback((e) => {
    setSearchValue(e.target.value);
    setFocusedIndex(0);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (searchable && inputRef.current) {
        inputRef.current.focus();
      } else if (menuRef.current) {
        menuRef.current.focus();
      }
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (isOpen && menuRef.current && focusedIndex >= 0) {
      const focusedEl = menuRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      if (focusedEl) {
        focusedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, focusedIndex]);

  const onDropdownCreate = useCallback((instance) => {
    tippyRef.current = instance;
  }, []);

  // Right section: custom > loading spinner > clearable X > default caret
  const renderRightSection = () => {
    if (rightSection) return <span className="select-section select-right-section">{rightSection}</span>;
    if (loading) {
      return (
        <span className="select-section select-right-section">
          <IconLoader2 className="select-spinner" size={14} strokeWidth={2} />
        </span>
      );
    }
    if (clearable && value != null && value !== '') {
      return (
        <button
          type="button"
          className="select-section select-right-section select-clear"
          onClick={handleClear}
          aria-label="Clear selection"
        >
          <IconX size={14} strokeWidth={2} />
        </button>
      );
    }
    return (
      <span className="select-caret">
        <IconCaretDown size={14} strokeWidth={2} />
      </span>
    );
  };

  // Trigger content (label/placeholder or search input)
  const renderTriggerContent = () => {
    if (searchable && isOpen) {
      return (
        <input
          ref={inputRef}
          type="text"
          className="select-search-input"
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      );
    }
    if (selectedOption) {
      return <span className="select-trigger-label">{selectedOption.label}</span>;
    }
    return <span className="select-trigger-placeholder">{placeholder}</span>;
  };

  const triggerClickHandler = searchable
    ? () => { if (!isOpen) handleOpen(); }
    : handleToggle;

  const triggerKeyHandler = searchable
    ? (e) => {
        if (!isOpen && (ACTION_KEYS.includes(e.key) || NAVIGATION_KEYS.includes(e.key))) {
          e.preventDefault();
          handleOpen();
        }
      }
    : handleTriggerKeyDown;

  const trigger = (
    <div
      className={`select-trigger textbox ${disabled ? 'disabled' : ''} ${isOpen ? 'select-open' : ''}`}
      onClick={triggerClickHandler}
      onKeyDown={triggerKeyHandler}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      aria-required={required || undefined}
      data-testid={testId}
    >
      {leftSection && <span className="select-section select-left-section">{leftSection}</span>}
      <span className="select-trigger-content">
        {renderTriggerContent()}
      </span>
      {renderRightSection()}
    </div>
  );

  // Option rendering — shared between searchable and non-searchable
  const renderOptions = () => {
    if (filteredOptions.length === 0) {
      return <div className="select-nothing-found">{nothingFoundMessage}</div>;
    }
    return filteredOptions.map((option, index) => {
      const isSelected = option.value === value;
      const isFocused = index === focusedIndex;
      const classNames = [
        'dropdown-item',
        isSelected ? 'dropdown-item-active' : '',
        isFocused ? 'dropdown-item-focused' : '',
        option.disabled ? 'disabled' : ''
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <div
          key={option.value}
          className={classNames}
          data-index={index}
          role="option"
          aria-selected={isSelected}
          onClick={() => handleSelect(option)}
        >
          {renderOption
            ? renderOption({ option, isSelected, isFocused })
            : <span className="dropdown-label">{option.label}</span>}
        </div>
      );
    });
  };

  return (
    <InputWrapper label={label} description={description} error={error} required={required} size={size} className={className} labelId={labelId} descriptionId={descriptionId} errorId={errorId}>
      <StyledWrapper $size={size}>
        <Dropdown
          onCreate={onDropdownCreate}
          icon={trigger}
          placement="bottom-start"
          visible={isOpen}
          onClickOutside={handleClickOutside}
          popperOptions={{ modifiers: [sameWidthModifier] }}
          maxWidth="none"
        >
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={searchable ? undefined : -1}
            onKeyDown={searchable ? undefined : handleKeyDown}
            style={{ maxHeight: maxDropdownHeight, overflowY: 'auto', outline: 'none' }}
          >
            {renderOptions()}
          </div>
        </Dropdown>
      </StyledWrapper>
    </InputWrapper>
  );
};

export default Select;
