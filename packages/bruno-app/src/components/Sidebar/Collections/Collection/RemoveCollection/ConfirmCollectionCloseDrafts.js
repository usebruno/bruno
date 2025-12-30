import React, { useState } from 'react';
import filter from 'lodash/filter';
import { useDispatch } from 'react-redux';
import { flattenItems, isItemARequest, hasRequestChanges } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import Portal from 'components/Portal/index';

const ConfirmCollectionCloseDrafts = ({ onClose, collection, collectionUid }) => {
  const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;
  const dispatch = useDispatch();
  const [deleteFromDisk, setDeleteFromDisk] = useState(false);

  // Get all draft items in the collection
  const currentDrafts = React.useMemo(() => {
    if (!collection) return [];
    const items = flattenItems(collection.items);
    const collectionDrafts = filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
    return collectionDrafts.map((draft) => ({
      ...draft,
      collectionUid: collectionUid
    }));
  }, [collection, collectionUid]);

  const handleSaveAll = () => {
    dispatch(saveMultipleRequests(currentDrafts))
      .then(() => {
        dispatch(removeCollection(collectionUid, deleteFromDisk))
          .then(() => {
            toast.success(deleteFromDisk ? 'Collection deleted' : 'Collection removed from workspace');
            onClose();
          })
          .catch(() => toast.error('An error occurred while removing the collection'));
      })
      .catch(() => {
        toast.error('Failed to save requests!');
      });
  };

  const handleDiscardAll = () => {
    // Discard all drafts
    currentDrafts.forEach((draft) => {
      dispatch(deleteRequestDraft({
        collectionUid: collectionUid,
        itemUid: draft.uid
      }));
    });

    dispatch(removeCollection(collectionUid, deleteFromDisk))
      .then(() => {
        toast.success(deleteFromDisk ? 'Collection deleted' : 'Collection removed from workspace');
        onClose();
      })
      .catch(() => toast.error('An error occurred while removing the collection'));
  };

  if (!currentDrafts.length) {
    return null;
  }

  return (
    <Portal>
      <Modal
        size="md"
        title="Remove Collection"
        confirmText="Save and Remove"
        cancelText="Remove without saving"
        handleCancel={onClose}
        disableEscapeKey={true}
        disableCloseOnOutsideClick={true}
        closeModalFadeTimeout={150}
        hideFooter={true}
      >
        <StyledWrapper>
          <div className="flex items-center">
            <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
            <h1 className="ml-2 text-lg font-medium">Hold on..</h1>
          </div>
          <p className="mt-4">
            Do you want to save the changes you made to the following{' '}
            <span className="font-medium">{currentDrafts.length}</span> {pluralizeWord('request', currentDrafts.length)}?
          </p>

          <ul className="mt-4">
            {currentDrafts.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item) => {
              return (
                <li key={item.uid} className="mt-1 text-xs">
                  {item.filename}
                </li>
              );
            })}
          </ul>

          {currentDrafts.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
            <p className="mt-1 text-xs">
              ...{currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW} additional{' '}
              {pluralizeWord('request', currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW)} not shown
            </p>
          )}

          <div className="delete-checkbox-container mt-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={deleteFromDisk}
                onChange={(e) => setDeleteFromDisk(e.target.checked)}
              />
              <span className="ml-2">Also delete collection from filesystem</span>
            </label>
          </div>

          {deleteFromDisk && (
            <div className="delete-warning mt-3">
              <IconAlertTriangle size={16} strokeWidth={1.5} />
              <span>This action is permanent and cannot be undone. The collection folder and all its contents will be deleted from your filesystem.</span>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <div>
              <Button size="sm" color="danger" onClick={handleDiscardAll}>
                {deleteFromDisk ? 'Discard and Delete' : 'Discard and Remove'}
              </Button>
            </div>
            <div>
              <Button size="sm" color="secondary" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveAll}>
                {currentDrafts.length > 1
                  ? (deleteFromDisk ? 'Save All and Delete' : 'Save All and Remove')
                  : (deleteFromDisk ? 'Save and Delete' : 'Save and Remove')}
              </Button>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default ConfirmCollectionCloseDrafts;
