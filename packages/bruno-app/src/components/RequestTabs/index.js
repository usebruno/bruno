import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import find from 'lodash/find';
import filter from 'lodash/filter';
import get from 'lodash/get';
import classnames from 'classnames';
import { normalizePath } from 'utils/common/path';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { focusTab, reorderTabs } from 'providers/ReduxStore/slices/tabs';
import NewRequest from 'components/Sidebar/NewRequest';
import CollectionHeader from './CollectionHeader';
import RequestTab from './RequestTab';
import StyledWrapper from './StyledWrapper';
import DraggableTab from './DraggableTab';
import CreateTransientRequest from 'components/CreateTransientRequest';
import ActionIcon from 'ui/ActionIcon/index';

const RequestTabs = () => {
  const dispatch = useDispatch();
  const tabsRef = useRef();
  const scrollContainerRef = useRef();
  const collectionTabsRef = useRef();
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [tabOverflowStates, setTabOverflowStates] = useState({});
  const [showChevrons, setShowChevrons] = useState(false);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const collections = useSelector((state) => state.collections.collections);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const screenWidth = useSelector((state) => state.app.screenWidth);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const preferences = useSelector((state) => state.app.preferences);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);

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

  const activeTab = find(tabs, (t) => t.uid === activeTabUid);
  const activeCollection = find(collections, (c) => c?.uid === activeTab?.collectionUid);
  const unifiedTabs = get(preferences, 'general.unifiedTabs', false);
  
  const activeWorkspace = find(workspaces, (w) => w.uid === activeWorkspaceUid);
  const workspaceCollectionUids = useMemo(() => {
    if (!activeWorkspace || !unifiedTabs) return [];
    
    const workspaceCollectionPaths = activeWorkspace.collections?.map((wc) => wc.path) || [];
    
    return collections
      .filter((c) => {
        if (c.mountStatus !== 'mounted') return false;
        const isScratch = workspaces.some((w) => w.scratchCollectionUid === c.uid);
        if (isScratch) return false;
        return workspaceCollectionPaths.some((wcPath) => normalizePath(c.pathname) === normalizePath(wcPath));
      })
      .map((c) => c.uid);
  }, [activeWorkspace, collections, workspaces, unifiedTabs]);

  const collectionRequestTabs = useMemo(() => {
    if (unifiedTabs && activeWorkspace) {
      return filter(tabs, (t) => {
        if (t.type === 'workspaceOverview' || t.type === 'workspaceEnvironments') {
          return t.collectionUid === activeWorkspace.scratchCollectionUid;
        }
        return workspaceCollectionUids.includes(t.collectionUid);
      });
    }
    return filter(tabs, (t) => t.collectionUid === activeTab?.collectionUid);
  }, [tabs, activeTab, unifiedTabs, activeWorkspace, workspaceCollectionUids]);

  const isScratchCollection = useMemo(() => {
    return activeCollection ? workspaces.some((w) => w.scratchCollectionUid === activeCollection.uid) : false;
  }, [workspaces, activeCollection]);

  useEffect(() => {
    if (!activeTabUid || !activeTab) return;

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
  }, [activeTabUid, activeTab, collectionRequestTabs.length, screenWidth, leftSidebarWidth, sidebarCollapsed]);

  useEffect(() => {
    const activeTabElement = tabsRef.current?.querySelector('.request-tab.active');
    if (typeof activeTabElement?.scrollIntoView !== 'function') return;

    activeTabElement.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeTabUid]);

  const getTabClassname = (tab, index) => {
    return classnames('request-tab select-none', {
      'active': tab.uid === activeTabUid,
      'last-tab': tabs && tabs.length && index === tabs.length - 1,
      'has-overflow': tabOverflowStates[tab.uid]
    });
  };

  const handleClick = (tab) => {
    dispatch(
      focusTab({
        uid: tab.uid
      })
    );
  };

  if (!activeTabUid) {
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

  // Todo: Must support ephemeral requests
  return (
    <StyledWrapper>
      {newRequestModalOpen && (
        <NewRequest collectionUid={activeCollection?.uid} onClose={() => setNewRequestModalOpen(false)} />
      )}
      {collectionRequestTabs && collectionRequestTabs.length ? (
        <>
          {activeCollection && (
            <CollectionHeader
              collection={activeCollection}
              isScratchCollection={isScratchCollection}
            />
          )}
          <div className="flex items-center gap-2 pl-2" ref={collectionTabsRef}>
            <div className={classnames('scroll-chevrons', { hidden: !showChevrons })}>
              <ActionIcon size="lg" onClick={leftSlide} aria-label="Left Chevron" style={{ marginBottom: '3px' }}>
                <IconChevronLeft size={18} strokeWidth={1.5} />
              </ActionIcon>
            </div>
            {/* Moved to post mvp */}
            {/* <li className="select-none new-tab mr-1" onClick={createNewTab}>
              <div className="flex items-center home-icon-container">
                <IconHome2 size={18} strokeWidth={1.5}/>
              </div>
            </li> */}
            <div className="tabs-scroll-container" style={{ maxWidth: maxTablistWidth }} ref={scrollContainerRef}>
              <ul role="tablist" ref={tabsRef}>
                {collectionRequestTabs && collectionRequestTabs.length
                  ? collectionRequestTabs.map((tab, index) => {
                      const tabCollection = unifiedTabs 
                        ? find(collections, (c) => c.uid === tab.collectionUid) || activeCollection
                        : activeCollection;
                      return (
                        <DraggableTab
                          key={tab.uid}
                          id={tab.uid}
                          index={index}
                          onMoveTab={(source, target) => {
                            dispatch(reorderTabs({
                              sourceUid: source,
                              targetUid: target
                            }));
                          }}
                          className={getTabClassname(tab, index)}
                          active={tab.uid === activeTabUid}
                          onClick={() => handleClick(tab)}
                        >
                          <RequestTab
                            collectionRequestTabs={collectionRequestTabs}
                            tabIndex={index}
                            key={tab.uid}
                            tab={tab}
                            collection={tabCollection}
                            folderUid={tab.folderUid}
                            hasOverflow={tabOverflowStates[tab.uid]}
                            setHasOverflow={createSetHasOverflow(tab.uid)}
                            dropdownContainerRef={collectionTabsRef}
                          />
                        </DraggableTab>
                      );
                    })
                  : null}
              </ul>
            </div>

            {activeCollection && (
              <CreateTransientRequest collectionUid={activeCollection.uid} />
            )}

            <div className={classnames('scroll-chevrons', { hidden: !showChevrons })}>
              <ActionIcon size="lg" onClick={rightSlide} aria-label="Right Chevron" style={{ marginBottom: '3px' }}>
                <IconChevronRight size={18} strokeWidth={1.5} />
              </ActionIcon>
            </div>
            {/* Moved to post mvp */}
            {/* <li className="select-none new-tab choose-request">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  </svg>
                </div>
              </li> */}
          </div>
        </>
      ) : null}
    </StyledWrapper>
  );
};

export default RequestTabs;
