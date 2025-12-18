import React, { useRef, useEffect, useCallback, useState } from 'react';
import { IconX } from '@tabler/icons';
import classnames from 'classnames';
import MenuDropdown from 'ui/MenuDropdown';

const Tab = ({
  tab,
  index,
  tabs,
  isActive,
  onClose,
  onDoubleClick,
  getContextMenuItems,
  hasOverflow,
  setHasOverflow
}) => {
  const tabNameRef = useRef(null);
  const lastOverflowStateRef = useRef(null);
  const menuDropdownRef = useRef();
  const [menuOpen, setMenuOpen] = useState(false);

  const getTabId = (t) => t.uid || t.id;
  const tabId = getTabId(tab);
  const tabLabel = tab.label || tab.name || 'Untitled';

  useEffect(() => {
    if (!tabNameRef.current || !setHasOverflow) return;

    const checkOverflow = () => {
      if (tabNameRef.current && setHasOverflow) {
        const overflow = tabNameRef.current.scrollWidth > tabNameRef.current.clientWidth;
        if (lastOverflowStateRef.current !== overflow) {
          lastOverflowStateRef.current = overflow;
          setHasOverflow(overflow);
        }
      }
    };

    const timeoutId = setTimeout(checkOverflow, 0);
    const resizeObserver = new ResizeObserver(checkOverflow);

    if (tabNameRef.current) {
      resizeObserver.observe(tabNameRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [tabLabel, tabId, setHasOverflow]);

  const handleCloseClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onClose && !tab.permanent) {
      onClose(tabId);
    }
  }, [onClose, tabId, tab.permanent]);

  const handleRightClick = useCallback((e) => {
    const items = getContextMenuItems?.(tab, index, tabs);
    if (!items?.length) return;
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  }, [getContextMenuItems, tab, index, tabs]);

  const handleMiddleClick = useCallback((e) => {
    if (e.button === 1 && !tab.permanent) {
      e.preventDefault();
      e.stopPropagation();
      if (onClose) {
        onClose(tabId);
      }
    }
  }, [onClose, tabId, tab.permanent]);

  const handleDoubleClick = useCallback(() => {
    if (onDoubleClick) {
      onDoubleClick(tabId);
    }
  }, [onDoubleClick, tabId]);

  const handleMenuChange = useCallback((opened) => {
    setMenuOpen(opened);
  }, []);

  const contextMenuItems = getContextMenuItems?.(tab, index, tabs) || [];
  const menuItems = contextMenuItems.map((item) => {
    if (item.type === 'divider') {
      return { type: 'divider', id: item.id };
    }
    return {
      id: item.id,
      label: item.label,
      leftSection: item.icon,
      onClick: () => item.onClick?.(tab),
      disabled: item.disabled,
      className: item.className
    };
  });

  const renderContextMenu = () => {
    if (!menuItems.length) return null;

    return (
      <MenuDropdown
        ref={menuDropdownRef}
        items={menuItems}
        opened={menuOpen}
        onChange={handleMenuChange}
        placement="bottom-start"
        showTickMark={false}
      >
        <span style={{ display: 'none' }} />
      </MenuDropdown>
    );
  };

  return (
    <div
      className={classnames('flex items-center justify-between tab-container px-2', {
        italic: tab.preview
      })}
      onMouseUp={handleMiddleClick}
    >
      <div
        className={classnames('flex items-center tab-label', {
          italic: tab.preview
        })}
        onContextMenu={handleRightClick}
        onDoubleClick={handleDoubleClick}
      >
        {tab.icon && <span className="tab-icon">{tab.icon}</span>}
        {tab.method && (
          <span
            className="tab-method uppercase"
            style={tab.methodColor ? { color: tab.methodColor } : undefined}
          >
            {tab.method}
          </span>
        )}
        <span ref={tabNameRef} className="tab-name" title={tabLabel}>
          {tabLabel}
        </span>
        {tab.hasDraft && <span className="tab-draft-indicator" />}
        {renderContextMenu()}
      </div>
      {!tab.permanent && onClose && (
        <span className="tab-close-btn" onClick={handleCloseClick}>
          <IconX size={14} strokeWidth={1.5} />
        </span>
      )}
    </div>
  );
};

export default Tab;
