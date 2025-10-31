import React, { useState, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { hasExampleChanges, findItemInCollection } from 'utils/collections';
import ExampleIcon from 'components/Icons/ExampleIcon';
import ConfirmRequestClose from '../RequestTab/ConfirmRequestClose';
import RequestTabNotFound from '../RequestTab/RequestTabNotFound';
import StyledWrapper from '../RequestTab/StyledWrapper';
import CloseTabIcon from '../RequestTab/CloseTabIcon';
import DraftTabIcon from '../RequestTab/DraftTabIcon';

const ExampleTab = ({ tab, collection }) => {
  const dispatch = useDispatch();
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const dropdownTippyRef = useRef();

  // Get item and example data
  const item = findItemInCollection(collection, tab.itemUid);
  const example = useMemo(() => item?.examples?.find((ex) => ex.uid === tab.uid), [item?.examples, tab.uid]);

  const hasChanges = useMemo(() => hasExampleChanges(item, tab.uid), [item, tab.uid]);

  const handleCloseClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch(closeTabs({
      tabUids: [tab.uid]
    }));
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
      dispatch(closeTabs({
        tabUids: [tab.uid]
      }));
    }
  };

  if (!item || !example) {
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

  return (
    <StyledWrapper className="flex items-center justify-between tab-container px-1">
      {showConfirmClose && (
        <ConfirmRequestClose
          item={item}
          example={example}
          onCancel={() => setShowConfirmClose(false)}
          onCloseWithoutSave={() => {
            dispatch(deleteRequestDraft({
              itemUid: item.uid,
              collectionUid: collection.uid
            }));
            dispatch(closeTabs({
              tabUids: [tab.uid]
            }));
            setShowConfirmClose(false);
          }}
          onSaveAndClose={() => {
            // For examples, we don't have a separate save action
            // The changes are saved automatically when the request is saved
            dispatch(closeTabs({
              tabUids: [tab.uid]
            }));
            setShowConfirmClose(false);
          }}
        />
      )}
      <div
        className={`flex items-center tab-label pl-2 ${tab.preview ? 'italic' : ''}`}
        onContextMenu={handleRightClick}
        onDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))}
        onMouseUp={(e) => {
          if (!hasChanges) return handleMouseUp(e);

          if (e.button === 1) {
            e.stopPropagation();
            e.preventDefault();
            setShowConfirmClose(true);
          }
        }}
      >
        <ExampleIcon size={16} color="currentColor" className="mr-2 text-gray-500 flex-shrink-0" />
        <span className="tab-name" title={example.name}>
          {example.name}
        </span>
      </div>
      <div
        className="flex px-2 close-icon-container"
        onClick={(e) => {
          if (!hasChanges) {
            return handleCloseClick(e);
          }

          e.stopPropagation();
          e.preventDefault();
          setShowConfirmClose(true);
        }}
      >
        {!hasChanges ? (
          <CloseTabIcon />
        ) : (
          <DraftTabIcon />
        )}
      </div>
    </StyledWrapper>
  );
};

export default ExampleTab;
