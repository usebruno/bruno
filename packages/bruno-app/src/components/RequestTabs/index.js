import React, { useCallback, useMemo } from 'react';
import find from 'lodash/find';
import filter from 'lodash/filter';
import { useSelector, useDispatch } from 'react-redux';
import {
  focusTab,
  reorderTabs,
  selectTabsForLocation,
  selectActiveTabIdForLocation
} from 'providers/ReduxStore/slices/tabs';
import CollectionToolBar from './CollectionToolBar';
import RequestTab from './RequestTab';
import StyledWrapper from './StyledWrapper';
import Tabs from 'components/Tabs';
import CreateUntitledRequest from 'components/CreateUntitledRequest';

const LOCATION = 'request-pane';

const RequestTabs = () => {
  const dispatch = useDispatch();
  const tabs = useSelector(selectTabsForLocation(LOCATION));
  const activeTabUid = useSelector(selectActiveTabIdForLocation(LOCATION));
  const collections = useSelector((state) => state.collections.collections);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const screenWidth = useSelector((state) => state.app.screenWidth);

  const activeTab = find(tabs, (t) => t.uid === activeTabUid);
  const activeCollection = find(collections, (c) => c.uid === activeTab?.collectionUid);
  const collectionRequestTabs = useMemo(
    () => filter(tabs, (t) => t.collectionUid === activeTab?.collectionUid),
    [tabs, activeTab?.collectionUid]
  );

  const handleTabChange = useCallback((tabId) => {
    dispatch(focusTab({ uid: tabId, location: LOCATION }));
  }, [dispatch]);

  const handleTabReorder = useCallback((sourceUid, targetUid) => {
    dispatch(reorderTabs({ sourceUid, targetUid, location: LOCATION }));
  }, [dispatch]);

  const renderTab = useCallback(({ tab, index, tabs: allTabs, isActive, onClose, onDoubleClick, hasOverflow, setHasOverflow }) => {
    return (
      <RequestTab
        collectionRequestTabs={collectionRequestTabs}
        tabIndex={index}
        tab={tab}
        collection={activeCollection}
        folderUid={tab.folderUid}
        hasOverflow={hasOverflow}
        setHasOverflow={setHasOverflow}
      />
    );
  }, [collectionRequestTabs, activeCollection]);

  if (!activeTabUid || !activeTab) {
    return null;
  }

  const effectiveSidebarWidth = sidebarCollapsed ? 0 : leftSidebarWidth;
  const maxTablistWidth = screenWidth - effectiveSidebarWidth - 150;

  const rightContent = activeCollection ? (
    <CreateUntitledRequest
      collectionUid={activeCollection.uid}
      itemUid={null}
      placement="bottom-start"
    />
  ) : null;

  return (
    <StyledWrapper>
      {collectionRequestTabs && collectionRequestTabs.length ? (
        <>
          <CollectionToolBar collection={activeCollection} />
          <Tabs
            tabs={collectionRequestTabs}
            activeTabId={activeTabUid}
            onTabChange={handleTabChange}
            onTabReorder={handleTabReorder}
            renderTab={renderTab}
            maxWidth={maxTablistWidth}
            showScrollButtons={true}
            draggable={true}
            dragType="request-tab"
            rightContent={rightContent}
            location={LOCATION}
          />
        </>
      ) : null}
    </StyledWrapper>
  );
};

export default RequestTabs;
