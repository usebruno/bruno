import React, { useRef, useMemo, useEffect } from 'react';
import get from 'lodash/get';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import {
  openNewRequestModal, openCollectionCloneItemModal, toggleConfirmRequestCloseModal,
  toggleConfirmCollectionCloseModal, toggleConfirmFolderCloseModal, toggleConfirmGlobalEnvironmentCloseModal,
  toggleConfirmEnvironmentCloseModal
} from 'providers/ReduxStore/slices/keyBindings';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import { findCollectionByUid, findItemInCollection, hasExampleChanges, hasRequestChanges } from 'utils/collections/index';
import RequestTabNotFound from './RequestTabNotFound';
import SpecialTab from './SpecialTab';
import StyledWrapper from './StyledWrapper';
import MenuDropdown from 'ui/MenuDropdown';
import GradientCloseButton from './GradientCloseButton';
import { flattenItems } from 'utils/collections/index';
import { closeWsConnection } from 'utils/network/index';
import ExampleTab from '../ExampleTab';
import store from 'providers/ReduxStore/index';

const RequestTab = ({ tab, collection, tabIndex, collectionRequestTabs, folderUid, hasOverflow, setHasOverflow, dropdownContainerRef }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const tabNameRef = useRef(null);
  const tabLabelRef = useRef(null);
  const lastOverflowStateRef = useRef(null);

  const menuDropdownRef = useRef();

  const item = findItemInCollection(collection, tab.uid);

  const method = useMemo(() => {
    if (!item) return;
    switch (item.type) {
      case 'grpc-request':
        return 'gRPC';
      case 'ws-request':
        return 'WS';
      case 'graphql-request':
        return 'GQL';
      default:
        return item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
    }
  }, [item]);

  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  const isWS = item?.type === 'ws-request';

  useEffect(() => {
    if (!item || !tabNameRef.current || !setHasOverflow) return;

    const checkOverflow = () => {
      if (tabNameRef.current && setHasOverflow) {
        const hasOverflow = tabNameRef.current.scrollWidth > tabNameRef.current.clientWidth;
        if (lastOverflowStateRef.current !== hasOverflow) {
          lastOverflowStateRef.current = hasOverflow;
          setHasOverflow(hasOverflow);
        }
      }
    };

    const timeoutId = setTimeout(checkOverflow, 0);
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (tabNameRef.current) {
      resizeObserver.observe(tabNameRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [item, item?.name, method, setHasOverflow]);

  const handleCloseClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch(
      closeTabs({
        tabUids: [tab.uid]
      })
    );
  };

  const handleRightClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    menuDropdownRef.current?.show();
  };

  const handleMouseUp = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();

      // Close the tab
      dispatch(
        closeTabs({
          tabUids: [tab.uid]
        })
      );
    }
  };

  const getMethodColor = (method = '') => {
    const colorMap = {
      ...theme.request.methods,
      ...theme.request
    };
    return colorMap[method.toLocaleLowerCase()];
  };

  const handleCloseCollectionSettings = (event) => {
    if (!collection.draft) {
      return handleCloseClick(event);
    }

    event.stopPropagation();
    event.preventDefault();
    dispatch(toggleConfirmCollectionCloseModal({ show: true, item, tab, collection }));
  };

  const folder = folderUid ? findItemInCollection(collection, folderUid) : null;

  const handleCloseFolderSettings = (event) => {
    if (!folder?.draft) {
      return handleCloseClick(event);
    }

    event.stopPropagation();
    event.preventDefault();
    dispatch(toggleConfirmFolderCloseModal({ show: true, item: item, tab: tab, collection: collection, folder: folder }));
  };

  const hasDraft = tab.type === 'collection-settings' && collection?.draft;
  const hasFolderDraft = tab.type === 'folder-settings' && folder?.draft;
  const hasEnvironmentDraft = tab.type === 'environment-settings' && collection?.environmentsDraft;
  const globalEnvironmentDraft = useSelector((state) => state.globalEnvironments.globalEnvironmentDraft);
  const hasGlobalEnvironmentDraft = tab.type === 'global-environment-settings' && globalEnvironmentDraft;

  const handleCloseEnvironmentSettings = (event) => {
    if (!collection?.environmentsDraft) {
      return handleCloseClick(event);
    }

    event.stopPropagation();
    event.preventDefault();
    dispatch(toggleConfirmEnvironmentCloseModal({ show: true, globalEnvDraft: globalEnvironmentDraft, tab, collection: collection }));
  };

  const handleCloseGlobalEnvironmentSettings = (event) => {
    if (!globalEnvironmentDraft) {
      return handleCloseClick(event);
    }

    event.stopPropagation();
    event.preventDefault();
    dispatch(toggleConfirmGlobalEnvironmentCloseModal({ show: true, globalEnvDraft: globalEnvironmentDraft, tab }));
  };

  if (['collection-settings', 'collection-overview', 'folder-settings', 'variables', 'collection-runner', 'environment-settings', 'global-environment-settings', 'preferences'].includes(tab.type)) {
    return (
      <StyledWrapper
        className={`flex items-center justify-between tab-container px-2 ${tab.preview ? 'italic' : ''}`}
        onMouseUp={handleMouseUp}
      >
        {tab.type === 'folder-settings' && !folder ? (
          <RequestTabNotFound handleCloseClick={handleCloseClick} />
        ) : tab.type === 'folder-settings' ? (
          <SpecialTab handleCloseClick={handleCloseFolderSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} tabName={folder?.name} hasDraft={hasFolderDraft} />
        ) : tab.type === 'collection-settings' ? (
          <SpecialTab handleCloseClick={handleCloseCollectionSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} tabName={collection?.name} hasDraft={hasDraft} />
        ) : tab.type === 'environment-settings' ? (
          <SpecialTab handleCloseClick={handleCloseEnvironmentSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} hasDraft={hasEnvironmentDraft} />
        ) : tab.type === 'global-environment-settings' ? (
          <SpecialTab handleCloseClick={handleCloseGlobalEnvironmentSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} hasDraft={hasGlobalEnvironmentDraft} />
        ) : (
          <SpecialTab handleCloseClick={handleCloseClick} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} />
        )}
      </StyledWrapper>
    );
  }

  // Handle response-example tabs specially
  if (tab.type === 'response-example') {
    return (
      <ExampleTab
        tab={tab}
        collection={collection}
        tabIndex={tabIndex}
        collectionRequestTabs={collectionRequestTabs}
        folderUid={folderUid}
      />
    );
  }

  if (!item) {
    return (
      <StyledWrapper
        className="flex items-center justify-between tab-container"
        onMouseUp={(e) => {
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            dispatch(closeTabs({ tabUids: [tab.uid] }));
          }
        }}
      >
        <RequestTabNotFound handleCloseClick={handleCloseClick} />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="flex items-center justify-between tab-container px-2">
      <div
        ref={tabLabelRef}
        className={`flex items-baseline tab-label ${tab.preview ? 'italic' : ''}`}
        onContextMenu={handleRightClick}
        onDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))}
        onMouseUp={(e) => {
          if (!hasChanges) return handleMouseUp(e);

          if (e.button === 1) {
            e.stopPropagation();
            e.preventDefault();
            dispatch(toggleConfirmRequestCloseModal({ show: true, entity: 'request', example: null, item, tab, collection }));
          }
        }}
      >
        <span className="tab-method uppercase" style={{ color: getMethodColor(method) }}>
          {method}
        </span>
        <span ref={tabNameRef} className="ml-1 tab-name" title={item.name}>
          {item.name}
        </span>
        <RequestTabMenu
          menuDropdownRef={menuDropdownRef}
          tabLabelRef={tabLabelRef}
          tabIndex={tabIndex}
          collectionRequestTabs={collectionRequestTabs}
          collection={collection}
          dropdownContainerRef={dropdownContainerRef}
        />
      </div>
      <GradientCloseButton
        hasChanges={hasChanges}
        onClick={(e) => {
          if (!hasChanges) {
            isWS && closeWsConnection(item.uid);
            return handleCloseClick(e);
          }

          e.stopPropagation();
          e.preventDefault();
          dispatch(toggleConfirmRequestCloseModal({ show: true, entity: 'request', example: null, item, tab, collection }));
        }}
      />
    </StyledWrapper>
  );
};

