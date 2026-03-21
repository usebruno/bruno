import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import commandRegistry from '../../services/command-registry';
import {
  saveRequest,
  saveFolderRoot,
  saveCollectionSettings,
  saveMultipleRequests,
  sendRequest,
  pasteItem as pasteItemAction
} from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection, hasRequestChanges, findParentItemInCollection } from 'utils/collections';
import { addTab, closeTabs, closeAllCollectionTabs, requestCloseConfirmation, requestCloseAllConfirmation, reorderTabs, focusTab, removeFromClosedTabs } from 'providers/ReduxStore/slices/tabs';
import { setCollectionSearchActive, setRenameModalItem, setCloneModalItem, copyRequest, savePreferences, setNewRequestModalItem, setImportCollectionModalOpen, toggleSidebarCollapse, setGlobalSearchOpen } from 'providers/ReduxStore/slices/app';
import { openDevtoolsAndSwitchToTerminal } from 'utils/terminal';
import toast from 'react-hot-toast';

/**
 * CommandInitializer - Registers commands with CommandRegistry
 * Uses useSelector to get fresh state for command handlers
 */
const CommandInitializer = () => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const sidebarSelectedItem = useSelector((state) => state.app.sidebarSelectedItem);
  const preferences = useSelector((state) => state.app.preferences);
  const closedTabs = useSelector((state) => state.tabs.closedTabs);
  const lastActiveCollectionUid = useSelector((state) => state.tabs.lastActiveCollectionUid);

  useEffect(() => {
    const unregisters = [];

    // ==== TABS ====
    // Register save command with fresh state from useSelector
    commandRegistry.register('save', () => {
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
      when: 'always',
      scope: 'global'
    });

    // Register saveAllTabs command
    commandRegistry.register('saveAllTabs', () => {
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
      when: 'always',
      scope: 'global'
    });

    // Register sendRequest command
    commandRegistry.register('sendRequest', () => {
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
      when: 'editorTextFocus || activeTabIsRequest',
      scope: 'global'
    });

    // Register closeTab command
    commandRegistry.register('closeTab', () => {
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);

      if (!activeTab) {
        return;
      }

      // Their are many non-changes track tabs (no dirty state so they fall back to !hasUnsavedChanges) - Runner, Variables, OpenAPI
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
      when: 'activeTabIsClosable',
      scope: 'global'
    });

    // Register closeAllTabs command
    commandRegistry.register('closeAllTabs', () => {
      // Scope to active collection
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const activeCollectionUid = activeTab?.collectionUid;
      const collectionTabs = tabs?.filter((t) => t.collectionUid === activeCollectionUid) || [];

      if (collectionTabs.length === 0) {
        return;
      }

      // Their are many non-changes track tabs (no dirty state so they fall back to !hasUnsavedChanges) - Runner, Variables, OpenAPI
      // Non-closable tab types that should never be closed
      const nonClosableTypes = ['workspaceOverview', 'workspaceEnvironments'];

      // Filter out non-closable tabs within the active collection
      const closableTabs = collectionTabs.filter((tab) => !nonClosableTypes.includes(tab.type));

      if (closableTabs.length === 0) {
        return; // Nothing to close
      }

      // Check if any closable tab has unsaved changes
      let hasUnsavedChanges = false;

      closableTabs.forEach((tab) => {
        const collection = findCollectionByUid(collections, tab.collectionUid);
        if (!collection) return;

        // Check based on tab type
        if (tab.type === 'collection-settings' && collection.draft) {
          hasUnsavedChanges = true;
        } else if (tab.type === 'folder-settings') {
          const folder = findItemInCollection(collection, tab.uid);
          if (folder?.draft) {
            hasUnsavedChanges = true;
          }
        } else if (tab.type === 'environment-settings' && collection.environmentsDraft) {
          hasUnsavedChanges = true;
        } else if (tab.type === 'global-environment-settings') {
          const globalEnvironmentDraft = window.__REDUX_STORE__?.getState?.()?.globalEnvironments?.globalEnvironmentDraft;
          if (globalEnvironmentDraft) {
            hasUnsavedChanges = true;
          }
        } else if (tab.type === 'request' || tab.type === 'grpc-request' || tab.type === 'ws-request' || tab.type === 'graphql-request') {
          const item = findItemInCollection(collection, tab.uid);
          if (item && hasRequestChanges(item)) {
            hasUnsavedChanges = true;
          }
        }
      });

      if (hasUnsavedChanges) {
        // Dispatch action to show SaveRequestsModal
        dispatch(requestCloseAllConfirmation());
      } else {
        // Close only closable tabs in the active collection
        const tabUids = closableTabs.map((t) => t.uid);
        dispatch(closeTabs({ tabUids }));
      }
    }, {
      name: 'Close All Tabs',
      description: 'Close all open tabs in the active collection',
      when: 'multipleTabsOpen',
      scope: 'global'
    });

    // Register switchToPreviousTab command
    const unregisterPrevTab = commandRegistry.register('switchToPreviousTab', () => {
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const activeCollectionUid = activeTab?.collectionUid;
      const collectionTabs = tabs?.filter((t) => t.collectionUid === activeCollectionUid) || [];
      if (collectionTabs.length <= 1) return;

      const currentIndex = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      const prevIndex = (currentIndex - 1 + collectionTabs.length) % collectionTabs.length;
      dispatch(focusTab({ uid: collectionTabs[prevIndex].uid }));
      window.scrollActiveTabIntoView?.();
    }, {
      name: 'Previous Tab',
      description: 'Switch to the previous tab in the active collection',
      when: 'hasOpenTabs',
      scope: 'global'
    });
    unregisters.push(unregisterPrevTab);

    // Register switchToNextTab command
    const unregisterNextTab = commandRegistry.register('switchToNextTab', () => {
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const activeCollectionUid = activeTab?.collectionUid;
      const collectionTabs = tabs?.filter((t) => t.collectionUid === activeCollectionUid) || [];
      if (collectionTabs.length <= 1) return;

      const currentIndex = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      const nextIndex = (currentIndex + 1) % collectionTabs.length;
      dispatch(focusTab({ uid: collectionTabs[nextIndex].uid }));
      window.scrollActiveTabIntoView?.();
    }, {
      name: 'Next Tab',
      description: 'Switch to the next tab in the active collection',
      when: 'hasOpenTabs',
      scope: 'global'
    });
    unregisters.push(unregisterNextTab);

    // Register moveTabLeft command
    const unregisterMoveTabLeft = commandRegistry.register('moveTabLeft', () => {
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const activeCollectionUid = activeTab?.collectionUid;
      const collectionTabs = tabs?.filter((t) => t.collectionUid === activeCollectionUid) || [];
      if (collectionTabs.length <= 1) return;

      const currentIndex = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      const targetIndex = currentIndex - 1;
      if (targetIndex < 0) return; // Already at the leftmost position in collection

      dispatch(reorderTabs({ sourceUid: activeTabUid, targetUid: collectionTabs[targetIndex].uid }));
    }, {
      name: 'Move Tab Left',
      description: 'Move the active tab to the left within the active collection',
      when: 'multipleTabsOpen',
      scope: 'global'
    });
    unregisters.push(unregisterMoveTabLeft);

    // Register moveTabRight command
    const unregisterMoveTabRight = commandRegistry.register('moveTabRight', () => {
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const activeCollectionUid = activeTab?.collectionUid;
      const collectionTabs = tabs?.filter((t) => t.collectionUid === activeCollectionUid) || [];
      if (collectionTabs.length <= 1) return;

      const currentIndex = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      const targetIndex = currentIndex + 1;
      if (targetIndex >= collectionTabs.length) return; // Already at the rightmost position in collection

      dispatch(reorderTabs({ sourceUid: activeTabUid, targetUid: collectionTabs[targetIndex].uid }));
    }, {
      name: 'Move Tab Right',
      description: 'Move the active tab to the right within the active collection',
      when: 'multipleTabsOpen',
      scope: 'global'
    });
    unregisters.push(unregisterMoveTabRight);

    // Register switchToTab commands (Tab 1-8)
    for (let i = 1; i <= 8; i++) {
      const tabNumber = i;
      const unregisterSwitchToTab = commandRegistry.register(`switchToTab${tabNumber}`, () => {
        const activeTab = tabs?.find((t) => t.uid === activeTabUid);
        const activeCollectionUid = activeTab?.collectionUid;
        const collectionTabs = tabs?.filter((t) => t.collectionUid === activeCollectionUid) || [];

        const tab = collectionTabs[tabNumber - 1]; // scoped to active collection
        if (tab) {
          dispatch(focusTab({ uid: tab.uid }));
          window.scrollActiveTabIntoView?.();
        }
      }, {
        name: `Switch to Tab ${tabNumber}`,
        description: `Switch to tab ${tabNumber} in the active collection`,
        when: 'hasOpenTabs',
        scope: 'global'
      });
      unregisters.push(unregisterSwitchToTab);
    }

    // Register switchToLastTab command
    const unregisterSwitchToLastTab = commandRegistry.register('switchToLastTab', () => {
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const activeCollectionUid = activeTab?.collectionUid;
      const collectionTabs = tabs?.filter((t) => t.collectionUid === activeCollectionUid) || [];

      if (collectionTabs.length > 0) {
        const lastTab = collectionTabs[collectionTabs.length - 1];
        dispatch(focusTab({ uid: lastTab.uid }));
        window.scrollActiveTabIntoView?.();
      }
    }, {
      name: 'Switch to Last Tab',
      description: 'Switch to the last tab in the active collection',
      when: 'multipleTabsOpen',
      scope: 'global'
    });
    unregisters.push(unregisterSwitchToLastTab);

    // ==== TERMINAL ====
    // Register openTerminal command
    const unregisterOpenTerminal = commandRegistry.register('openTerminal', async () => {
      // Get active tab
      const activeTab = tabs.find((t) => t.uid === activeTabUid);
      const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

      // Check if active tab is a collection or folder settings tab
      if (activeTab) {
        if (activeTab.type === 'collection-settings' && activeTab.collectionUid) {
          const collection = collections?.find((c) => c.uid === activeTab.collectionUid);
          if (collection?.pathname) {
            await openDevtoolsAndSwitchToTerminal(dispatch, collection.pathname);
            return;
          }
        } else if (activeTab.type === 'folder-settings' && activeTab.collectionUid && activeTab.uid) {
          const collection = collections?.find((c) => c.uid === activeTab.collectionUid);
          if (collection) {
            const item = findItemInCollection(collection, activeTab.uid);
            if (item) {
              await openDevtoolsAndSwitchToTerminal(dispatch, item.pathname);
              return;
            }
          }
        }
      }

      // Default to workspace root
      if (activeWorkspace?.pathname) {
        await openDevtoolsAndSwitchToTerminal(dispatch, activeWorkspace.pathname);
      }
    }, {
      name: 'Open in Terminal',
      description: 'Open terminal at the current context path',
      scope: 'global'
    });
    unregisters.push(unregisterOpenTerminal);

    // ==== SIDEBAR ====
    // Register sidebarSearch command
    const unregisterSidebarSearch = commandRegistry.register('sidebarSearch', () => {
      dispatch(setCollectionSearchActive(true));
    }, {
      name: 'Search in Sidebar',
      description: 'Focus the collection search input in the sidebar',
      scope: 'global'
    });
    unregisters.push(unregisterSidebarSearch);

    // Register renameItem command
    commandRegistry.register('renameItem', () => {
      if (sidebarSelectedItem) {
        dispatch(setRenameModalItem(sidebarSelectedItem));
      }
    }, {
      name: 'Rename Item',
      description: 'Rename the selected collection item',
      when: 'sidebarVisible && sidebarItemFocused && !inModal'
    });

    // Register cloneItem command
    commandRegistry.register('cloneItem', () => {
      if (sidebarSelectedItem) {
        dispatch(setCloneModalItem(sidebarSelectedItem));
      }
    }, {
      name: 'Clone Item',
      description: 'Clone the selected collection item',
      when: 'sidebarVisible && sidebarItemFocused && !inModal'
    });

    // Register copyItem command
    commandRegistry.register('copyItem', () => {
      if (!sidebarSelectedItem) return;

      const { uid, collectionUid, type } = sidebarSelectedItem;

      // Collections can't be copied - only folders and requests
      if (type === 'collection') return;

      const collection = collections.find((c) => c.uid === collectionUid);
      if (!collection) return;

      const item = findItemInCollection(collection, uid);
      if (!item) return;

      dispatch(copyRequest(item));
      toast.success(`${item.type === 'folder' ? 'Folder' : 'Request'} copied`);
    }, {
      name: 'Copy Item',
      description: 'Copy the selected sidebar item',
      when: 'sidebarVisible && sidebarItemFocused && !inModal',
      scope: 'passthrough'
    });

    // Register pasteItem command
    commandRegistry.register('pasteItem', () => {
      if (!sidebarSelectedItem) return;

      const { uid, collectionUid, type } = sidebarSelectedItem;

      // Determine target: if collection/folder → paste into it; if request → paste into parent folder
      let targetCollectionUid = collectionUid;
      let targetItemUid = null;

      if (type === 'collection') {
        // Paste at collection root
        targetCollectionUid = uid;
        targetItemUid = null;
      } else if (type === 'folder') {
        // Should find parent of the folder, same as for requests
        const collection = collections.find((c) => c.uid === collectionUid);
        if (collection) {
          const parentFolder = findParentItemInCollection(collection, uid);
          targetItemUid = parentFolder ? parentFolder.uid : null; // null = collection root
        }
      } else {
        // Request — find parent folder
        const collection = collections.find((c) => c.uid === collectionUid);
        if (collection) {
          const parentFolder = findParentItemInCollection(collection, uid);
          targetItemUid = parentFolder ? parentFolder.uid : null;
        }
      }

      dispatch(pasteItemAction(targetCollectionUid, targetItemUid))
        .then(() => toast.success('Item pasted successfully'))
        .catch((err) => toast.error(err?.message || 'An error occurred while pasting'));
    }, {
      name: 'Paste Item',
      description: 'Paste into the selected sidebar item',
      when: 'sidebarVisible && sidebarItemFocused && !inModal',
      scope: 'passthrough'
    });

    // Register changeLayout command
    commandRegistry.register('changeLayout', () => {
      const orientation = preferences?.layout?.responsePaneOrientation || 'horizontal';
      const newOrientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
      const updatedPreferences = {
        ...preferences,
        layout: {
          ...preferences?.layout,
          responsePaneOrientation: newOrientation
        }
      };
      dispatch(savePreferences(updatedPreferences));
    }, {
      name: 'Change Orientation',
      description: 'Toggle response pane between horizontal and vertical layout',
      when: 'always',
      scope: 'global'
    });

    // Register newRequest command
    commandRegistry.register('newRequest', () => {
      if (sidebarSelectedItem) {
        // Only allow newRequest on collections and folders, not on individual requests
        if (sidebarSelectedItem.type === 'collection' || sidebarSelectedItem.type === 'folder') {
          dispatch(setNewRequestModalItem(sidebarSelectedItem));
        }
      }
    }, {
      name: 'New Request',
      description: 'Create a new request in the selected collection or folder',
      when: 'sidebarVisible && sidebarItemFocused && !inModal',
      scope: 'sidebar'
    });

    // ==== PREFERENCES ====
    commandRegistry.register('openPreferences', () => {
      const activeWorkspace = workspaces?.find((w) => w.uid === activeWorkspaceUid);
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const collectionUid = activeTab?.collectionUid || activeWorkspace?.scratchCollectionUid;

      dispatch(
        addTab({
          type: 'preferences',
          uid: collectionUid ? `${collectionUid}-preferences` : 'preferences',
          collectionUid
        })
      );
    }, {
      name: 'Open Preferences',
      description: 'Open the preferences window',
      when: 'always',
      scope: 'global'
    });

    // ==== APP ====
    commandRegistry.register('closeBruno', () => {
      const { ipcRenderer } = window;
      ipcRenderer?.send('renderer:window-close');
    }, {
      name: 'Close Bruno',
      description: 'Quit the application',
      when: 'always',
      scope: 'global'
    });

    // ==== ZOOM ====
    const ZOOM_MIN = 50;
    const ZOOM_MAX = 150;
    const ZOOM_STEP = 10;
    const ZOOM_DEFAULT = 100;
    const { ipcRenderer } = window;
    const { percentageToZoomLevel } = require('@usebruno/common');

    const applyZoom = (newPercentage) => {
      const clamped = Math.min(Math.max(newPercentage, ZOOM_MIN), ZOOM_MAX);
      if (ipcRenderer) {
        ipcRenderer.invoke('renderer:set-zoom-level', percentageToZoomLevel(clamped));
      }
      const updatedPreferences = {
        ...preferences,
        display: {
          ...(preferences?.display || {}),
          zoomPercentage: clamped
        }
      };
      dispatch(savePreferences(updatedPreferences));
    };

    commandRegistry.register('zoomIn', () => {
      const current = preferences?.display?.zoomPercentage || ZOOM_DEFAULT;
      applyZoom(current + ZOOM_STEP);
    }, {
      name: 'Zoom In',
      description: 'Increase the interface zoom level',
      when: 'always',
      scope: 'global'
    });

    commandRegistry.register('zoomOut', () => {
      const current = preferences?.display?.zoomPercentage || ZOOM_DEFAULT;
      applyZoom(current - ZOOM_STEP);
    }, {
      name: 'Zoom Out',
      description: 'Decrease the interface zoom level',
      when: 'always',
      scope: 'global'
    });

    commandRegistry.register('resetZoom', () => {
      applyZoom(ZOOM_DEFAULT);
    }, {
      name: 'Reset Zoom',
      description: 'Reset the interface zoom to 100%',
      when: 'always',
      scope: 'global'
    });

    // ==== COLLECTIONS ====
    commandRegistry.register('importCollection', () => {
      dispatch(setImportCollectionModalOpen());
    }, {
      name: 'Import Collection',
      description: 'Open the import collection dialog',
      when: 'always',
      scope: 'global'
    });

    // ==== ENVIRONMENT ====
    commandRegistry.register('editEnvironment', () => {
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const collectionUid = activeTab?.collectionUid;
      if (!collectionUid) return;

      // Only open environment for real collections, not scratch collections
      const collection = findCollectionByUid(collections, collectionUid);
      if (!collection) return;

      const activeWorkspace = workspaces?.find((w) => w.uid === activeWorkspaceUid);
      if (activeWorkspace?.scratchCollectionUid === collectionUid) return;

      dispatch(addTab({
        uid: `${collectionUid}-environment-settings`,
        collectionUid,
        type: 'environment-settings'
      }));
    }, {
      name: 'Edit Environment',
      description: 'Open collection environment settings',
      when: 'hasOpenTabs',
      scope: 'global'
    });

    // ==== SIDEBAR ====
    commandRegistry.register('collapseSidebar', () => {
      dispatch(toggleSidebarCollapse());
    }, {
      name: 'Collapse Sidebar',
      description: 'Toggle sidebar visibility',
      when: 'always',
      scope: 'global'
    });

    // ==== SEARCH ====
    commandRegistry.register('globalSearch', () => {
      dispatch(setGlobalSearchOpen());
    }, {
      name: 'Global Search',
      description: 'Open global search',
      when: 'always',
      scope: 'global'
    });

    // ==== REOPEN LAST CLOSED TAB ====
    commandRegistry.register('reopenLastClosedTab', () => {
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);
      const activeCollectionUid = activeTab?.collectionUid ?? lastActiveCollectionUid;
      if (!activeCollectionUid) return;

      const openUids = new Set(
        (tabs || []).filter((t) => t.collectionUid === activeCollectionUid).map((t) => t.uid)
      );

      // Types that have no corresponding item in the collection tree
      const nonItemTypes = [
        'global-environment-settings',
        'preferences',
        'collection-settings',
        'environment-settings',
        'variables',
        'collection-runner'
      ];

      const collection = findCollectionByUid(collections, activeCollectionUid);
      const stack = (closedTabs || []).filter((t) => t.collectionUid === activeCollectionUid);

      for (let i = stack.length - 1; i >= 0; i--) {
        const entry = stack[i];

        // E1: already open — remove stale entry and skip
        if (openUids.has(entry.uid)) {
          dispatch(removeFromClosedTabs({ uid: entry.uid, collectionUid: activeCollectionUid }));
          continue;
        }

        // E2: item deleted from disk — remove stale entry and skip
        if (!nonItemTypes.includes(entry.type) && collection) {
          const item = findItemInCollection(collection, entry.uid);
          if (!item) {
            dispatch(removeFromClosedTabs({ uid: entry.uid, collectionUid: activeCollectionUid }));
            continue;
          }
        }

        // Reopen the tab
        dispatch(addTab({ ...entry, preview: false }));
        dispatch(removeFromClosedTabs({ uid: entry.uid, collectionUid: activeCollectionUid }));
        return;
      }
    }, {
      name: 'Reopen Last Closed Tab',
      description: 'Reopen the last closed tab for the active collection',
      when: '!inModal',
      scope: 'global'
    });
  }, [dispatch, tabs, collections, activeTabUid, workspaces, activeWorkspaceUid, sidebarSelectedItem, preferences, closedTabs, lastActiveCollectionUid]);

  return null;
};

export default CommandInitializer;
