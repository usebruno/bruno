import React from 'react';
import { IconFilter, IconChevronDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper, { FilterMenu } from './StyledWrapper';

export const DevToolsFilterDropdown = ({
  filters,
  counts,
  onFilterToggle,
  onToggleAll,
  headerLabel,
  title,
  renderIcon
}) => {
  const filterEntries = Object.entries(filters);
  const allFiltersEnabled = filterEntries.every(([_, enabled]) => enabled);
  const activeFilterCount = filterEntries.filter(([_, enabled]) => enabled).length;

  return (
    <StyledWrapper className="filter-dropdown">
      <Dropdown
        placement="bottom-end"
        appendTo={() => document.body}
        noPadding
        icon={(
          <button className="filter-dropdown-trigger" title={title} data-testid="filter-dropdown-trigger">
            <IconFilter size={16} strokeWidth={1.5} />
            <span className="filter-summary">
              {activeFilterCount === filterEntries.length ? 'All' : `${activeFilterCount}/${filterEntries.length}`}
            </span>
            <IconChevronDown size={14} strokeWidth={1.5} />
          </button>
        )}
      >
        <FilterMenu data-testid="filter-dropdown-menu">
          <div className="filter-dropdown-header">
            <span>{headerLabel}</span>
            <button
              className="filter-toggle-all"
              data-testid="filter-toggle-all"
              onClick={() => onToggleAll(!allFiltersEnabled)}
            >
              {allFiltersEnabled ? 'Hide All' : 'Show All'}
            </button>
          </div>
          <div className="filter-dropdown-options">
            {filterEntries.map(([key, enabled]) => (
              <label key={key} className="filter-option" data-testid={`filter-option-${key}`}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onFilterToggle(key, e.target.checked)}
                />
                <div className="filter-option-content">
                  {renderIcon && renderIcon(key)}
                  <span className="filter-option-label">{key}</span>
                  <span className="filter-option-count">({counts[key] || 0})</span>
                </div>
              </label>
            ))}
          </div>
        </FilterMenu>
      </Dropdown>
    </StyledWrapper>
  );
};
