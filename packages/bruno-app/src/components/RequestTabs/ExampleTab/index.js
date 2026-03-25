import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { makeTabPermanent, syncTabUid } from 'providers/ReduxStore/slices/tabs';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { saveRequest, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { hasExampleChanges, findItemInCollection, findItemInCollectionByPathname, areItemsLoading } from 'utils/collections';
import ExampleIcon from 'components/Icons/ExampleIcon';
import ConfirmRequestClose from '../RequestTab/ConfirmRequestClose';
import RequestTabNotFound from '../RequestTab/RequestTabNotFound';
import RequestTabLoading from '../RequestTab/RequestTabLoading';
import StyledWrapper from '../RequestTab/StyledWrapper';
import GradientCloseButton from '../RequestTab/GradientCloseButton';

const ExampleTab = ({ tab, collection }) => {
  const dispatch = useDispatch();
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const dropdownTippyRef = useRef();

  let item = findItemInCollection(collection, tab.itemUid);
  if (!item && tab.pathname) {
    item = findItemInCollectionByPathname(collection, tab.pathname);
  }

  const example = useMemo(() => {
    if (!item?.examples) return null;
    const byUid = item.examples.find((ex) => ex.uid === tab.uid);
    if (byUid) return byUid;
    if (tab.exampleName) {
      return item.examples.find((ex) => ex.name === tab.exampleName);
    }
    return null;
  }, [item?.examples, tab.uid, tab.exampleName]);

  const hasChanges = useMemo(() => hasExampleChanges(item, example?.uid), [item, example?.uid]);

  const isItemsLoading = useMemo(() => {
    return collection?.mountStatus === 'mounting' || areItemsLoading(collection);
  }, [collection?.mountStatus, collection]);

  useEffect(() => {
    if (example && example.uid !== tab.uid) {
      dispatch(syncTabUid({ oldUid: tab.uid, newUid: example.uid }));
    }
  }, [example, tab.uid, dispatch]);

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
    const displayName = tab.exampleName || tab.name;
    const showLoading = displayName && isItemsLoading;
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
        {showLoading ? (
          <RequestTabLoading handleCloseClick={handleCloseClick} name={displayName} />
        ) : (
          <RequestTabNotFound handleCloseClick={handleCloseClick} />
        )}
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
