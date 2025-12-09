import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import classnames from 'classnames';
import Dropdown from 'components/Dropdown';
import { IconChevronDown } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const DROPDOWN_WIDTH = 60;
const CALCULATION_DELAY_DEFAULT = 20;
const CALCULATION_DELAY_EXTENDED = 150;

const RequestPaneTabs = ({
  tabs,
  activeTab,
  onTabSelect,
  rightContent,
  rightContentRef,
  delayedTabs = []
}) => {
  const [visibleTabs, setVisibleTabs] = useState([]);
  const [overflowTabs, setOverflowTabs] = useState([]);

  const tabsContainerRef = useRef(null);
  const tabRefsMap = useRef({});
  const dropdownTippyRef = useRef(null);

  const handleTabSelect = useCallback(
    (tabKey) => {
      onTabSelect(tabKey);
      dropdownTippyRef.current?.hide();
    },
    [onTabSelect]
  );

  const calculateTabVisibility = useCallback(() => {
    const container = tabsContainerRef.current;
    if (!container || !tabs.length) return;

    const containerWidth = container.offsetWidth;
    const rightContentWidth = rightContentRef?.current
      ? rightContentRef.current.offsetWidth + 20
      : 0;

    const availableWidth = containerWidth - rightContentWidth - DROPDOWN_WIDTH;
    const visible = [];
    const overflow = [];
    let currentWidth = 0;

    for (const tab of tabs) {
      const tabElement = tabRefsMap.current[tab.key];
      const tabWidth = tabElement ? tabElement.offsetWidth + 20 : 100;

      if (currentWidth + tabWidth <= availableWidth && !overflow.length) {
        visible.push(tab);
        currentWidth += tabWidth;
      } else {
        overflow.push(tab);
      }
    }

    if (!visible.some((t) => t.key === activeTab) && overflow.length) {
      const activeTabIndex = overflow.findIndex((t) => t.key === activeTab);
      if (activeTabIndex !== -1) {
        const [activeTabItem] = overflow.splice(activeTabIndex, 1);
        const lastVisible = visible.pop();
        if (lastVisible) overflow.unshift(lastVisible);
        visible.push(activeTabItem);
      }
    }

    setVisibleTabs(visible);
    setOverflowTabs(overflow);
  }, [tabs, activeTab, rightContentRef]);

  const renderTab = useCallback(
    (tab, isInDropdown = false) => {
      const isActive = tab.key === activeTab;

      if (isInDropdown) {
        return (
          <div
            key={tab.key}
            className={classnames('dropdown-item', { active: isActive })}
            role="tab"
            onClick={() => handleTabSelect(tab.key)}
          >
            <span className="flex items-center gap-1">
              {tab.label}
              {tab.indicator}
            </span>
          </div>
        );
      }

      return (
        <div
          key={tab.key}
          className={classnames('tab select-none', tab.key, { active: isActive })}
          role="tab"
          onClick={() => handleTabSelect(tab.key)}
          ref={(el) => el && (tabRefsMap.current[tab.key] = el)}
        >
          {tab.label}
          {tab.indicator}
        </div>
      );
    },
    [activeTab, handleTabSelect]
  );

  useEffect(() => {
    const delay = delayedTabs.includes(activeTab) ? CALCULATION_DELAY_EXTENDED : CALCULATION_DELAY_DEFAULT;
    const timeoutId = setTimeout(() => requestAnimationFrame(calculateTabVisibility), delay);
    return () => clearTimeout(timeoutId);
  }, [calculateTabVisibility, activeTab, delayedTabs]);

  useEffect(() => {
    let frameId = null;
    const observer = new ResizeObserver(() => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(calculateTabVisibility);
    });

    if (tabsContainerRef.current) observer.observe(tabsContainerRef.current);
    if (rightContentRef?.current) observer.observe(rightContentRef.current);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [calculateTabVisibility, rightContentRef]);

  const hiddenStyle = useMemo(
    () => ({ visibility: 'hidden', position: 'absolute', display: 'flex', pointerEvents: 'none' }),
    []
  );

  return (
    <StyledWrapper ref={tabsContainerRef} className="flex items-center tabs" role="tablist">
      <div style={hiddenStyle}>
        {tabs.map((tab) => (
          <div
            key={tab.key}
            className={classnames('tab select-none', tab.key, { active: tab.key === activeTab })}
            ref={(el) => el && (tabRefsMap.current[tab.key] = el)}
          >
            {tab.label}
            {tab.indicator}
          </div>
        ))}
      </div>

      {visibleTabs.map((tab) => renderTab(tab))}

      {overflowTabs.length > 0 && (
        <Dropdown
          icon={(
            <div className="more-tabs select-none flex items-center cursor-pointer gap-1">
              <span>More</span>
              <IconChevronDown size={14} strokeWidth={2} />
            </div>
          )}
          placement="bottom-start"
          onCreate={(instance) => (dropdownTippyRef.current = instance)}
        >
          <div style={{ minWidth: '150px' }}>{overflowTabs.map((tab) => renderTab(tab, true))}</div>
        </Dropdown>
      )}

      {rightContent && (
        <div className="flex flex-grow justify-end items-center">
          {rightContent}
        </div>
      )}
    </StyledWrapper>
  );
};

export default RequestPaneTabs;
