import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import classnames from 'classnames';
import MenuDropdown from 'ui/MenuDropdown';
import { IconChevronDown } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const DROPDOWN_WIDTH = 60;
const CALCULATION_DELAY_DEFAULT = 20;
const CALCULATION_DELAY_EXTENDED = 150;
const GAP_BETWEEN_LEFT_AND_RIGHT_CONTENT = 80;

// Compare two tab arrays by their keys
const areTabArraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every((tab, index) => tab.key === b[index].key);
};

const ResponsiveTabs = ({
  tabs,
  activeTab,
  onTabSelect,
  rightContent,
  rightContentRef,
  delayedTabs = [],
  rightContentExpandedWidth // Optional: width of the right content when expanded(used when right content's elements are collapsible)
}) => {
  const [visibleTabs, setVisibleTabs] = useState([]);
  const [overflowTabs, setOverflowTabs] = useState([]);
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

    // Only update state if arrays actually changed (prevents infinite loops)
    setVisibleTabs((prev) => (areTabArraysEqual(prev, visible) ? prev : visible));
    setOverflowTabs((prev) => (areTabArraysEqual(prev, overflow) ? prev : overflow));

    // Only calculate expandibility if rightContentExpandedWidth is provided
    if (rightContentExpandedWidth) {
      const leftContentWidth = currentWidth + (overflow.length ? DROPDOWN_WIDTH : 0);
      const expandable = containerWidth - leftContentWidth - GAP_BETWEEN_LEFT_AND_RIGHT_CONTENT > rightContentExpandedWidth;
      setRightSideExpandable((prev) => (prev === expandable ? prev : expandable));
    }
  }, [tabs, activeTab, rightContentRef, rightContentExpandedWidth]);

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

  const renderTab = (tab) => {
    const isActive = tab.key === activeTab;

    return (
      <div
        key={tab.key}
        role="tab"
        aria-selected={isActive}
        className={classnames('tab select-none', tab.key, { active: isActive })}
        onClick={() => handleTabSelect(tab.key)}
      >
        {tab.label}
        {tab.indicator}
      </div>
    );
  };

  const rightContentClassName = classnames('flex justify-end items-center', {
    expandable: rightSideExpandable
  });

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
              className={classnames('tab select-none', tab.key, { active: tab.key === activeTab })}
            >
              {tab.label}
              {tab.indicator}
            </div>
          ))}
        </div>

        {/* Visible tabs */}
        {visibleTabs.map((tab) => renderTab(tab))}

        {/* Overflow dropdown */}
        {overflowTabs.length > 0 && (
          <MenuDropdown
            ref={menuDropdownRef}
            items={overflowMenuItems}
            placement="bottom-start"
            selectedItemId={activeTab}
          >
            <div className="more-tabs select-none flex items-center cursor-pointer gap-1">
              <span>More</span>
              <IconChevronDown size={14} strokeWidth={2} />
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
