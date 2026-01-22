import React, { useEffect, useMemo } from 'react';
import each from 'lodash/each';
import filter from 'lodash/filter';
import groupBy from 'lodash/groupBy';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges, findEnvironmentInCollection } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';
import { saveMultipleRequests, saveMultipleCollections, saveMultipleFolders, saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';

const SaveRequestsModal = ({ onClose }) => {
  const MAX_UNSAVED_ITEMS_TO_SHOW = 5;
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const globalEnvironmentDraft = useSelector((state) => state.globalEnvironments.globalEnvironmentDraft);
  const dispatch = useDispatch();

  const allDrafts = useMemo(() => {
    const requestDrafts = [];
    const collectionDrafts = [];
    const folderDrafts = [];
    const environmentDrafts = [];
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

        // Check for collection environment draft
        if (collection.environmentsDraft) {
          const { environmentUid, variables } = collection.environmentsDraft;
          const environment = findEnvironmentInCollection(collection, environmentUid);
          if (environment && variables) {
            environmentDrafts.push({
              type: 'collection-environment',
              name: environment.name,
              environmentUid,
              variables,
              collectionUid: collectionUid
            });
          }
        }

        // Check for request and folder drafts
        const items = flattenItems(collection.items);

        // Request drafts
        const requests = filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
        each(requests, (draft) => {
          requestDrafts.push({
            type: 'request',
            ...draft,
            collectionUid: collectionUid
          });
        });

        // Folder drafts
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

    // Check for global environment draft
    if (globalEnvironmentDraft) {
      const { environmentUid, variables } = globalEnvironmentDraft;
      const environment = globalEnvironments?.find((env) => env.uid === environmentUid);
      if (environment && variables) {
        environmentDrafts.push({
          type: 'global-environment',
          name: environment.name,
          environmentUid,
          variables
        });
      }
    }

    return [...collectionDrafts, ...folderDrafts, ...environmentDrafts, ...requestDrafts];
  }, [collections, tabs, globalEnvironments, globalEnvironmentDraft]);

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
      // Separate drafts by type
      const collectionDrafts = allDrafts.filter((d) => d.type === 'collection');
      const folderDrafts = allDrafts.filter((d) => d.type === 'folder');
      const requestDrafts = allDrafts.filter((d) => d.type === 'request');
      const collectionEnvironmentDrafts = allDrafts.filter((d) => d.type === 'collection-environment');
      const globalEnvironmentDrafts = allDrafts.filter((d) => d.type === 'global-environment');

      // Save all collection drafts
      if (collectionDrafts.length > 0) {
        await dispatch(saveMultipleCollections(collectionDrafts));
      }

      // Save all folder drafts
      if (folderDrafts.length > 0) {
        await dispatch(saveMultipleFolders(folderDrafts));
      }

      // Save all request drafts
      if (requestDrafts.length > 0) {
        await dispatch(saveMultipleRequests(requestDrafts));
      }

      // Save all collection environment drafts
      for (const draft of collectionEnvironmentDrafts) {
        await dispatch(saveEnvironment(draft.variables, draft.environmentUid, draft.collectionUid));
      }

      // Save all global environment drafts
      for (const draft of globalEnvironmentDrafts) {
        await dispatch(saveGlobalEnvironment({ variables: draft.variables, environmentUid: draft.environmentUid }));
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
        <h1 className="ml-2 text-lg font-medium">Hold on..</h1>
      </div>
      <p className="mt-4">
        Do you want to save the changes you made to the following{' '}
        <span className="font-medium">{totalDraftsCount}</span> {pluralizeWord('item', totalDraftsCount)}?
      </p>

      <ul className="mt-4">
        {allDrafts.slice(0, MAX_UNSAVED_ITEMS_TO_SHOW).map((item, index) => {
          let prefix;
          switch (item.type) {
            case 'collection':
              prefix = 'Collection: ';
              break;
            case 'folder':
              prefix = 'Folder: ';
              break;
            case 'collection-environment':
              prefix = 'Collection Environment: ';
              break;
            case 'global-environment':
              prefix = 'Global Environment: ';
              break;
            default:
              prefix = 'Request: ';
          }
          return (
            <li key={`${item.type}-${item.collectionUid || item.uid}-${index}`} className="mt-1 text-xs">
              {prefix}
              {item.name || item.filename}
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
          <Button color="danger" onClick={closeWithoutSave}>
            Don't Save
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" color="secondary" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={closeWithSave}>
            {totalDraftsCount > 1 ? 'Save All' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveRequestsModal;
