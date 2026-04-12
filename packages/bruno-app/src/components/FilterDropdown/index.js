import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconChevronDown, IconCheck } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

/**
 * FilterDropdown - A themed dropdown for selecting filter options.
 *
 * @param {string} label - Display label for the trigger button
 * @param {Array} options - Array of { value, label, icon? } objects
 * @param {string|null} value - Currently selected value (null for "all"/default)
 * @param {function} onChange - Called with the new value when selection changes
 * @param {string} [allLabel='All'] - Label for the "clear filter" option
 * @param {string} [placement='left'] - Menu alignment: 'left' or 'right'
 */
const FilterDropdown = ({ label, options, value, onChange, allLabel = 'All', placement = 'left', testId }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback((val) => {
    onChange(val);
    setOpen(false);
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const isActive = value !== null && value !== '';
  const selectedLabel = isActive
    ? options.find((o) => o.value === value)?.label || value
    : label;

  const menuAlignClass = placement === 'right' ? 'align-right' : 'align-left';

  return (
    <StyledWrapper ref={wrapperRef}>
      <button
        className={`filter-trigger ${isActive ? 'active' : ''}`}
        onClick={handleToggle}
        data-testid={testId}
      >
        <span>{selectedLabel}</span>
        <IconChevronDown size={12} strokeWidth={2} className={`filter-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className={`filter-menu ${menuAlignClass}`}>
          <div
            className={`filter-option ${!isActive ? 'selected' : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span className="filter-option-label">{allLabel}</span>
            <IconCheck
              size={14}
              strokeWidth={2}
              className={`filter-option-check ${!isActive ? 'visible' : ''}`}
            />
          </div>

          <div className="filter-separator" />

          {options.map((option) => (
            <div
              key={option.value}
              className={`filter-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.icon && (
                <span className="filter-option-icon">{option.icon}</span>
              )}
              <span className="filter-option-label">{option.label}</span>
              <IconCheck
                size={14}
                strokeWidth={2}
                className={`filter-option-check ${value === option.value ? 'visible' : ''}`}
              />
            </div>
          ))}
        </div>
      )}
    </StyledWrapper>
  );
};

export default FilterDropdown;
