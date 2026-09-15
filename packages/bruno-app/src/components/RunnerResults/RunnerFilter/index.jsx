import React from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';

const RunnerFilter = ({ filters, activeFilter, onFilterChange }) => {
  const active = filters.find((filter) => filter.key === activeFilter);

  const menuItems = filters.map(({ key, label, count }) => ({
    id: key,
    ariaLabel: label,
    label: (
      <span className="filter-option">
        <span>{label}</span>
        <span className="filter-count">{count}</span>
      </span>
    ),
    leftSection: (
      <span className="filter-check">
        {key === activeFilter ? <IconCheck size={14} strokeWidth={2} /> : null}
      </span>
    ),
    onClick: () => onFilterChange(key)
  }));

  return (
    <StyledWrapper className="filter-bar">
      <div className="filter-label">
        <span>Filter by:</span>
      </div>

      <div className="filter-buttons">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            className={activeFilter === key ? 'filter-button active' : 'filter-button'}
            data-testid={`runner-filter-${key}`}
          >
            {label}
            <span className="filter-count" data-testid={`runner-filter-${key}-count`}>{count}</span>
          </button>
        ))}
      </div>

      <MenuDropdown
        items={menuItems}
        placement="bottom-start"
        selectedItemId={activeFilter}
        showTickMark={false}
      >
        <button
          type="button"
          className="filter-select"
          aria-label={`Filter by: ${active?.label}`}
          data-testid="runner-filter-select"
        >
          <span>{active?.label}</span>
          <span className="filter-count">{active?.count}</span>
          <IconChevronDown size={14} strokeWidth={2} />
        </button>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default RunnerFilter;
