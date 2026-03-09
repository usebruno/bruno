import React, { useEffect, useMemo } from 'react';
import each from 'lodash/each';
import filter from 'lodash/filter';
import groupBy from 'lodash/groupBy';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges, findEnvironmentInCollection } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { hasInvalidVariableNames } from 'utils/common/regex';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';
import { saveMultipleRequests, saveMultipleCollections, saveMultipleFolders, saveEnvironment, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { saveGlobalEnvironment, clearGlobalEnvironmentDraft } from 'providers/ReduxStore/slices/global-environments';
import { deleteRequestDraft, deleteCollectionDraft, deleteFolderDraft, clearEnvironmentsDraft } from 'providers/ReduxStore/slices/collections';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import toast from 'react-hot-toast';

const SaveRequestsModal = ({ onClose, forceCloseTabs = false, tabUidsToClose = [] }) => {
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
    const relevantTabs = forceCloseTabs ? tabs.filter((t) => tabUidsToClose.includes(t.uid)) : tabs;
    const tabsByCollection = groupBy(relevantTabs, (t) => t.collectionUid);

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
  }, [collections, tabs, globalEnvironments, globalEnvironmentDraft, forceCloseTabs, tabUidsToClose]);

  const totalDraftsCount = allDrafts.length;

  useEffect(() => {
    if (totalDraftsCount === 0) {
      if (forceCloseTabs) {
        dispatch(closeTabs({ tabUids: tabUidsToClose }));
        onClose();
      } else {
        dispatch(completeQuitFlow());
      }
    }
  }, [totalDraftsCount, dispatch, forceCloseTabs, tabUidsToClose]);

  const closeWithoutSave = () => {
    if (forceCloseTabs) {
      // Discard all draft states before closing tabs
      allDrafts.forEach((draft) => {
        switch (draft.type) {
          case 'collection':
            dispatch(deleteCollectionDraft({ collectionUid: draft.collectionUid }));
            break;
          case 'folder':
            dispatch(deleteFolderDraft({ collectionUid: draft.collectionUid, folderUid: draft.folderUid }));
            break;
          case 'collection-environment':
            dispatch(clearEnvironmentsDraft({ collectionUid: draft.collectionUid }));
            break;
          case 'global-environment':
            dispatch(clearGlobalEnvironmentDraft());
            break;
          default:
            // Request drafts
            dispatch(deleteRequestDraft({ collectionUid: draft.collectionUid, itemUid: draft.uid }));
            break;
        }
      });
      dispatch(closeTabs({ tabUids: tabUidsToClose }));
    } else {
      dispatch(completeQuitFlow());
    }
    onClose();
  };

  const closeWithSave = async () => {
    try {
      // Separate drafts by type
      const collectionDrafts = allDrafts.filter((d) => d.type === 'collection');
      const folderDrafts = allDrafts.filter((d) => d.type === 'folder');
      const requestDrafts = allDrafts.filter((d) => isItemARequest(d));
      const collectionEnvironmentDrafts = allDrafts.filter((d) => d.type === 'collection-environment');
      const globalEnvironmentDrafts = allDrafts.filter((d) => d.type === 'global-environment');

      const allEnvironmentDrafts = [...collectionEnvironmentDrafts, ...globalEnvironmentDrafts];
      const hasInvalidEnvDraft = allEnvironmentDrafts.some((draft) => hasInvalidVariableNames(draft.variables));
      if (hasInvalidEnvDraft) {
        toast.error('Please fix validation errors before saving');
        return;
      }

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

      if (forceCloseTabs) {
        dispatch(closeTabs({ tabUids: tabUidsToClose }));
      } else {
        dispatch(completeQuitFlow());
      }
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
          <Button color="secondary" variant="ghost" onClick={onClose}>
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
