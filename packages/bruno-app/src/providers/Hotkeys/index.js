import React, { createContext, useContext } from 'react';
import toast from 'react-hot-toast';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { useSelector } from 'react-redux';

import NewRequest from 'components/Sidebar/NewRequest/index';
import NetworkError from 'components/ResponsePane/NetworkError';
import GlobalSearchModal from 'components/GlobalSearchModal/index';
import CloneCollection from 'components/Sidebar/Collections/Collection/CloneCollection/index';
import CloneCollectionItem from 'components/Sidebar/Collections/Collection/CollectionItem/CloneCollectionItem/index';

import { findCollectionByUid, findItemInCollection, hasRequestChanges } from 'utils/collections/index';

import store from 'providers/ReduxStore/index';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { closeWorkspaceTab } from 'providers/ReduxStore/slices/workspaceTabs';
import { addTab, closeTabs, reorderTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import { sendRequest, saveRequest, saveFolderRoot, saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';

import { getKeyBindingsForActionAllOS } from './keyMappings';
import {
  openNewRequestModal,
  toggleSideSearch,
  toggleGlobalSearch,
  toggleSidebarCollapse,
  closeNewRequestModal,
  closeCollectionCloneModal,
  closeCollectionCloneItemModal,
  openCollectionCloneModal,
  openCollectionCloneItemModal,
  toggleConfirmRequestModal,
  toggleShowImportCollectionModal
} from 'providers/ReduxStore/slices/keyBindings';

export const HotkeysContext = createContext(null);

// -----------------------
// Hotkeys registration (NO hooks)
// -----------------------
let HOTKEYS_INITIALIZED = false;

function bindHotkey(action, handler) {
  const bindings = getKeyBindingsForActionAllOS(action);
  if (!bindings) return;
  const keys = [...bindings];

  // avoid duplicate binds (dev/hmr safe)
  Mousetrap.unbind(keys);

  Mousetrap.bind(keys, (e) => {
    e?.preventDefault?.();
    handler(e);
    // Mousetrap: returning false prevents bubbling + default
    return false;
  });
}

function initHotkeysOnce() {
  if (HOTKEYS_INITIALIZED) return;
  HOTKEYS_INITIALIZED = true;

  const { dispatch, getState } = store;

  // SAVE
  bindHotkey('save', () => {
    const state = getState();
    const tabs = state.tabs.tabs;
    const collections = state.collections.collections;
    const activeTabUid = state.tabs.activeTabUid;

    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return;

    if (activeTab.type === 'environment-settings' || activeTab.type === 'global-environment-settings') {
      window.dispatchEvent(new CustomEvent('environment-save'));
      return;
    }

    const collection = findCollectionByUid(collections, activeTab.collectionUid);
    if (!collection) return;

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
  });

  // SEND REQUEST (Ctrl/Cmd + Enter)
  bindHotkey('sendRequest', () => {
    const state = getState();
    const tabs = state.tabs.tabs;
    const collections = state.collections.collections;
    const activeTabUid = state.tabs.activeTabUid;

    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return;

    const collection = findCollectionByUid(collections, activeTab.collectionUid);
    if (!collection) return;

    const item = findItemInCollection(collection, activeTab.uid);
    if (!item) return;

    if (item.type === 'grpc-request') {
      const request = item.draft ? item.draft.request : item.request;
      if (!request.url) {
        toast.error('Please enter a valid gRPC server URL');
        return;
      }
      if (!request.method) {
        toast.error('Please select a gRPC method');
        return;
      }
    }

    dispatch(sendRequest(item, collection.uid)).catch(() =>
      toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, { duration: 5000 })
    );
  });

  // EDIT ENV (Ctrl/Cmd + E)
  bindHotkey('editEnvironment', () => {
    const state = getState();
    const tabs = state.tabs.tabs;
    const collections = state.collections.collections;
    const activeTabUid = state.tabs.activeTabUid;

    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return;

    const collection = findCollectionByUid(collections, activeTab.collectionUid);
    if (!collection) return;

    dispatch(
      addTab({
        uid: `${collection.uid}-environment-settings`,
        collectionUid: collection.uid,
        type: 'environment-settings'
      })
    );
  });

  // CLONE ITEM (Ctrl/Cmd + D)
  bindHotkey('cloneItem', () => {
    const state = getState();
    const tabs = state.tabs.tabs;
    const collections = state.collections.collections;
    const activeTabUid = state.tabs.activeTabUid;

    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return;

    const collection = findCollectionByUid(collections, activeTab.collectionUid);
    const item = collection ? findItemInCollection(collection, activeTab.uid) : null;

    switch (activeTab.type) {
      case 'request':
      case 'folder-settings':
        if (item) dispatch(openCollectionCloneItemModal({ item, collectionUid: activeTab.collectionUid }));
        break;
      case 'collection-settings':
        dispatch(openCollectionCloneModal({ collectionUid: activeTab.collectionUid }));
        break;
      default:
        break;
    }
  });

  // NEW REQUEST (Ctrl/Cmd + N)
  bindHotkey('newRequest', () => {
    const state = getState();
    const tabs = state.tabs.tabs;
    const collections = state.collections.collections;
    const activeTabUid = state.tabs.activeTabUid;

    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return;

    // Keep original behavior: only open in collection-settings or folder-settings
    if (activeTab.type === 'collection-settings') {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);
      if (collection) dispatch(openNewRequestModal({ collectionUid: collection.uid }));
      return;
    }

    if (activeTab.type === 'folder-settings') {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);
      const item = collection ? findItemInCollection(collection, activeTab.uid) : null;
      if (collection) dispatch(openNewRequestModal({ item, collectionUid: collection.uid }));
    }
  });

  // GLOBAL SEARCH (Ctrl/Cmd + K)
  bindHotkey('globalSearch', () => {
    dispatch(toggleGlobalSearch());
  });

  // IMPORT COLLECTION (Ctrl/Cmd + O)
  bindHotkey('importCollection', () => {
    dispatch(toggleShowImportCollectionModal({ show: true }));
  });

  // SIDEBAR SEARCH (Ctrl/Cmd + F)
  bindHotkey('sidebarSearch', () => {
    dispatch(toggleSideSearch());
  });

  // CLOSE TAB
  bindHotkey('closeTab', () => {
    const state = getState();
    const tabs = state.tabs.tabs;
    const activeTabUid = state.tabs.activeTabUid;
    const collections = state.collections.collections;
    const showHomePage = state.app.showHomePage;
    const activeWorkspaceTabUid = state.workspaceTabs.activeTabUid;

    const activeTab = find(tabs, (t) => t.uid === activeTabUid);

    if (activeTab?.type === 'request') {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);
      const item = collection ? findItemInCollection(collection, activeTab.uid) : null;

      if (item && hasRequestChanges(item)) {
        dispatch(toggleConfirmRequestModal({ show: true }));
        return;
      }

      if (activeTabUid) dispatch(closeTabs({ tabUids: [activeTabUid] }));
      return;
    }

    if (showHomePage && activeWorkspaceTabUid) {
      dispatch(closeWorkspaceTab({ uid: activeWorkspaceTabUid }));
      return;
    }

    if (activeTabUid) {
      dispatch(closeTabs({ tabUids: [activeTabUid] }));
    }
  });

  // SWITCH PREV TAB
  bindHotkey('switchToPreviousTab', () => {
    dispatch(switchTab({ direction: 'pageup' }));
  });

  // SWITCH NEXT TAB
  bindHotkey('switchToNextTab', () => {
    dispatch(switchTab({ direction: 'pagedown' }));
  });

  // CLOSE ALL TABS
  bindHotkey('closeAllTabs', () => {
    const state = getState();
    const tabs = state.tabs.tabs;
    const collections = state.collections.collections;
    const activeTabUid = state.tabs.activeTabUid;

    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return;

    const collection = findCollectionByUid(collections, activeTab.collectionUid);
    if (!collection) return;

    const tabUids = tabs.filter((tab) => tab.collectionUid === collection.uid).map((tab) => tab.uid);
    dispatch(closeTabs({ tabUids }));
  });

  // COLLAPSE SIDEBAR
  bindHotkey('collapseSidebar', () => {
    dispatch(toggleSidebarCollapse());
  });

  // MOVE TAB LEFT
  bindHotkey('moveTabLeft', () => {
    dispatch(reorderTabs({ direction: -1 }));
  });

  // MOVE TAB RIGHT
  bindHotkey('moveTabRight', () => {
    dispatch(reorderTabs({ direction: 1 }));
  });

  // CHANGE LAYOUT
  bindHotkey('changeLayout', () => {
    const state = getState();
    const preferences = state.app.preferences;
    const orientation = preferences?.layout?.responsePaneOrientation || 'horizontal';
    const newOrientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';

    const updatedPreferences = {
      ...preferences,
      layout: {
        ...(preferences?.layout || {}),
        responsePaneOrientation: newOrientation
      }
    };

    dispatch(savePreferences(updatedPreferences));
  });
}

