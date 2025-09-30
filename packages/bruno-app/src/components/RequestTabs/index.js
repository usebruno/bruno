import React, { useState, useRef } from 'react';
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

const RequestTabs = () => {
  const dispatch = useDispatch();
  const tabsRef = useRef();
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [draggedTabUid, setDraggedTabUid] = useState(null);
  const [dragOverTabUid, setDragOverTabUid] = useState(null);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const collections = useSelector((state) => state.collections.collections);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const screenWidth = useSelector((state) => state.app.screenWidth);

  const getTabClassname = (tab, index) => {
    return classnames('request-tab select-none', {
      active: tab.uid === activeTabUid,
      'last-tab': tabs && tabs.length && index === tabs.length - 1,
      'dragged': tab.uid === draggedTabUid,
      'drag-over': tab.uid === dragOverTabUid && draggedTabUid !== null
    });
  };

  const handleDragStart = (e, tab) => {
    setDraggedTabUid(tab.uid);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.uid);
  };

  const handleDragOver = (e, tab) => {
    e.preventDefault();
    setDragOverTabUid(tab.uid);
  };

  const handleDrop = (e, targetTab) => {
    e.preventDefault();
    setDragOverTabUid(null);
    const sourceUid = draggedTabUid;
    setDraggedTabUid(null);
    if (!sourceUid || sourceUid === targetTab.uid) {
      return;
    }
    dispatch(reorderTabs({
        sourceUid,
        targetUid: targetTab.uid
    }));
  };

  const handleDragEnd = () => {
    setDraggedTabUid(null);
    setDragOverTabUid(null);
  };

  const handleClick = (tab) => {
    dispatch(
      focusTab({
        uid: tab.uid
      })
    );
  };

  const createNewTab = () => setNewRequestModalOpen(true);

  if (!activeTabUid) {
    return null;
  }

  const activeTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!activeTab) {
    return <StyledWrapper>Something went wrong!</StyledWrapper>;
  }

  const activeCollection = find(collections, (c) => c.uid === activeTab.collectionUid);
  const collectionRequestTabs = filter(tabs, (t) => t.collectionUid === activeTab.collectionUid);

  const effectiveSidebarWidth = sidebarCollapsed ? 0 : leftSidebarWidth;
  const maxTablistWidth = screenWidth - effectiveSidebarWidth - 150;
  const tabsWidth = collectionRequestTabs.length * 150 + 34; // 34: (+)icon
  const showChevrons = maxTablistWidth < tabsWidth;

  const leftSlide = () => {
    tabsRef.current.scrollBy({
      left: -120,
      behavior: 'smooth'
    });
  };

  // todo: bring new tab to focus if its not in focus
  // tabsRef.current.scrollLeft

  const rightSlide = () => {
    tabsRef.current.scrollBy({
      left: 120,
      behavior: 'smooth'
    });
  };

  const getRootClassname = () => {
    return classnames({
      'has-chevrons': showChevrons
    });
  };
  // Todo: Must support ephemeral requests
  return (
    <StyledWrapper className={getRootClassname()}>
      {newRequestModalOpen && (
        <NewRequest collectionUid={activeCollection?.uid} onClose={() => setNewRequestModalOpen(false)} />
      )}
      {collectionRequestTabs && collectionRequestTabs.length ? (
        <>
          <CollectionToolBar collection={activeCollection} />
          <div className="flex items-center pl-4">
            <ul role="tablist">
              {showChevrons ? (
                <li className="select-none short-tab" onClick={leftSlide}>
                  <div className="flex items-center">
                    <IconChevronLeft size={18} strokeWidth={1.5} />
                  </div>
                </li>
              ) : null}
              {/* Moved to post mvp */}
              {/* <li className="select-none new-tab mr-1" onClick={createNewTab}>
                <div className="flex items-center home-icon-container">
                  <IconHome2 size={18} strokeWidth={1.5}/>
                </div>
              </li> */}
            </ul>
            <ul role="tablist" style={{ maxWidth: maxTablistWidth }} ref={tabsRef}>
              {collectionRequestTabs && collectionRequestTabs.length
                ? collectionRequestTabs.map((tab, index) => {
                    return (
                      <li
                        key={tab.uid}
                        className={getTabClassname(tab, index)}
                        role="tab"
                        onClick={() => handleClick(tab)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, tab)}
                        onDragOver={(e) => handleDragOver(e, tab)}
                        onDrop={(e) => handleDrop(e, tab)}
                        onDragEnd={() => handleDragEnd}
                      >
                        <RequestTab
                          collectionRequestTabs={collectionRequestTabs}
                          tabIndex={index}
                          key={tab.uid}
                          tab={tab}
                          collection={activeCollection}
                          folderUid={tab.folderUid}
                        />
                      </li>
                    );
                  })
                : null}
            </ul>

            <ul role="tablist">
              {showChevrons ? (
                <li className="select-none short-tab" onClick={rightSlide}>
                  <div className="flex items-center">
                    <IconChevronRight size={18} strokeWidth={1.5} />
                  </div>
                </li>
              ) : null}
              <li className="select-none short-tab" id="create-new-tab" onClick={createNewTab}>
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                  </svg>
                </div>
              </li>
              {/* Moved to post mvp */}
              {/* <li className="select-none new-tab choose-request">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  </svg>
                </div>
              </li> */}
            </ul>
          </div>
        </>
      ) : null}
    </StyledWrapper>
  );
};

export default RequestTabs;
