import { IconChevronsRight } from '@tabler/icons';
import classnames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MenuDropdown from 'ui/MenuDropdown';
import DraggableTab from './DraggableTab';
import StyledWrapper from './StyledWrapper';

const DROPDOWN_WIDTH = 60;
const CALCULATION_DELAY_DEFAULT = 20;
const CALCULATION_DELAY_EXTENDED = 150;
const GAP_BETWEEN_LEFT_AND_RIGHT_CONTENT = 80;
const EXPANDABLE_HYSTERESIS = 20; // Buffer to prevent flickering at boundary

// Compare two key arrays for equality
const areKeysEqual = (prevKeys, newKeys) => {
  if (prevKeys.length !== newKeys.length) return false;
  return prevKeys.every((key, i) => key === newKeys[i]);
};

const ResponsiveTabs = ({
  tabs,
  activeTab,
  onTabSelect,
  rightContent,
  rightContentRef,
  delayedTabs = [],
  rightContentExpandedWidth, // Optional: width of the expandable element when expanded
  expandableElementIndex = -1, // Optional: index of the expandable child element (-1 means last child)
  onTabReorder
}) => {
  const [visibleTabKeys, setVisibleTabKeys] = useState([]);
  const [overflowTabKeys, setOverflowTabKeys] = useState([]);
  const [rightSideExpandable, setRightSideExpandable] = useState(false);

  const tabsContainerRef = useRef(null);
  const tabRefsMap = useRef({});
  const menuDropdownRef = useRef(null);

  const handleTabSelect = useCallback(
    (tabKey) => {
      onTabSelect(tabKey);
      menuDropdownRef.current?.hide();
    },
    [onTabSelect]
  );

  const moveTab = useCallback(
    (dragIndex, hoverIndex) => {
      if (onTabReorder) {
        onTabReorder(dragIndex, hoverIndex);
      }
    },
    [onTabReorder]
  );

  const calculateTabVisibility = useCallback(() => {
    const container = tabsContainerRef.current;
    if (!container || !tabs.length) return;

    const containerWidth = container.offsetWidth;
    const rightContentWidth = rightContentRef?.current?.offsetWidth + 20 || 0;
    const availableWidth = containerWidth - rightContentWidth - DROPDOWN_WIDTH;

    const visible = [];
    const overflow = [];
    let currentWidth = 0;

    for (const tab of tabs) {
      const tabElement = tabRefsMap.current[tab.key];
      const tabWidth = tabElement?.offsetWidth + 20 || 100;

      if (currentWidth + tabWidth <= availableWidth && !overflow.length) {
        visible.push(tab);
        currentWidth += tabWidth;
      } else {
        overflow.push(tab);
      }
    }

    // Ensure active tab is always visible
    if (!visible.some((t) => t.key === activeTab) && overflow.length) {
      const activeTabIndex = overflow.findIndex((t) => t.key === activeTab);
      if (activeTabIndex !== -1) {
        const [activeTabItem] = overflow.splice(activeTabIndex, 1);
        const lastVisible = visible.pop();
        if (lastVisible) {
          overflow.unshift(lastVisible);
        }
        visible.push(activeTabItem);
      }
    }

    // Extract keys and update state only if changed (prevents infinite loops)
    const visibleKeys = visible.map((t) => t.key);
    const overflowKeys = overflow.map((t) => t.key);

    setVisibleTabKeys((prev) => {
      return areKeysEqual(prev, visibleKeys) ? prev : visibleKeys;
    });
    setOverflowTabKeys((prev) => {
      return areKeysEqual(prev, overflowKeys) ? prev : overflowKeys;
    });

    // Only calculate expandibility if rightContentExpandedWidth is provided
    if (rightContentExpandedWidth && rightContentRef?.current) {
      const leftContentWidth = currentWidth + (overflow.length ? DROPDOWN_WIDTH : 0);

      // Calculate total expanded width by summing children widths
      // and replacing the expandable element's current width with its expanded width
      const children = rightContentRef.current.children;
      const childrenCount = children.length;

      if (childrenCount > 0) {
        // Resolve the expandable element index (-1 means last child)
        const targetIndex = expandableElementIndex < 0 ? childrenCount + expandableElementIndex : expandableElementIndex;
        const validTargetIndex = Math.max(0, Math.min(targetIndex, childrenCount - 1));

        let totalExpandedWidth = 0;
        for (let i = 0; i < childrenCount; i++) {
          if (i === validTargetIndex) {
            // Use the expanded width for the expandable element
            totalExpandedWidth += rightContentExpandedWidth;
          } else {
            // Use the current width for other elements
            totalExpandedWidth += children[i].offsetWidth;
          }
        }

        const availableSpace = containerWidth - leftContentWidth - GAP_BETWEEN_LEFT_AND_RIGHT_CONTENT;

        // Use hysteresis to prevent flickering at boundary
        // When expanded: only collapse if significantly less space available
        // When collapsed: expand when there's enough space
        setRightSideExpandable((prev) => {
          if (prev) {
            // Currently expanded - only collapse if space drops below threshold minus hysteresis
            return availableSpace > totalExpandedWidth - EXPANDABLE_HYSTERESIS;
          } else {
            // Currently collapsed - expand if there's enough space
            return availableSpace > totalExpandedWidth;
          }
        });
      }
    }
  }, [tabs, activeTab, rightContentRef, rightContentExpandedWidth, expandableElementIndex]);

  // Recalculate on tab/activeTab changes
  useEffect(() => {
    const delay = delayedTabs.includes(activeTab) ? CALCULATION_DELAY_EXTENDED : CALCULATION_DELAY_DEFAULT;
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(calculateTabVisibility);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [calculateTabVisibility, activeTab, delayedTabs]);

  // Recalculate on container resize only
  useEffect(() => {
    let frameId = null;

    const observer = new ResizeObserver(() => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(calculateTabVisibility);
    });

    if (tabsContainerRef.current) {
      observer.observe(tabsContainerRef.current);
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, [calculateTabVisibility]);

  // Clean up stale refs when tabs change
  useEffect(() => {
    const currentKeys = new Set(tabs.map((t) => t.key));
    for (const key of Object.keys(tabRefsMap.current)) {
      if (!currentKeys.has(key)) {
        delete tabRefsMap.current[key];
      }
    }
  }, [tabs]);

  const hiddenStyle = useMemo(
    () => ({
      visibility: 'hidden',
      position: 'absolute',
      display: 'flex',
      pointerEvents: 'none'
    }),
    []
  );

  const setTabRef = useCallback((el, key) => {
    if (el) {
      tabRefsMap.current[key] = el;
    }
  }, []);

  const renderTab = (tab, index) => {
    const isActive = tab.key === activeTab;

    return (
      <DraggableTab
        key={tab.key}
        id={tab.key}
        index={index}
        moveTab={moveTab}
        role="tab"
        aria-selected={isActive}
        className={classnames('tab select-none', tab.key, { active: isActive })}
        onClick={() => handleTabSelect(tab.key)}
      >
        {tab.label}
        {tab.indicator}
      </DraggableTab>
    );
  };

  const rightContentClassName = classnames('flex justify-end items-center', {
    expandable: rightSideExpandable
  });

  // Map stored keys to fresh tab objects from props
  const visibleTabs = visibleTabKeys.map((key) => tabs.find((t) => t.key === key)).filter(Boolean);
  const overflowTabs = overflowTabKeys.map((key) => tabs.find((t) => t.key === key)).filter(Boolean);

  // Convert overflow tabs to MenuDropdown items format
  const overflowMenuItems = useMemo(() => {
    return overflowTabs.map((tab) => ({
      id: tab.key,
      label: (
        <span className="flex items-center gap-1">
          {tab.label}
          {tab.indicator}
        </span>
      ),
      ariaLabel: typeof tab.label === 'string' ? tab.label : tab.key,
      onClick: () => handleTabSelect(tab.key),
      className: classnames({ active: tab.key === activeTab })
    }));
  }, [overflowTabs, activeTab, handleTabSelect]);

  return (
    <StyledWrapper ref={tabsContainerRef} role="tablist" className="tabs flex items-center justify-between gap-6">
      <div className="flex items-center">
        {/* Hidden tabs for measurement */}
        <div style={hiddenStyle}>
          {tabs.map((tab) => (
            <div
              key={tab.key}
              ref={(el) => setTabRef(el, tab.key)}
              role="tab"
              aria-selected={tab.key === activeTab}
              className={classnames('tab select-none', tab.key, { active: tab.key === activeTab })}
            >
              {tab.label}
              {tab.indicator}
            </div>
          ))}
        </div>

        {/* Visible tabs */}
        {visibleTabs.map((tab, index) => renderTab(tab, index))}

        {/* Overflow dropdown */}
        {overflowTabs.length > 0 && (
          <MenuDropdown
            ref={menuDropdownRef}
            items={overflowMenuItems}
            placement="bottom-start"
            selectedItemId={activeTab}
          >
            <div className="more-tabs select-none flex items-center cursor-pointer gap-1">
              <IconChevronsRight size={18} strokeWidth={2} />
            </div>
          </MenuDropdown>
        )}
      </div>

      {rightContent && (
        <div className={rightContentClassName}>
          {rightContent}
        </div>
      )}
    </StyledWrapper>
  );
};

export default ResponsiveTabs;
