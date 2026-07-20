import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { IconFilter, IconChevronDown } from '@tabler/icons';
import { PortalDropdownMenu } from '../StyledWrapper';
import { LogIcon } from '../index';
import useClickOutside from 'hooks/useClickOutside';

const computeMenuStyle = (el, setMenuStyle) => {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  setMenuStyle({
    position: 'fixed',
    top: rect.bottom + 4,
    right: window.innerWidth - rect.right,
    zIndex: 9999,
    maxHeight: window.innerHeight - rect.bottom - 8
  });
};

export const DevToolsFilterDropdown = ({
  filters,
  counts,
  onFilterToggle,
  onToggleAll,
  headerLabel,
  title,
  renderIcon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const allFiltersEnabled = Object.values(filters).every((f) => f);
  const activeFilters = Object.entries(filters).filter(([_, enabled]) => enabled);

  useClickOutside([dropdownRef, menuRef], () => setIsOpen(false));

  useEffect(() => {
    const handleResize = () => { if (isOpen) computeMenuStyle(dropdownRef.current, setMenuStyle); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) computeMenuStyle(dropdownRef.current, setMenuStyle);
    setIsOpen(!isOpen);
  };

  const menu = isOpen ? (
    <PortalDropdownMenu ref={menuRef} style={menuStyle}>
      <div className="filter-dropdown-header">
        <span>{headerLabel}</span>
        <button className="filter-toggle-all" onClick={() => onToggleAll(!allFiltersEnabled)}>
          {allFiltersEnabled ? 'Hide All' : 'Show All'}
        </button>
      </div>
      <div className="filter-dropdown-options" style={{ maxHeight: menuStyle.maxHeight - 32, overflowY: 'auto' }}>
        {Object.entries(filters).map(([key, enabled]) => (
          <label key={key} className="filter-option">
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
    </PortalDropdownMenu>
  ) : null;

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button className="filter-dropdown-trigger" onClick={handleToggle} title={title}>
        <IconFilter size={16} strokeWidth={1.5} />
        <span className="filter-summary">
          {activeFilters.length === Object.keys(filters).length ? 'All' : `${activeFilters.length}/${Object.keys(filters).length}`}
        </span>
        <IconChevronDown size={14} strokeWidth={1.5} />
      </button>
      {ReactDOM.createPortal(menu, document.body)}
    </div>
  );
};
