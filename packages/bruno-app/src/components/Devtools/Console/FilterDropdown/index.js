import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { IconFilter, IconChevronDown } from '@tabler/icons';
import { PortalDropdownMenu } from '../StyledWrapper';
import LogIcon from '../LogIcon';
import useClickOutside from 'hooks/useClickOutside';

// Smallest height the menu may shrink to before it scrolls internally,
// so a trigger near the viewport bottom still shows a usable, scrollable menu.
const MIN_MENU_HEIGHT = 120;

export const computeMenuStyle = (el, innerWidth = window.innerWidth, innerHeight = window.innerHeight) => {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const spaceBelow = innerHeight - rect.bottom - 8;
  // Always open below the trigger; cap the height to the room available so the
  // options list scrolls instead of clipping when space is tight.
  return {
    position: 'fixed',
    top: rect.bottom + 4,
    right: innerWidth - rect.right,
    zIndex: 9999,
    maxHeight: Math.max(spaceBelow, MIN_MENU_HEIGHT)
  };
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
    const handleResize = () => { if (isOpen) setMenuStyle(computeMenuStyle(dropdownRef.current) ?? {}); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) setMenuStyle(computeMenuStyle(dropdownRef.current) ?? {});
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
      <div className="filter-dropdown-options" style={{ maxHeight: Math.max(menuStyle.maxHeight - 32, 0), overflowY: 'auto' }}>
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
