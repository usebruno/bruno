import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import classnames from 'classnames';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import Tab from './Tab';
import DraggableTab from './DraggableTab';

const Tabs = ({
  tabs = [],
  activeTabId,
  onTabChange,
  onTabClose,
  onTabDoubleClick,
  onTabReorder,
  getContextMenuItems,
  renderTab,
  maxWidth,
  showScrollButtons = true,
  draggable = false,
  dragType = 'tab',
  className,
  leftContent,
  rightContent,
  noCurves = false,
  location
}) => {
  const tabsRef = useRef();
  const scrollContainerRef = useRef();
  const [tabOverflowStates, setTabOverflowStates] = useState({});
  const [showChevrons, setShowChevrons] = useState(false);

  const getTabId = useCallback((tab) => tab.uid || tab.id, []);

  const createSetHasOverflow = useCallback((tabId) => {
    return (hasOverflow) => {
      setTabOverflowStates((prev) => {
        if (prev[tabId] === hasOverflow) {
          return prev;
        }
        return {
          ...prev,
          [tabId]: hasOverflow
        };
      });
    };
  }, []);

  useEffect(() => {
    if (!tabs.length) return;

    const checkOverflow = () => {
      if (tabsRef.current && scrollContainerRef.current) {
        const hasOverflow = tabsRef.current.scrollWidth > scrollContainerRef.current.clientWidth;
        setShowChevrons(showScrollButtons && hasOverflow);
      }
    };

    checkOverflow();
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [activeTabId, tabs.length, tabs, showScrollButtons]);

  useEffect(() => {
    if (!activeTabId || !scrollContainerRef.current || !tabsRef.current) return;

    const activeIndex = tabs.findIndex((t) => getTabId(t) === activeTabId);
    if (activeIndex === -1) return;

    const tabElements = tabsRef.current.querySelectorAll('li');
    const activeTabElement = tabElements[activeIndex];
    if (!activeTabElement) return;

    const container = scrollContainerRef.current;
    const tabLeft = activeTabElement.offsetLeft;
    const tabRight = tabLeft + activeTabElement.offsetWidth;
    const containerLeft = container.scrollLeft;
    const containerRight = containerLeft + container.clientWidth;

    if (tabLeft < containerLeft) {
      container.scrollTo({ left: tabLeft - 10, behavior: 'smooth' });
    } else if (tabRight > containerRight) {
      container.scrollTo({ left: tabRight - container.clientWidth + 10, behavior: 'smooth' });
    }
  }, [activeTabId, tabs, getTabId]);

  const getTabClassname = useCallback((tab, index) => {
    const tabId = getTabId(tab);
    return classnames('request-tab select-none', {
      'active': tabId === activeTabId,
      'last-tab': tabs && tabs.length && index === tabs.length - 1,
      'has-overflow': tabOverflowStates[tabId],
      'no-curves': noCurves
    });
  }, [activeTabId, tabs, tabOverflowStates, noCurves, getTabId]);

  const handleTabClick = useCallback((tab) => {
    if (onTabChange) {
      onTabChange(getTabId(tab), tab);
    }
  }, [onTabChange, getTabId]);

  const handleTabClose = useCallback((tabId) => {
    const tab = tabs.find((t) => getTabId(t) === tabId);
    if (onTabClose) {
      onTabClose(tabId, tab);
    }
  }, [onTabClose, tabs, getTabId]);

  const handleTabDoubleClick = useCallback((tabId) => {
    const tab = tabs.find((t) => getTabId(t) === tabId);
    if (onTabDoubleClick) {
      onTabDoubleClick(tabId, tab);
    }
  }, [onTabDoubleClick, tabs, getTabId]);

  const handleMoveTab = useCallback((sourceId, targetId) => {
    if (onTabReorder && sourceId !== targetId) {
      onTabReorder(sourceId, targetId);
    }
  }, [onTabReorder]);

  const leftSlide = useCallback(() => {
    scrollContainerRef.current?.scrollBy({
      left: -120,
      behavior: 'smooth'
    });
  }, []);

  const rightSlide = useCallback(() => {
    scrollContainerRef.current?.scrollBy({
      left: 120,
      behavior: 'smooth'
    });
  }, []);

  const getRootClassname = useCallback(() => {
    return classnames(className, {
      'has-chevrons': showChevrons
    });
  }, [className, showChevrons]);

  const scrollContainerStyle = useMemo(() => {
    if (maxWidth) {
      return { maxWidth };
    }
    return {};
  }, [maxWidth]);

  const renderTabContent = useCallback((tab, index) => {
    const tabId = getTabId(tab);

    if (renderTab) {
      return renderTab({
        tab,
        index,
        tabs,
        isActive: tabId === activeTabId,
        onClose: tab.permanent ? null : handleTabClose,
        onDoubleClick: handleTabDoubleClick,
        getContextMenuItems,
        hasOverflow: tabOverflowStates[tabId],
        setHasOverflow: createSetHasOverflow(tabId)
      });
    }

    return (
      <Tab
        tab={tab}
        index={index}
        tabs={tabs}
        isActive={tabId === activeTabId}
        onClose={tab.permanent ? null : handleTabClose}
        onDoubleClick={handleTabDoubleClick}
        getContextMenuItems={getContextMenuItems}
        hasOverflow={tabOverflowStates[tabId]}
        setHasOverflow={createSetHasOverflow(tabId)}
      />
    );
  }, [
    renderTab,
    activeTabId,
    handleTabClose,
    handleTabDoubleClick,
    getContextMenuItems,
    tabOverflowStates,
    createSetHasOverflow,
    tabs,
    getTabId
  ]);

  const renderTabItem = useCallback((tab, index) => {
    const tabId = getTabId(tab);
    const tabClassName = getTabClassname(tab, index);
    const content = renderTabContent(tab, index);

    if (draggable && !tab.permanent) {
      return (
        <DraggableTab
          key={tabId}
          id={tabId}
          index={index}
          type={dragType}
          onMoveTab={handleMoveTab}
          className={tabClassName}
          onClick={() => handleTabClick(tab)}
        >
          {content}
        </DraggableTab>
      );
    }

    return (
      <li
        key={tabId}
        className={tabClassName}
        onClick={() => handleTabClick(tab)}
        role="tab"
        aria-selected={tabId === activeTabId}
      >
        {content}
      </li>
    );
  }, [getTabClassname, renderTabContent, draggable, dragType, handleMoveTab, handleTabClick, activeTabId, getTabId]);

  if (!tabs.length) {
    return null;
  }

  return (
    <StyledWrapper className={getRootClassname()} data-location={location}>
      <div className="flex items-center pl-2">
        {leftContent}
        <ul role="tablist">
          {showChevrons && (
            <li className="select-none short-tab" onClick={leftSlide}>
              <div className="flex items-center">
                <IconChevronLeft size={18} strokeWidth={1.5} />
              </div>
            </li>
          )}
        </ul>
        <div
          className="tabs-scroll-container"
          style={scrollContainerStyle}
          ref={scrollContainerRef}
        >
          <ul role="tablist" ref={tabsRef}>
            {tabs.map((tab, index) => renderTabItem(tab, index))}
          </ul>
        </div>
        <ul role="tablist">
          {showChevrons && (
            <li className="select-none short-tab" onClick={rightSlide}>
              <div className="flex items-center">
                <IconChevronRight size={18} strokeWidth={1.5} />
              </div>
            </li>
          )}
          {rightContent && (
            <div className="flex items-center cursor-pointer short-tab">
              {rightContent}
            </div>
          )}
        </ul>
      </div>
    </StyledWrapper>
  );
};

export { Tab, DraggableTab };
export default Tabs;
