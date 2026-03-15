import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { flattenItems, isItemARequest, hasRequestChanges, findCollectionByUid } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import Button from 'ui/Button';

const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;

const ConfirmCollectionCloseDrafts = ({ onClose, collection, collectionUid }) => {
  const dispatch = useDispatch();

  const latestCollection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));

  const activeCollection = latestCollection || collection;

  const drafts = useMemo(() => {
    if (!activeCollection) return [];
    const items = flattenItems(activeCollection.items);
    return items
      ?.filter((item) => isItemARequest(item) && hasRequestChanges(item))
      .map((item) => ({
        ...item,
        collectionUid: collectionUid
      }));
  }, [activeCollection, collectionUid]);

  const handleSaveAll = () => {
    if (drafts.length > 0) {
      dispatch(saveMultipleRequests(drafts))
        .then(() => {
          dispatch(removeCollection(collectionUid))
            .then(() => {
              toast.success('Collection removed from workspace');
              onClose();
            })
            .catch(() => toast.error('An error occurred while removing the collection'));
        })
        .catch(() => {
          toast.error('Failed to save requests!');
        });
    } else {
      dispatch(removeCollection(collectionUid))
        .then(() => {
          toast.success('Collection removed from workspace');
          onClose();
        })
        .catch(() => toast.error('An error occurred while removing the collection'));
    }
  };

  const handleDiscardAll = () => {
    drafts.forEach((draft) => {
      dispatch(deleteRequestDraft({
        collectionUid: collectionUid,
        itemUid: draft.uid
      }));
    });

    dispatch(removeCollection(collectionUid))
      .then(() => {
        toast.success('Collection removed from workspace');
        onClose();
      })
      .catch(() => toast.error('An error occurred while removing the collection'));
  };

  if (!drafts.length) {
    return null;
  }

  return (
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
      <div className="flex items-center">
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-medium">Hold on..</h1>
      </div>
      <p className="mt-4">
        You have unsaved changes in <span className="font-medium">{drafts.length}</span>{' '}
        {pluralizeWord('request', drafts.length)}.
      </p>

      <div className="mt-4">
        <ul className="ml-2">
          {drafts.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item) => (
            <li key={item.uid} className="mt-1 text-xs text-gray-600">
              • {item.filename || item.name}
            </li>
          ))}
        </ul>
        {drafts.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
          <p className="ml-2 mt-1 text-xs text-gray-500">
            ...{drafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW} additional{' '}
            {pluralizeWord('request', drafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW)} not shown
          </p>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <div>
          <Button color="danger" onClick={handleDiscardAll}>
            Discard All and Remove
          </Button>
        </div>
        <div>
          <Button className="mr-2" color="secondary" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll}>
            {drafts.length > 1 ? 'Save All and Remove' : 'Save and Remove'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmCollectionCloseDrafts;
