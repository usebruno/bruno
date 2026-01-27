import React, { useState, useRef, useEffect, useCallback } from 'react';
import filter from 'lodash/filter';
import classnames from 'classnames';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { focusWorkspaceTab, initializeWorkspaceTabs } from 'providers/ReduxStore/slices/workspaceTabs';
import WorkspaceTab from './WorkspaceTab';
import StyledWrapper from './StyledWrapper';

const PERMANENT_TABS = [
  { type: 'overview', label: 'Overview' },
  { type: 'environments', label: 'Global Environments' }
];

const WorkspaceTabs = ({ workspaceUid }) => {
  const dispatch = useDispatch();
  const tabsRef = useRef();
  const scrollContainerRef = useRef();
  const [tabOverflowStates, setTabOverflowStates] = useState({});
  const [showChevrons, setShowChevrons] = useState(false);

  const tabs = useSelector((state) => state.workspaceTabs.tabs);
  const activeTabUid = useSelector((state) => state.workspaceTabs.activeTabUid);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const screenWidth = useSelector((state) => state.app.screenWidth);

  // Initialize permanent tabs for this workspace
  useEffect(() => {
    if (workspaceUid) {
      dispatch(initializeWorkspaceTabs({
        workspaceUid,
        permanentTabs: PERMANENT_TABS
      }));
    }
  }, [workspaceUid, dispatch]);

  const createSetHasOverflow = useCallback((tabUid) => {
    return (hasOverflow) => {
      setTabOverflowStates((prev) => {
        if (prev[tabUid] === hasOverflow) {
          return prev;
        }
        return {
          ...prev,
          [tabUid]: hasOverflow
        };
      });
    };
  }, []);

  // Filter tabs for this workspace
  const workspaceTabs = filter(tabs, (t) => t.workspaceUid === workspaceUid);

  useEffect(() => {
    if (!activeTabUid) return;

    const checkOverflow = () => {
      if (tabsRef.current && scrollContainerRef.current) {
        const hasOverflow = tabsRef.current.scrollWidth > scrollContainerRef.current.clientWidth + 1;
        setShowChevrons(hasOverflow);
      }
    };

    checkOverflow();
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [activeTabUid, workspaceTabs.length, screenWidth, leftSidebarWidth, sidebarCollapsed]);

  const getTabClassname = (tab, index) => {
    return classnames('request-tab select-none', {
      'active': tab.uid === activeTabUid,
      'permanent-tab': tab.permanent,
      'last-tab': workspaceTabs && workspaceTabs.length && index === workspaceTabs.length - 1,
      'has-overflow': tabOverflowStates[tab.uid]
    });
  };

  const handleClick = (tab) => {
    dispatch(focusWorkspaceTab({ uid: tab.uid }));
  };

  if (!workspaceUid || workspaceTabs.length === 0) {
    return null;
  }

  const effectiveSidebarWidth = sidebarCollapsed ? 0 : leftSidebarWidth;
  const maxTablistWidth = screenWidth - effectiveSidebarWidth - 150;

  const leftSlide = () => {
    scrollContainerRef.current?.scrollBy({
      left: -120,
      behavior: 'smooth'
    });
  };

  const rightSlide = () => {
    scrollContainerRef.current?.scrollBy({
      left: 120,
      behavior: 'smooth'
    });
  };

  const getRootClassname = () => {
    return classnames({
      'has-chevrons': showChevrons
    });
  };

  return (
    <StyledWrapper className={getRootClassname()}>
      <div className="flex items-center pl-2">
        <ul role="tablist">
          {showChevrons ? (
            <li className="select-none short-tab" onClick={leftSlide}>
              <div className="flex items-center">
                <IconChevronLeft size={18} strokeWidth={1.5} />
              </div>
            </li>
          ) : null}
        </ul>
        <div className="tabs-scroll-container" style={{ maxWidth: maxTablistWidth }} ref={scrollContainerRef}>
          <ul role="tablist" ref={tabsRef}>
            {workspaceTabs.map((tab, index) => (
              <li
                key={tab.uid}
                className={getTabClassname(tab, index)}
                onClick={() => handleClick(tab)}
              >
                <WorkspaceTab
                  tab={tab}
                  isActive={tab.uid === activeTabUid}
                  hasOverflow={tabOverflowStates[tab.uid]}
                  setHasOverflow={createSetHasOverflow(tab.uid)}
                />
              </li>
            ))}
          </ul>
        </div>
        <ul role="tablist">
          {showChevrons ? (
            <li className="select-none short-tab" onClick={rightSlide}>
              <div className="flex items-center">
                <IconChevronRight size={18} strokeWidth={1.5} />
              </div>
            </li>
          ) : null}
        </ul>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceTabs;
