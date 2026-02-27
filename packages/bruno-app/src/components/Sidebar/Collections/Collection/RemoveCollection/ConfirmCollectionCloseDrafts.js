import React, { useMemo } from 'react';
import filter from 'lodash/filter';
import { useDispatch, useSelector } from 'react-redux';
import { flattenItems, isItemARequest, hasRequestChanges, findCollectionByUid } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { saveRequest, saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import Button from 'ui/Button';

const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;

const ConfirmCollectionCloseDrafts = ({ onClose, collection, collectionUid }) => {
  const dispatch = useDispatch();

  const latestCollection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));

  const activeCollection = latestCollection || collection;

  const currentDrafts = useMemo(() => {
    if (!activeCollection) return [];
    const items = flattenItems(activeCollection.items);
    return items
      ?.filter((item) => isItemARequest(item) && hasRequestChanges(item) && !item.isTransient)
      .map((item) => {
        return {
          ...item,
          collectionUid: collectionUid
        };
      });
  }, [activeCollection, collectionUid]);

  const currentTransientDrafts = useMemo(() => {
    if (!activeCollection) return [];
    const items = flattenItems(activeCollection.items);
    return items
      ?.filter((item) => isItemARequest(item) && hasRequestChanges(item) && item.isTransient)
      .map((item) => {
        return {
          ...item,
          collectionUid: collectionUid
        };
      });
  }, [activeCollection, collectionUid]);

  const allDrafts = useMemo(() => {
    return [...currentDrafts, ...currentTransientDrafts];
  }, [currentDrafts, currentTransientDrafts]);

  const handleSaveAll = () => {
    // If there are transient drafts, we can't proceed with batch save
    if (currentTransientDrafts.length > 0) {
      toast.error('Please save or discard transient requests first');
      return;
    }
    // Save only non-transient drafts
    if (currentDrafts.length > 0) {
      dispatch(saveMultipleRequests(currentDrafts))
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
      // No non-transient drafts, just remove the collection
      dispatch(removeCollection(collectionUid))
        .then(() => {
          toast.success('Collection removed from workspace');
          onClose();
        })
        .catch(() => toast.error('An error occurred while removing the collection'));
    }
  };

  const handleDiscardAll = () => {
    // Discard all drafts (both regular and transient)
    allDrafts.forEach((draft) => {
      dispatch(deleteRequestDraft({
        collectionUid: collectionUid,
        itemUid: draft.uid
      }));
    });

    // Then remove the collection
    dispatch(removeCollection(collectionUid))
      .then(() => {
        toast.success('Collection removed from workspace');
        onClose();
      })
      .catch(() => toast.error('An error occurred while removing the collection'));
  };

  const handleSaveTransient = (draft) => {
    dispatch(saveRequest(draft.uid, collectionUid));
  };

  if (!currentDrafts.length && !currentTransientDrafts.length) {
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
        You have unsaved changes in <span className="font-medium">{allDrafts.length}</span>{' '}
        {pluralizeWord('request', allDrafts.length)}.
      </p>

      {/* Regular (saved) requests with changes */}
      {currentDrafts.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">
            Saved {pluralizeWord('Request', currentDrafts.length)} ({currentDrafts.length})
          </p>
          <ul className="ml-2">
            {currentDrafts.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item) => {
              return (
                <li key={item.uid} className="mt-1 text-xs text-gray-600">
                  • {item.filename || item.name}
                </li>
              );
            })}
          </ul>
          {currentDrafts.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
            <p className="ml-2 mt-1 text-xs text-gray-500">
              ...{currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW} additional{' '}
              {pluralizeWord('request', currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW)} not shown
            </p>
          )}
        </div>
      )}

      {/* Transient (unsaved) requests */}
      {currentTransientDrafts.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">
            Transient {pluralizeWord('Request', currentTransientDrafts.length)} ({currentTransientDrafts.length})
          </p>
          <p className="text-xs text-orange-600 mb-3">
            These requests need to be saved individually before closing the collection.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {currentTransientDrafts.map((item) => {
              return (
                <div
                  key={item.uid}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded border border-gray-200"
                >
                  <span className="text-sm text-gray-700 truncate mr-3">{item.name}</span>
                  <Button
                    color="primary"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveTransient(item)}
                    icon={<IconDeviceFloppy size={14} strokeWidth={1.5} />}
                  >
                    Save
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <Button
            onClick={handleSaveAll}
            disabled={currentTransientDrafts.length > 0}
            title={currentTransientDrafts.length > 0 ? 'Please save or discard transient requests first' : ''}
          >
            {currentDrafts.length > 1 ? 'Save All and Remove' : 'Save and Remove'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmCollectionCloseDrafts;
