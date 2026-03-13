import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import commandRegistry from '../../services/command-registry';
import {
  saveRequest,
  saveFolderRoot,
  saveCollectionSettings,
  saveMultipleRequests,
  sendRequest
} from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection, hasRequestChanges } from 'utils/collections';
import { closeTabs, requestCloseConfirmation } from 'providers/ReduxStore/slices/tabs';

/**
 * CommandInitializer - Registers commands with CommandRegistry
 * Uses useSelector to get fresh state for command handlers
 */
const CommandInitializer = () => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  useEffect(() => {
    // Register save command with fresh state from useSelector
    commandRegistry.register('save', () => {
      console.log('[CommandInitializer] Save command executed!');
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);

      if (activeTab) {
        if (activeTab.type === 'environment-settings' || activeTab.type === 'global-environment-settings') {
          window.dispatchEvent(new CustomEvent('environment-save'));
          return;
        }

        const collection = findCollectionByUid(collections, activeTab.collectionUid);
        if (collection) {
          const item = findItemInCollection(collection, activeTab.uid);
          if (item && item.uid) {
            if (activeTab.type === 'folder-settings') {
              dispatch(saveFolderRoot(collection.uid, item.uid));
            } else {
              dispatch(saveRequest(activeTab.uid, activeTab.collectionUid));
            }
          } else if (activeTab.type === 'collection-settings') {
            dispatch(saveCollectionSettings(collection.uid));
          }
        }
      }
    }, {
      name: 'Save',
      description: 'Save the current request',
      when: 'always'
    });

    console.log('[CommandInitializer] Save command registered');

    // Register saveAllTabs command
    commandRegistry.register('saveAllTabs', () => {
      console.log('[CommandInitializer] saveAllTabs command executed!');

      // Get all tabs that have items (request tabs with uid)
      tabs.forEach((tab) => {
        switch (tab.type) {
          case 'environment-settings':
          case 'global-environment-settings': {
            dispatch({ type: 'app/ENVIRONMENT_SAVE' });
            break;
          }

          case 'collection-settings': {
            const collection = findCollectionByUid(collections, tab.collectionUid);
            if (collection?.draft) {
              dispatch(saveCollectionSettings(collection.uid));
            }
            break;
          }

          case 'folder-settings':
          case 'request': {
            const collection = findCollectionByUid(collections, tab.collectionUid);
            const item = findItemInCollection(collection, tab.uid);

            if (item?.draft) {
              if (tab.type === 'folder-settings') {
                dispatch(saveFolderRoot(collection.uid, item.uid));
              } else {
                dispatch(saveRequest(tab.uid, tab.collectionUid));
              }
            }
            break;
          }
        }
      });
    }, {
      name: 'Save All Tabs',
      description: 'Save all open request tabs',
      when: 'always'
    });

    console.log('[CommandInitializer] saveAllTabs command registered');

    // Register sendRequest command
    commandRegistry.register('sendRequest', () => {
      console.log('[CommandInitializer] sendRequest command executed!');

      const activeTab = tabs?.find((t) => t.uid === activeTabUid);

      if (activeTab) {
        // Get the collection
        const collection = findCollectionByUid(collections, activeTab.collectionUid);
        if (collection) {
          // Find the item in the collection
          const item = findItemInCollection(collection, activeTab.uid);
          if (item && item.uid) {
            // Dispatch sendRequest action
            dispatch(sendRequest(item, activeTab.collectionUid));
          }
        }
      }
    }, {
      name: 'Send Request',
      description: 'Send the current request',
      when: 'editorTextFocus || activeTabIsRequest'
    });

    console.log('[CommandInitializer] sendRequest command registered');

    // Register closeTab command
    commandRegistry.register('closeTab', () => {
      console.log('[CommandInitializer] closeTab command executed!');

      const activeTab = tabs?.find((t) => t.uid === activeTabUid);

      if (!activeTab) {
        return;
      }

      // Non-closable tabs
      const nonClosableTypes = ['workspaceOverview', 'workspaceEnvironments'];
      if (nonClosableTypes.includes(activeTab.type)) {
        return;
      }

      // Get the collection for this tab
      const collection = findCollectionByUid(collections, activeTab.collectionUid);

      // Check for unsaved changes based on tab type
      let hasUnsavedChanges = false;

      if (activeTab.type === 'request' || activeTab.type === 'grpc-request' || activeTab.type === 'ws-request' || activeTab.type === 'graphql-request') {
        // Request tab - check for draft
        const item = collection ? findItemInCollection(collection, activeTab.uid) : null;
        hasUnsavedChanges = item ? hasRequestChanges(item) : false;
      } else if (activeTab.type === 'collection-settings') {
        hasUnsavedChanges = !!collection?.draft;
      } else if (activeTab.type === 'folder-settings') {
        const folder = collection ? findItemInCollection(collection, activeTab.uid) : null;
        hasUnsavedChanges = !!folder?.draft;
      } else if (activeTab.type === 'environment-settings') {
        hasUnsavedChanges = !!collection?.environmentsDraft;
      } else if (activeTab.type === 'global-environment-settings') {
        // Need to check global environment draft - use selector
        const globalEnvironmentDraft = window.__REDUX_STORE__?.getState?.()?.globalEnvironments?.globalEnvironmentDraft;
        hasUnsavedChanges = !!globalEnvironmentDraft;
      }

      if (hasUnsavedChanges) {
        // Dispatch action to show close confirmation modal via Redux
        dispatch(requestCloseConfirmation({ uid: activeTab.uid }));
      } else {
        // No unsaved changes, close directly
        dispatch(closeTabs({ tabUids: [activeTab.uid] }));
      }
    }, {
      name: 'Close Tab',
      description: 'Close the current tab',
      when: 'activeTabIsClosable'
    });

    console.log('[CommandInitializer] closeTab command registered');
  }, [dispatch, tabs, collections, activeTabUid]);

  return null;
};

export default CommandInitializer;
