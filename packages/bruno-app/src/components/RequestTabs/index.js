import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import classnames from 'classnames';
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
import { selectCollectionByUid } from 'src/selectors/collections';
import { selectActiveTab, selectActiveTabUid, makeSelectTabsForCollection } from 'src/selectors/tab';

const RequestTabs = () => {
  const dispatch = useDispatch();
  const tabsRef = useRef();
  const scrollContainerRef = useRef();
  const collectionTabsRef = useRef();
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [tabOverflowStates, setTabOverflowStates] = useState({});
  const [showChevrons, setShowChevrons] = useState(false);
  const activeTabUid = useSelector(selectActiveTabUid);
  const activeTab = useSelector(selectActiveTab);
  // Only the active collection: an edit in any other collection must not
  // re-render the tab strip.
  const activeCollection = useSelector((state) => selectCollectionByUid(state, activeTab?.collectionUid));
  // Memoized on the tabs reference, so the array is stable between tab actions.
  const selectTabsForCollection = useMemo(makeSelectTabsForCollection, []);
  const collectionRequestTabs = useSelector((state) => selectTabsForCollection(state, activeTab?.collectionUid));
  const totalTabsCount = useSelector((state) => state.tabs.tabs.length);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const screenWidth = useSelector((state) => state.app.screenWidth);
  const isScratchCollection = useSelector((state) =>
    activeCollection ? state.workspaces.workspaces.some((w) => w.scratchCollectionUid === activeCollection.uid) : false
  );

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
      'last-tab': totalTabsCount && index === totalTabsCount - 1,
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
