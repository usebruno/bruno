import React, { useState, useRef, Fragment } from 'react';
import get from 'lodash/get';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import SaveRequestsModal  from 'components/SaveRequestsModal';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import darkTheme from 'themes/dark';
import lightTheme from 'themes/light';
import { findItemInCollection } from 'utils/collections';
import RequestTabNotFound from './RequestTabNotFound';
import SpecialTab from './SpecialTab';
import StyledWrapper from './StyledWrapper';
import Dropdown from 'components/Dropdown';
import CloneCollectionItem from 'components/Sidebar/Collections/Collection/CollectionItem/CloneCollectionItem/index';
import NewRequest from 'components/Sidebar/NewRequest/index';
import CloseTabIcon from './CloseTabIcon';
import DraftTabIcon from './DraftTabIcon';
import { flattenItems } from 'utils/collections/index';

const RequestTab = ({ tab, collection, tabIndex, collectionRequestTabs, folderUid }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [tabsUidsToClose, setTabsUidsToClose] = useState([]);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const handleCloseClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch(
      closeTabs({
        tabUids: [tab.uid]
      })
    );
  };

  const handleRightClick = (_event) => {
    const menuDropdown = dropdownTippyRef.current;
    if (!menuDropdown) {
      return;
    }

    if (menuDropdown.state.isShown) {
      menuDropdown.hide();
    } else {
      menuDropdown.show();
    }
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
    const theme = storedTheme === 'dark' ? darkTheme : lightTheme;
    return theme.request.methods[method.toLocaleLowerCase()];
  };

  const showSaveModalForCurrentTab = () => {
    setTabsUidsToClose([tab.uid]);
  }

  const hideSaveModal = () => {
    setTabsUidsToClose([]);
  }

  const handleCloseTabs = tabUids => {
    const pendingSaveCount = tabUids.map(tabUid => findItemInCollection(collection, tabUid)).filter(item => item && item.draft).length;
    if (pendingSaveCount === 0) return dispatch(closeTabs({ tabUids }));
    setTabsUidsToClose(tabUids);
  }

  const folder = folderUid ? findItemInCollection(collection, folderUid) : null;
  if (['collection-settings', 'collection-overview', 'folder-settings', 'variables', 'collection-runner', 'security-settings'].includes(tab.type)) {
    return (
      <StyledWrapper
        className={`flex items-center justify-between tab-container px-1 ${tab.preview ? "italic" : ""}`}
        onMouseUp={handleMouseUp} // Add middle-click behavior here
      >
        {tab.type === 'folder-settings' && !folder ? (
          <RequestTabNotFound handleCloseClick={handleCloseClick} />
        ) : tab.type === 'folder-settings' ? (
          <SpecialTab handleCloseClick={handleCloseClick} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} tabName={folder?.name} />
        ) : (
          <SpecialTab handleCloseClick={handleCloseClick} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} />
        )}
      </StyledWrapper>
    );
  }

  const item = findItemInCollection(collection, tab.uid);

  if (!item) {
    return (
      <StyledWrapper
        className="flex items-center justify-between tab-container px-1"
        onMouseUp={handleMouseUp}
      >
        <RequestTabNotFound handleCloseClick={handleCloseClick} />
      </StyledWrapper>
    );
  }

  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');

  return (
    <>
      {tabsUidsToClose.length > 0 && (
        <SaveModal tabsUidsToClose={tabsUidsToClose} collection={collection} onCloseModal={hideSaveModal} />
      )}
      <StyledWrapper className="flex items-center justify-between tab-container px-1">
        <div
          className={`flex items-baseline tab-label pl-2 ${tab.preview ? "italic" : ""}`}
          onContextMenu={handleRightClick}
          onDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))}
          onMouseUp={(e) => {
            if (!item.draft) return handleMouseUp(e);

            if (e.button === 1) {
              e.stopPropagation();
              e.preventDefault();
              showSaveModalForCurrentTab();
            }
          }}
        >
          <span className="tab-method uppercase" style={{ color: getMethodColor(method), fontSize: 12 }}>
            {method}
          </span>
          <span className="ml-1 tab-name" title={item.name}>
            {item.name}
          </span>
          <RequestTabMenu
            onDropdownCreate={onDropdownCreate}
            onCloseTabs={handleCloseTabs}
            tabIndex={tabIndex}
            collectionRequestTabs={collectionRequestTabs}
            tabItem={item}
            collection={collection}
            dropdownTippyRef={dropdownTippyRef}
            dispatch={dispatch}
          />
        </div>
        <div
          className="flex px-2 close-icon-container"
          onClick={(e) => {
            if (!item.draft) return handleCloseClick(e);

            e.stopPropagation();
            e.preventDefault();
            showSaveModalForCurrentTab();
          }}
        >
          {!item.draft ? (
            <CloseTabIcon />
          ) : (
            <DraftTabIcon />
          )}
        </div>
      </StyledWrapper>
    </>
  );
};