function RequestTabMenu({ menuDropdownRef, tabLabelRef, collectionRequestTabs, tabIndex, collection, dropdownContainerRef }) {
  const { dispatch, getState } = store;

  // Returns the tab-label's position for dropdown positioning.
  // Returns zero-sized rect if element isn't mounted yet (prevents Tippy errors).
  const getTabLabelRect = () => {
    if (!tabLabelRef.current) {
      return { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 };
    }
    return tabLabelRef.current.getBoundingClientRect();
  };

  const totalTabs = collectionRequestTabs.length || 0;
  const currentTabUid = collectionRequestTabs[tabIndex]?.uid;
  const currentTabItem = findItemInCollection(collection, currentTabUid);

  const hasLeftTabs = tabIndex !== 0;
  const hasRightTabs = totalTabs > tabIndex + 1;
  const hasOtherTabs = totalTabs > 1;
  const state = getState();

  async function handleCloseTab(tabUid) {
    if (!tabUid) {
      return;
    }
    try {
      const state = getState();

      const tabs = state.tabs.tabs;
      const activeTabUid = state.tabs.activeTabUid;
      const activeTab = tabs.find((t) => t.uid === tabUid);
      /**
       *  Handling Closing Tab only for request and response-example from the menu items as their is missing UX for Colleciton/Folder/Env (settings)
       */
      if (activeTab && ['request', 'response-example'].includes(activeTab.type)) {
        if (activeTab?.type === 'request') {
          const collections = state.collections.collections;
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          const item = collection ? findItemInCollection(collection, activeTab.uid) : null;

          if (item && hasRequestChanges(item)) {
            dispatch(toggleConfirmRequestCloseModal({ show: true, entity: 'request', example: null, item: item, tab: activeTab, collection: collection }));
          }
          if (activeTabUid) dispatch(closeTabs({ tabUids: [activeTabUid] }));
        } else if (activeTab?.type === 'response-example') {
          const collections = state.collections.collections;
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          const item = collection ? findItemInCollection(collection, activeTab.itemUid) : null;
          const example = item?.examples?.find((ex) => ex.uid === activeTab.exampleUid);
          if (item && hasExampleChanges(item, activeTab.uid)) {
            dispatch(toggleConfirmRequestCloseModal({ show: true, entity: 'example', example: example, item: item, tab: activeTab, collection: collection }));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to close tab : ', err);
    }
  }

  function handleRevertChanges() {
    if (!currentTabUid) {
      return;
    }

    try {
      const item = findItemInCollection(collection, currentTabUid);
      if (item.draft) {
        dispatch(deleteRequestDraft({
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      }
    } catch (err) { }
  }

  async function handleCloseOtherTabs() {
    const tabs = state.tabs.tabs;
    const otherTabs = tabs.filter((_, index) => index !== tabIndex);
    await Promise.all(otherTabs.map((tab) => handleCloseTab(tab.uid)));
  }

  async function handleCloseTabsToTheLeft() {
    const tabs = state.tabs.tabs;
    const leftTabs = tabs.filter((_, index) => index < tabIndex);
    await Promise.all(leftTabs.map((tab) => handleCloseTab(tab.uid)));
  }

  async function handleCloseTabsToTheRight() {
    const tabs = state.tabs.tabs;
    const rightTabs = tabs.filter((_, index) => index > tabIndex);
    await Promise.all(rightTabs.map((tab) => handleCloseTab(tab.uid)));
  }

  function handleCloseSavedTabs() {
    const items = flattenItems(collection?.items);
    const savedTabs = items?.filter?.((item) => !hasRequestChanges(item));
    const savedTabIds = savedTabs?.map((item) => item.uid) || [];
    dispatch(closeTabs({ tabUids: savedTabIds }));
  }

  async function handleCloseAllTabs() {
    const tabs = state.tabs.tabs;
    await Promise.all(tabs.map((tab) => handleCloseTab(tab.uid)));
  }

  const menuItems = useMemo(() => [
    {
      id: 'new-request',
      label: 'New Request',
      onClick: () => {
        dispatch(openNewRequestModal({ collectionUid: collection.uid }));
      }
    },
    {
      id: 'clone-request',
      label: 'Clone Request 33',
      onClick: () => {
        dispatch(openCollectionCloneItemModal({ item: currentTabItem, collectionUid: collection.uid }));
      }
    },
    {
      id: 'revert-changes',
      label: 'Revert Changes',
      onClick: handleRevertChanges,
      disabled: !currentTabItem?.draft
    },
    {
      id: 'close',
      label: 'Close',
      onClick: () => { handleCloseTab(currentTabUid); }
    },
    {
      id: 'close-others',
      label: 'Close Others',
      onClick: handleCloseOtherTabs,
      disabled: !hasOtherTabs
    },
    {
      id: 'close-left',
      label: 'Close to the Left',
      onClick: handleCloseTabsToTheLeft,
      disabled: !hasLeftTabs
    },
    {
      id: 'close-right',
      label: 'Close to the Right',
      onClick: handleCloseTabsToTheRight,
      disabled: !hasRightTabs
    },
    {
      id: 'close-saved',
      label: 'Close Saved',
      onClick: handleCloseSavedTabs
    },
    {
      id: 'close-all',
      label: 'Close All',
      onClick: handleCloseAllTabs
    }
  ], [currentTabUid, currentTabItem, hasOtherTabs, hasLeftTabs, hasRightTabs, collection, collectionRequestTabs, tabIndex, dispatch]);

  const menuDropdown = (
    <MenuDropdown
      ref={menuDropdownRef}
      items={menuItems}
      placement="bottom-start"
      appendTo={dropdownContainerRef?.current || document.body}
      getReferenceClientRect={getTabLabelRect}
    >
      <span></span>
    </MenuDropdown>
  );

  return (
    <>
      {menuDropdown}
    </>
  );
}

export default RequestTab;
