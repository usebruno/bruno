import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import filter from 'lodash/filter';
import Modal from 'components/Modal';
import { removeCollection, saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, flattenItems, isItemARequest } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';
import { IconAlertTriangle } from '@tabler/icons';

const RemoveCollections = ({ collectionUids, onClose }) => {
  const dispatch = useDispatch();
  const allCollections = useSelector(state => state.collections.collections || []);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;

  const selectedCollections = collectionUids
    .map(uid => findCollectionByUid(allCollections, uid))
    .filter(Boolean);

  const collectionsNames = selectedCollections.map(c => c.name).join(', ');

  const getUnsavedDrafts = () => {
    const currentDrafts = [];
    collectionUids.forEach(collectionUid => {
      const collection = findCollectionByUid(allCollections, collectionUid);
      if (collection) {
        const items = flattenItems(collection.items);
        const drafts = filter(items, item => isItemARequest(item) && item.draft);
        drafts.forEach(draft => {
          currentDrafts.push({
            ...draft,
            collectionUid: collectionUid,
          });
        });
      }
    });
    return currentDrafts;
  };

  const hasUnsavedChanges = () => {
    return getUnsavedDrafts().length > 0;
  };

  useEffect(() => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesModal(true);
    } else {
      setShowCloseModal(true);
    }
  }, []);

  const handleUnsavedChangesDiscard = () => {
    setShowUnsavedChangesModal(false);
    setShowCloseModal(true);
  };

  const handleUnsavedChangesCancel = () => {
    setShowUnsavedChangesModal(false);
    if (onClose) onClose();
  };

  const handleCloseButton = () => {
    handleUnsavedChangesCancel();
  };

  const handleUnsavedChangesSave = () => {
    const currentDrafts = getUnsavedDrafts();
    dispatch(saveMultipleRequests(currentDrafts))
      .then(() => {
        handleUnsavedChangesDiscard();
      })
      .catch(() => {
        handleUnsavedChangesCancel();
      });
  };

  const onConfirm = () => {
    const removalPromises = selectedCollections.map(collection => {
      return dispatch(removeCollection(collection.uid));
    });

    Promise.all(removalPromises)
      .then(() => {
        toast.success('Closed all collections');
      })
      .catch(() => {
        toast.error('An error occurred while closing collections');
      })
      .finally(() => {
        if (onClose) onClose();
      });
  };

  const getConfirmationText = () => {
    if (collectionUids.length > 1) {
      return `Are you sure you want to close all ${collectionUids.length} collections in Bruno?`;
    }
    return (
      <span>
        Are you sure you want to close the collection
        {' '}
        <span className="font-semibold">{collectionsNames}</span>
        {' '}
        in Bruno?
      </span>
    );
  };

  const currentDrafts = showUnsavedChangesModal ? getUnsavedDrafts() : [];

  return (
    <>
      {showUnsavedChangesModal && currentDrafts.length > 0 && (
        <Modal
          size="md"
          title="Unsaved changes"
          confirmText="Save and Close"
          cancelText="Close without saving"
          disableEscapeKey={true}
          disableCloseOnOutsideClick={true}
          closeModalFadeTimeout={150}
          handleCancel={handleUnsavedChangesCancel}
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
          }}
          hideFooter={true}
        >
          <div className="flex items-center font-normal">
            <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
            <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
          </div>
          <div className="font-normal mt-4">
            Do you want to save the changes you made to the following
            {' '}
            <span className="font-medium">{currentDrafts.length}</span>
            {' '}
            {pluralizeWord('request', currentDrafts.length)}
            ?
          </div>

          <div className="mt-4 text-xs">
            {currentDrafts.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item, index) => (
              <span key={item.uid}>
                {item.filename}
                {index < Math.min(currentDrafts.length, MAX_UNSAVED_REQUESTS_TO_SHOW) - 1 && ', '}
              </span>
            ))}
            {currentDrafts.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
              <span>
                {' '}
                ...
                {currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW}
                {' '}
                additional
                {pluralizeWord('request', currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW)}
                {' '}
                not shown
              </span>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <div>
              <button className="btn btn-sm btn-danger" onClick={handleUnsavedChangesDiscard}>
                Don't Save
              </button>
            </div>
            <div>
              <button className="btn btn-close btn-sm mr-2" onClick={handleUnsavedChangesCancel}>
                Cancel
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleUnsavedChangesSave}>
                {currentDrafts.length > 1 ? 'Save All' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {showCloseModal && (
        <Modal
          size="sm"
          title={collectionUids.length > 1 ? 'Close all collections?' : 'Close collection?'}
          confirmText={collectionUids.length > 1 ? 'Close All' : 'Close'}
          handleConfirm={onConfirm}
          handleCancel={onClose}
          hideCancel={true}
        >
          <div className="mt-4">{getConfirmationText()}</div>
          <div className="mt-4 text-xs text-gray-500">
            Collections will remain available in the file system and can be re-opened later.
          </div>
        </Modal>
      )}
    </>
  );
};

RemoveCollections.propTypes = {
  collectionUids: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func,
};

export default RemoveCollections;