function SaveModal ({ tabsUidsToClose, collection, onCloseModal }) {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const tabUids = tabs.map(tab => tab.uid);
  
  const handleCloseTabs = () => {
    return dispatch(closeTabs({ tabUids: tabsUidsToClose }));
  }

  const handleCloseWithoutSave = async discardedItems => {
    await Promise.all(discardedItems.map(item => {
      dispatch(
        deleteRequestDraft({
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    }));
    handleCloseTabs();
    onCloseModal();
  }

  const handleSaveAndClose = async () => {
    handleCloseTabs();
    onCloseModal();
  }

  if (!tabsUidsToClose.some(tabUid => tabUids.includes(tabUid))) return null;
  
  const itemsPendingSave = tabsUidsToClose.reduce((acc, tabUid) => {
    const item = findItemInCollection(collection, tabUid);
    if (item && item.draft) acc.push({ ...item, collectionUid: collection.uid });
    return acc;
  }, []);

  if (!itemsPendingSave.length) return null;

  return (
    <SaveRequestsModal items={itemsPendingSave} 
      onCancel={onCloseModal}
      onCloseWithoutSave={handleCloseWithoutSave}
      onSaveAndClose={handleSaveAndClose} />
  );
}

function RequestTabMenu({ onDropdownCreate, onCloseTabs, collectionRequestTabs, tabIndex, collection, dropdownTippyRef, dispatch }) {
  const [showCloneRequestModal, setShowCloneRequestModal] = useState(false);
  const [showAddNewRequestModal, setShowAddNewRequestModal] = useState(false);

  const totalTabs = collectionRequestTabs.length || 0;
  const currentTabUid = collectionRequestTabs[tabIndex]?.uid;
  const currentTabItem = findItemInCollection(collection, currentTabUid);

  const hasLeftTabs = tabIndex !== 0;
  const hasRightTabs = totalTabs > tabIndex + 1;
  const hasOtherTabs = totalTabs > 1;
  const hasSavedTabs = collectionRequestTabs.map((tab) => findItemInCollection(collection, tab.uid)).some((item) => item && !item.draft);

  function handleCurrentTabClose(event, tabUid) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

    if (!tabUid) {
      return;
    }

    return onCloseTabs([tabUid]);
  }

  function handleCloseOtherTabs(event) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

    const otherTabs = collectionRequestTabs.filter((_, index) => index !== tabIndex);
    onCloseTabs(otherTabs.map((tab) => tab.uid));
  }

  function handleCloseTabsToTheLeft(event) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

    const leftTabs = collectionRequestTabs.filter((_, index) => index < tabIndex);
    onCloseTabs(leftTabs.map((tab) => tab.uid));
  }

  function handleCloseTabsToTheRight(event) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

    const rightTabs = collectionRequestTabs.filter((_, index) => index > tabIndex);
    onCloseTabs(rightTabs.map((tab) => tab.uid));
  }

  function handleCloseSavedTabs(event) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

    const items = flattenItems(collection?.items);
    const savedTabs = items?.filter?.((item) => !item.draft);
    const savedTabIds = savedTabs?.map((item) => item.uid) || [];
    onCloseTabs(savedTabIds);
  }

  function handleCloseAllTabs(event) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();
    onCloseTabs(collectionRequestTabs.map((tab) => tab.uid));
  }

  return (
    <Fragment>
      {showAddNewRequestModal && (
        <NewRequest collectionUid={collection.uid} onClose={() => setShowAddNewRequestModal(false)} />
      )}

      {showCloneRequestModal && (
        <CloneCollectionItem
          item={currentTabItem}
          collectionUid={collection.uid}
          onClose={() => setShowCloneRequestModal(false)}
        />
      )}

      <Dropdown onCreate={onDropdownCreate} icon={<span></span>} placement="bottom-start">
        <button
          className="dropdown-item w-full"
          onClick={() => {
            dropdownTippyRef.current.hide();
            setShowAddNewRequestModal(true);
          }}
        >
          New Request
        </button>
        <button
          className="dropdown-item w-full"
          onClick={() => {
            dropdownTippyRef.current.hide();
            setShowCloneRequestModal(true);
          }}
        >
          Clone Request
        </button>
        <button className="dropdown-item w-full" onClick={(e) => handleCurrentTabClose(e, currentTabUid)}>
          Close
        </button>
        <button disabled={!hasOtherTabs} className="dropdown-item w-full" onClick={handleCloseOtherTabs}>
          Close Others
        </button>
        <button disabled={!hasLeftTabs} className="dropdown-item w-full" onClick={handleCloseTabsToTheLeft}>
          Close to the Left
        </button>
        <button disabled={!hasRightTabs} className="dropdown-item w-full" onClick={handleCloseTabsToTheRight}>
          Close to the Right
        </button>
        <button disabled={!hasSavedTabs} className="dropdown-item w-full" onClick={handleCloseSavedTabs}>
          Close Saved
        </button>
        <button className="dropdown-item w-full" onClick={handleCloseAllTabs}>
          Close All
        </button>
      </Dropdown>
    </Fragment>
  );
}

export default RequestTab;
