import React, { useEffect, useMemo } from 'react';
import each from 'lodash/each';
import filter from 'lodash/filter';
import groupBy from 'lodash/groupBy';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';
import { saveMultipleRequests, saveMultipleCollections, saveMultipleFolders } from 'providers/ReduxStore/slices/collections/actions';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';

const SaveRequestsModal = ({ onClose }) => {
  const MAX_UNSAVED_ITEMS_TO_SHOW = 5;
  const currentDrafts = [];
  const collectionDrafts = [];
  const folderDrafts = [];
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);
  const dispatch = useDispatch();

  const tabsByCollection = groupBy(tabs, (t) => t.collectionUid);
  Object.keys(tabsByCollection).forEach((collectionUid) => {
    const collection = findCollectionByUid(collections, collectionUid);
    if (collection) {
      // Check for collection draft
      if (collection.draft) {
        collectionDrafts.push({
          type: 'collection',
          name: collection.name,
          collectionUid: collectionUid
        });
      }

      // Check for request drafts
      const items = flattenItems(collection.items);
      const requestDrafts = filter(items, (item) => isItemARequest(item) && item.draft);
      each(requestDrafts, (draft) => {
        currentDrafts.push({
          type: 'request',
          name: draft.name,
          ...draft,
          collectionUid: collectionUid
        });
      });

      // Check for folder drafts
      const folders = filter(items, (item) => item.type === 'folder' && item.draft);
      each(folders, (folder) => {
        folderDrafts.push({
          type: 'folder',
          name: folder.name,
          folderUid: folder.uid,
          collectionUid: collectionUid
        });
      });
    }
  });
  const currentDrafts = useMemo(() => {
    const drafts = [];
    const tabsByCollection = groupBy(tabs, (t) => t.collectionUid);

    Object.keys(tabsByCollection).forEach((collectionUid) => {
      const collection = findCollectionByUid(collections, collectionUid);
      if (collection) {
        const items = flattenItems(collection.items);
        const collectionDrafts = filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
        each(collectionDrafts, (draft) => {
          drafts.push({
            ...draft,
            collectionUid: collectionUid
          });
        });
      }
    });

    return drafts;
  }, [collections, tabs]);

  const allDrafts = [...collectionDrafts, ...folderDrafts, ...currentDrafts];
  const totalDraftsCount = allDrafts.length;

  useEffect(() => {
    if (totalDraftsCount === 0) {
      return dispatch(completeQuitFlow());
    }
  }, [totalDraftsCount, dispatch]);

  const closeWithoutSave = () => {
    dispatch(completeQuitFlow());
    onClose();
  };

  const closeWithSave = async () => {
    try {
      // Save all collection drafts
      if (collectionDrafts.length > 0) {
        await dispatch(saveMultipleCollections(collectionDrafts));
      }

      // Save all folder drafts
      if (folderDrafts.length > 0) {
        await dispatch(saveMultipleFolders(folderDrafts));
      }

      // Save all request drafts
      if (currentDrafts.length > 0) {
        await dispatch(saveMultipleRequests(currentDrafts));
      }

      dispatch(completeQuitFlow());
      onClose();
    } catch (error) {
      console.error('Error saving drafts:', error);
    }
  };

  if (totalDraftsCount === 0) {
    return null;
  }

  return (
    <Modal
      size="md"
      title="Unsaved changes"
      confirmText="Save and Close"
      cancelText="Close without saving"
      handleCancel={onClose}
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
      hideFooter={true}
    >
      <div className="flex items-center">
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
      </div>
      <p className="mt-4">
        Do you want to save the changes you made to the following{' '}
        <span className="font-medium">{totalDraftsCount}</span> {pluralizeWord('item', totalDraftsCount)}?
      </p>

      <ul className="mt-4">
        {allDrafts.slice(0, MAX_UNSAVED_ITEMS_TO_SHOW).map((item, index) => {
          const prefix
            = item.type === 'collection' ? 'Collection: '
              : item.type === 'folder' ? 'Folder: '
                : 'Request: ';
          return (
            <li key={`${item.type}-${item.collectionUid || item.uid}-${index}`} className="mt-1 text-xs">
              {prefix}{item.name || item.filename}
            </li>
          );
        })}
      </ul>

      {totalDraftsCount > MAX_UNSAVED_ITEMS_TO_SHOW && (
        <p className="mt-1 text-xs">
          ...{totalDraftsCount - MAX_UNSAVED_ITEMS_TO_SHOW} additional{' '}
          {pluralizeWord('item', totalDraftsCount - MAX_UNSAVED_ITEMS_TO_SHOW)} not shown
        </p>
      )}

      <div className="flex justify-between mt-6">
        <div>
          <button className="btn btn-sm btn-danger" onClick={closeWithoutSave}>
            Don't Save
          </button>
        </div>
        <div>
          <button className="btn btn-close btn-sm mr-2" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={closeWithSave}>
            {totalDraftsCount > 1 ? 'Save All' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveRequestsModal;
