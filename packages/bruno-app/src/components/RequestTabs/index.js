import React, { useState, useRef, useEffect, useCallback } from 'react';
import find from 'lodash/find';
import filter from 'lodash/filter';
import classnames from 'classnames';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { focusTab, reorderTabs } from 'providers/ReduxStore/slices/tabs';
import NewRequest from 'components/Sidebar/NewRequest';
import CollectionToolBar from './CollectionToolBar';
import RequestTab from './RequestTab';
import StyledWrapper from './StyledWrapper';
import DraggableTab from './DraggableTab';
import CreateUntitledRequest from 'components/CreateUntitledRequest';
import { IconPlus } from '@tabler/icons';
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
  const collectionRequestTabs = filter(tabs, (t) => t.collectionUid === activeTab?.collectionUid);

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
          {activeCollection && <CollectionToolBar collection={activeCollection} />}
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
                          onClick={() => handleClick(tab)}
                        >
                          <RequestTab
                            collectionRequestTabs={collectionRequestTabs}
                            tabIndex={index}
                            key={tab.uid}
                            tab={tab}
                            collection={activeCollection}
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
              <ActionIcon onClick={() => setNewRequestModalOpen(true)} aria-label="New Request" size="lg" style={{ marginBottom: '3px' }}>
                <IconPlus
                  size={18}
                  strokeWidth={1.5}
                />
              </ActionIcon>
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
