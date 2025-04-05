import React, { useState, useRef } from 'react';
import get from 'lodash/get';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
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
import CloseTabIcon from './CloseTabIcon';
import DraftTabIcon from './DraftTabIcon';
import { TabContextMenu } from 'components/TabContextMenu/index';

const RequestTab = ({ tab, collection, tabIndex, folderUid }) => {
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

  const folder = folderUid ? findItemInCollection(collection, folderUid) : null;
  if (['collection-settings', 'collection-overview', 'folder-settings', 'variables', 'collection-runner', 'security-settings'].includes(tab.type)) {
    return (
      <StyledWrapper
        className={`flex items-center justify-between tab-container px-1 ${tab.preview ? "italic" : ""}`}
        onMouseUp={handleMouseUp} // Add middle-click behavior here
      >
        {tab.type === 'folder-settings' ? (
          <SpecialTab 
              handleCloseClick={handleCloseClick} 
              handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} 
              type={tab.type} 
              tabName={folder?.name}
              tabIndex={tabIndex} 
              collection={collection} 
          />
        ) : (
          <SpecialTab 
             handleCloseClick={handleCloseClick} 
             handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} 
             type={tab.type}
             tabIndex={tabIndex} 
             collection={collection} 
          />
        )}
      </StyledWrapper>
    );
  }

  const item = findItemInCollection(collection, tab.uid);

  if (!item) {
    return (
      <StyledWrapper
        className="flex items-center justify-between tab-container px-1"
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
        className={`flex items-baseline tab-label pl-2 ${tab.preview ? "italic" : ""}`}
        onContextMenu={handleRightClick}
        onDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))}
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
        <TabContextMenu
          isRequestTab={true}
          onDropdownCreate={onDropdownCreate}
          tabIndex={tabIndex}
          collection={collection}
          dropdownTippyRef={dropdownTippyRef}
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
          <CloseTabIcon />
        ) : (
          <DraftTabIcon />
        )}
      </div>
    </StyledWrapper>
  );
};

export default RequestTab;
