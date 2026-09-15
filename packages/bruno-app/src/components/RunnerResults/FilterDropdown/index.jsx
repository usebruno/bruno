import React, { useState } from 'react';
import styled from 'styled-components';
import { IconChevronDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;

  .filter-active,
  .filter-toggle {
    display: inline-flex;
    align-items: center;
    padding: 0;
    padding-bottom: 0.4rem;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.tabs.active.border};
      outline-offset: 2px;
    }
  }

  .filter-active {
    gap: 0.375rem;
    border-bottom: 2px solid ${(props) => props.theme.tabs.active.border};
    font-family: Inter, sans-serif;
    font-weight: ${(props) => props.theme.tabs.active.fontWeight};
    color: ${(props) => props.theme.tabs.active.color};
    line-height: 100%;
  }

  .filter-toggle {
    color: ${(props) => props.theme.colors.text.subtext0};

    &:hover {
      color: ${(props) => props.theme.colors.text.text};
    }
  }

  .filter-count {
    padding: 2px 4.5px;
    border-radius: 2px;
    border: 1px solid ${(props) => props.theme.border.border0};
    background-color: ${(props) => props.theme.background.surface0};
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    line-height: 100%;
  }

  .dropdown-item .filter-count {
    margin-left: auto;
  }
`;

/**
 * Compact filter bar: shows the active filter styled like the full-width tabs,
 * with a chevron that opens the remaining filters in a menu.
 *
 * @param {Array<{ key: string, label: string, count: number }>} props.filters
 * @param {string} props.value - key of the active filter
 * @param {(key: string) => void} props.onChange
 */
const FilterDropdown = ({ filters, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeFilter = filters.find((filter) => filter.key === value);
  const toggle = () => setIsOpen((open) => !open);

  const handleSelect = (key) => {
    onChange(key);
    setIsOpen(false);
  };

  return (
    <StyledWrapper>
      <button type="button" className="filter-active" onClick={toggle}>
        {activeFilter.label}
        <span className="filter-count">{activeFilter.count}</span>
      </button>
      <Dropdown
        visible={isOpen}
        onClickOutside={() => setIsOpen(false)}
        placement="bottom-end"
        appendTo={document.body}
        icon={(
          <button
            type="button"
            className="filter-toggle"
            aria-label="Choose filter"
            aria-expanded={isOpen}
            onClick={toggle}
          >
            <IconChevronDown size={16} strokeWidth={1.5} />
          </button>
        )}
      >
        {filters.map((filter) => (
          <div
            key={filter.key}
            className={`dropdown-item ${filter.key === value ? 'active' : ''}`}
            onClick={() => handleSelect(filter.key)}
          >
            <span className="dropdown-label">{filter.label}</span>
            <span className="filter-count">{filter.count}</span>
          </div>
        ))}
      </Dropdown>
    </StyledWrapper>
  );
};

export default FilterDropdown;