// init immediately at module load (no hooks, no render-time side effects)
initHotkeysOnce();

// -----------------------
// Provider (NO useEffect)
// -----------------------
export const HotkeysProvider = (props) => {
  // Only for rendering modals (reactive)
  const {
    newRequestModal,
    showGlobalSearch,
    cloneCollectionModal,
    cloneCollectionItemModal
  } = useSelector((state) => state.keyBindings);

  const collectionUidForNewRequest = newRequestModal?.collectionUid;

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      {newRequestModal.open && collectionUidForNewRequest && (
        <NewRequest
          item={newRequestModal.item ? newRequestModal.item : null}
          collectionUid={collectionUidForNewRequest}
          onClose={() => store.dispatch(closeNewRequestModal())}
        />
      )}

      {showGlobalSearch && (
        <GlobalSearchModal
          isOpen={showGlobalSearch}
          onClose={() => store.dispatch(toggleGlobalSearch())}
        />
      )}

      {cloneCollectionModal.open && (
        <CloneCollection
          collectionUid={cloneCollectionModal.collectionUid}
          onClose={() => store.dispatch(closeCollectionCloneModal())}
        />
      )}

      {cloneCollectionItemModal.open && (
        <CloneCollectionItem
          item={cloneCollectionItemModal.item}
          collectionUid={cloneCollectionItemModal.collectionUid}
          onClose={() => store.dispatch(closeCollectionCloneItemModal())}
        />
      )}

      <div>{props.children}</div>
    </HotkeysContext.Provider>
  );
};

export const useHotkeys = () => {
  const context = useContext(HotkeysContext);
  if (!context) throw new Error('useHotkeys must be used within a HotkeysProvider');
  return context;
};

export default HotkeysProvider;
