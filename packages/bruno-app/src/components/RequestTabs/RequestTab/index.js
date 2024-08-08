import React, { useState, useRef, Fragment } from 'react';
import get from 'lodash/get';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import darkTheme from 'themes/dark';
import lightTheme from 'themes/light';
import { findItemInCollection } from 'utils/collections';
import ConfirmRequestClose from './ConfirmRequestClose';
import RequestTabNotFound from './RequestTabNotFound';
import SpecialTab from './SpecialTab';
import StyledWrapper from './StyledWrapper';
import Dropdown from 'components/Dropdown';
import CloneCollectionItem from 'components/Sidebar/Collections/Collection/CollectionItem/CloneCollectionItem/index';
import NewRequest from 'components/Sidebar/NewRequest/index';

const RequestTab = ({ tab, collection, tabIndex, collectionRequestTabs, folderUid }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [showConfirmClose, setShowConfirmClose] = useState(false);

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
      e.stopPropagation();
      e.preventDefault();

      dispatch(
        closeTabs({
          tabUids: [tab.uid]
        })
      );
    }
  };

  const getMethodColor = (method = '') => {
    const theme = storedTheme === 'dark' ? darkTheme : lightTheme;

    let color = '';
    method = method.toLocaleLowerCase();

    switch (method) {
      case 'get': {
        color = theme.request.methods.get;
        break;
      }
      case 'post': {
        color = theme.request.methods.post;
        break;
      }
      case 'put': {
        color = theme.request.methods.put;
        break;
      }
      case 'delete': {
        color = theme.request.methods.delete;
        break;
      }
      case 'patch': {
        color = theme.request.methods.patch;
        break;
      }
      case 'options': {
        color = theme.request.methods.options;
        break;
      }
      case 'head': {
        color = theme.request.methods.head;
        break;
      }
    }

    return color;
  };
  const folder = folderUid ? findItemInCollection(collection, folderUid) : null;
  if (['collection-settings', 'folder-settings', 'variables', 'collection-runner'].includes(tab.type)) {
    return (
      <StyledWrapper className="flex items-center justify-between tab-container px-1">
        {tab.type === 'folder-settings' ? (
          <SpecialTab handleCloseClick={handleCloseClick} type={tab.type} tabName={folder?.name} />
        ) : (
          <SpecialTab handleCloseClick={handleCloseClick} type={tab.type} />
        )}
      </StyledWrapper>
    );
  }

  const item = findItemInCollection(collection, tab.uid);

  if (!item) {
    return (
      <StyledWrapper className="flex items-center justify-between tab-container px-1">
        <RequestTabNotFound handleCloseClick={handleCloseClick} />
      </StyledWrapper>
    );
  }

  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');

  return (
    <StyledWrapper className="flex items-center justify-between tab-container px-1">
      {showConfirmClose && (
        <ConfirmRequestClose
          item={item}
          onCancel={() => setShowConfirmClose(false)}
          onCloseWithoutSave={() => {
            dispatch(
              deleteRequestDraft({
                itemUid: item.uid,
                collectionUid: collection.uid
              })
            );
            dispatch(
              closeTabs({
                tabUids: [tab.uid]
              })
            );
            setShowConfirmClose(false);
          }}
          onSaveAndClose={() => {
            dispatch(saveRequest(item.uid, collection.uid))
              .then(() => {
                dispatch(
                  closeTabs({
                    tabUids: [tab.uid]
                  })
                );
                setShowConfirmClose(false);
              })
              .catch((err) => {
                console.log('err', err);
              });
          }}
        />
      )}
      <div
        className="flex items-baseline tab-label pl-2"
        onContextMenu={handleRightClick}
        onMouseUp={(e) => {
          if (!item.draft) return handleMouseUp(e);

          if (e.button === 1) {
            e.stopPropagation();
            e.preventDefault();
            setShowConfirmClose(true);
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
          setShowConfirmClose(true);
        }}
      >
        {!item.draft ? (
          <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="close-icon">
            <path
              fill="currentColor"
              d="M207.6 256l107.72-107.72c6.23-6.23 6.23-16.34 0-22.58l-25.03-25.03c-6.23-6.23-16.34-6.23-22.58 0L160 208.4 52.28 100.68c-6.23-6.23-16.34-6.23-22.58 0L4.68 125.7c-6.23 6.23-6.23 16.34 0 22.58L112.4 256 4.68 363.72c-6.23 6.23-6.23 16.34 0 22.58l25.03 25.03c6.23 6.23 16.34 6.23 22.58 0L160 303.6l107.72 107.72c6.23 6.23 16.34 6.23 22.58 0l25.03-25.03c6.23-6.23 6.23-16.34 0-22.58L207.6 256z"
            ></path>
          </svg>
        ) : (
          <svg
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
            width="8"
            height="16"
            fill="#cc7b1b"
            className="has-changes-icon"
            viewBox="0 0 8 8"
          >
            <circle cx="4" cy="4" r="3" />
          </svg>
        )}
      </div>
    </StyledWrapper>
  );
};

function RequestTabMenu({ onDropdownCreate, collectionRequestTabs, tabIndex, collection, dropdownTippyRef, dispatch }) {
  const [showCloneRequestModal, setShowCloneRequestModal] = useState(false);
  const [showAddNewRequestModal, setShowAddNewRequestModal] = useState(false);

  const totalTabs = collectionRequestTabs.length || 0;
  const currentTabUid = collectionRequestTabs[tabIndex]?.uid;
  const currentTabItem = findItemInCollection(collection, currentTabUid);

  const hasLeftTabs = tabIndex !== 0;
  const hasRightTabs = totalTabs > tabIndex + 1;
  const hasOtherTabs = totalTabs > 1;

  async function handleCloseTab(event, tabUid) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

    if (!tabUid) {
      return;
    }

    try {
      const item = findItemInCollection(collection, tabUid);
      // silently save unsaved changes before closing the tab
      if (item.draft) {
        await dispatch(saveRequest(item.uid, collection.uid, true));
      }

      dispatch(closeTabs({ tabUids: [tabUid] }));
    } catch (err) {}
  }

  function handleCloseOtherTabs(event) {
    dropdownTippyRef.current.hide();

    const otherTabs = collectionRequestTabs.filter((_, index) => index !== tabIndex);
    otherTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseTabsToTheLeft(event) {
    dropdownTippyRef.current.hide();

    const leftTabs = collectionRequestTabs.filter((_, index) => index < tabIndex);
    leftTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseTabsToTheRight(event) {
    dropdownTippyRef.current.hide();

    const rightTabs = collectionRequestTabs.filter((_, index) => index > tabIndex);
    rightTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseSavedTabs(event) {
    event.stopPropagation();

    const savedTabs = collection.items.filter((item) => !item.draft);
    const savedTabIds = savedTabs.map((item) => item.uid) || [];
    dispatch(closeTabs({ tabUids: savedTabIds }));
  }

  function handleCloseAllTabs(event) {
    collectionRequestTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  return (
    <Fragment>
      {showAddNewRequestModal && (
        <NewRequest collection={collection} onClose={() => setShowAddNewRequestModal(false)} />
      )}

      {showCloneRequestModal && (
        <CloneCollectionItem
          item={currentTabItem}
          collection={collection}
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
        <button className="dropdown-item w-full" onClick={(e) => handleCloseTab(e, currentTabUid)}>
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
        <button className="dropdown-item w-full" onClick={handleCloseSavedTabs}>
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
