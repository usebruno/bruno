import React, { useState, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { hasExampleChanges, findItemInCollection } from 'utils/collections';
import ExampleIcon from 'components/Icons/ExampleIcon';
import ConfirmRequestClose from '../RequestTab/ConfirmRequestClose';
import RequestTabNotFound from '../RequestTab/RequestTabNotFound';
import StyledWrapper from '../RequestTab/StyledWrapper';
import GradientCloseButton from '../RequestTab/GradientCloseButton';

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
            dispatch(saveRequest(item.uid, collection.uid, true));
            dispatch(closeTabs({
              tabUids: [tab.uid]
            }));
            setShowConfirmClose(false);
          }}
        />
      )}
      <div
        className={`flex items-center tab-label ${tab.preview ? 'italic' : ''}`}
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
        <ExampleIcon size={14} color="currentColor" className="example-icon flex-shrink-0" />
        <span className="tab-name ml-1" title={example.name}>
          {example.name}
        </span>
      </div>
      <GradientCloseButton
        hasChanges={hasChanges}
        onClick={(e) => {
          if (!hasChanges) {
            return handleCloseClick(e);
          }

          e.stopPropagation();
          e.preventDefault();
          setShowConfirmClose(true);
        }}
      />
    </StyledWrapper>
  );
};

export default ExampleTab;
