import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { findItemInCollection, flattenItems } from 'utils/collections/index';
import NewRequest from 'components/Sidebar/NewRequest/index';
import CloneCollectionItem from 'components/Sidebar/Collections/Collection/CollectionItem/CloneCollectionItem/index';
import Dropdown from 'components/Dropdown';
import { Fragment } from 'react';

export function TabContextMenu({ onDropdownCreate, tabIndex, collection, dropdownTippyRef }) {
  const [showCloneRequestModal, setShowCloneRequestModal] = useState(false);
  const [showAddNewRequestModal, setShowAddNewRequestModal] = useState(false);
  const tabs = useSelector((state) => state.tabs.tabs);
  const dispatch = useDispatch();

  const currentTabItem = tabs[tabIndex];
  const currentTabItemUid = currentTabItem?.uid;
  const isRequest = collection ? true : false;
  const requestItem = isRequest ? findItemInCollection(collection, currentTabItemUid) : null;

  const totalTabs = tabs.length || 0;
  const hasLeftTabs = tabIndex !== 0;
  const hasRightTabs = totalTabs > tabIndex + 1;
  const hasOtherTabs = totalTabs > 1;

  async function handleCloseTab(event, closingTabUid) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

    if (!currentTabItemUid) {
      return;
    }

    try {
      // silently save unsaved changes before closing the request tab
      if (isRequest && collection) {
        dispatch(saveRequest(currentTabItemUid, collection.uid, true));
      }
      dispatch(closeTabs({ tabUids: [closingTabUid] }));
    } catch (err) {}
  }

  function handleCloseOtherTabs(event) {
    dropdownTippyRef.current.hide();

    const otherTabs = tabs.filter((_, index) => index !== tabIndex);
    otherTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseTabsToTheLeft(event) {
    dropdownTippyRef.current.hide();

    const leftTabs = tabs.filter((_, index) => index < tabIndex);
    leftTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseTabsToTheRight(event) {
    dropdownTippyRef.current.hide();

    const rightTabs = tabs.filter((_, index) => index > tabIndex);
    rightTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseSavedTabs(event) {
    event.stopPropagation();

    const items = flattenItems(collection?.items);
    const savedTabs = items?.filter?.((item) => !item.draft);
    const savedTabIds = savedTabs?.map((item) => item.uid) || [];
    dispatch(closeTabs({ tabUids: savedTabIds }));
  }

  function handleCloseAllTabs(event) {
    tabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  return (
    <Fragment>
      {showAddNewRequestModal && (
        <NewRequest collection={collection} onClose={() => setShowAddNewRequestModal(false)} />
      )}

      {showCloneRequestModal && (
        <CloneCollectionItem
          item={requestItem}
          collection={collection}
          onClose={() => setShowCloneRequestModal(false)}
        />
      )}

      <Dropdown onCreate={onDropdownCreate} icon={<span></span>} placement="bottom-start">
        {isRequest && (
          <>
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
          </>
        )}

        <button className="dropdown-item w-full" onClick={(e) => handleCloseTab(e, currentTabItemUid)}>
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
        {isRequest && (
          <button className="dropdown-item w-full" onClick={handleCloseSavedTabs}>
            Close Saved
          </button>
        )}
        <button className="dropdown-item w-full" onClick={handleCloseAllTabs}>
          Close All
        </button>
      </Dropdown>
    </Fragment>
  );
}
