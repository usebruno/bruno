import React, { createContext, useEffect, useContext, useRef, useState } from 'react';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

import NewRequest from 'components/Sidebar/NewRequest';
import NetworkError from 'components/ResponsePane/NetworkError';
import GlobalSearchModal from 'components/GlobalSearchModal';
import ImportCollection from 'components/Sidebar/ImportCollection';

import store from 'providers/ReduxStore/index';
import {
  sendRequest,
  saveRequest,
  saveCollectionRoot,
  saveFolderRoot,
  saveCollectionSettings,
  closeTabs,
  cloneItem,
  pasteItem
} from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { addTab, reorderTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import { savePreferences, toggleSidebarCollapse, copyRequest } from 'providers/ReduxStore/slices/app';
import { getKeyBindingsForActionAllOS } from './keyMappings';

export const HotkeysContext = createContext(null);

// List of all actions that are bound in this provider
const BOUND_ACTIONS = [
  'save',
  'sendRequest',
  'editEnvironment',
  'newRequest',
  'globalSearch',
  'closeTab',
  'switchToPreviousTab',
  'switchToNextTab',
  'closeAllTabs',
  'collapseSidebar',
  'moveTabLeft',
  'moveTabRight',
  'changeLayout',
  'closeBruno',
  'openPreferences',
  'importCollection',
  'sidebarSearch',
  'zoomIn',
  'zoomOut',
  'resetZoom',
  'cloneItem',
  'copyItem',
  'pasteItem'
];

/**
 * Bind a single hotkey action using Mousetrap.
 * Reads from merged defaults + user preferences via getKeyBindingsForActionAllOS.
 */
function bindHotkey(action, handler, userKeyBindings) {
  const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);
  if (!combos?.length) return;

  Mousetrap.bind([...combos], (e) => {
    e?.preventDefault?.();
    handler(e);
    return false;
  });
}

/**
 * Unbind a single hotkey action.
 */
function unbindHotkey(action, userKeyBindings) {
  const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);
  if (!combos?.length) return;
  Mousetrap.unbind([...combos]);
}

/**
 * Unbind all known actions for the given user key bindings.
 */
function unbindAllHotkeys(userKeyBindings) {
  BOUND_ACTIONS.forEach((action) => unbindHotkey(action, userKeyBindings));
}

/**
 * Bind all hotkey actions.
 */
function bindAllHotkeys(userKeyBindings) {
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

    if (item?.uid) {
      if (activeTab.type === 'folder-settings') {
        dispatch(saveFolderRoot(collection.uid, item.uid));
      } else {
        dispatch(saveRequest(activeTab.uid, activeTab.collectionUid));
      }
    } else if (activeTab.type === 'collection-settings') {
      dispatch(saveCollectionSettings(collection.uid));
    }
  }, userKeyBindings);

  // SEND REQUEST
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
      if (!request.url) return toast.error('Please enter a valid gRPC server URL');
      if (!request.method) return toast.error('Please select a gRPC method');
    }

    dispatch(sendRequest(item, collection.uid)).catch(() =>
      toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, { duration: 5000 })
    );
  }, userKeyBindings);

  // EDIT ENV
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
  }, userKeyBindings);

  // NEW REQUEST -> trigger via event so the provider can open the modal
  bindHotkey('newRequest', () => {
    window.dispatchEvent(new CustomEvent('new-request-open'));
  }, userKeyBindings);

  // GLOBAL SEARCH -> trigger via event so the provider can open the modal
  bindHotkey('globalSearch', () => {
    window.dispatchEvent(new CustomEvent('global-search-open'));
  }, userKeyBindings);

  // CLOSE TAB
  bindHotkey('closeTab', () => {
    window.dispatchEvent(new CustomEvent('close-active-tab'));
  }, userKeyBindings);

  // SWITCH PREV TAB
  bindHotkey('switchToPreviousTab', () => {
    dispatch(switchTab({ direction: 'pageup' }));
  }, userKeyBindings);

  // SWITCH NEXT TAB
  bindHotkey('switchToNextTab', () => {
    dispatch(switchTab({ direction: 'pagedown' }));
  }, userKeyBindings);

  // CLOSE ALL TABS
  bindHotkey('closeAllTabs', () => {
    window.dispatchEvent(new CustomEvent('close-active-tab'));
  }, userKeyBindings);

  // COLLAPSE SIDEBAR
  bindHotkey('collapseSidebar', () => {
    dispatch(toggleSidebarCollapse());
  }, userKeyBindings);

  // MOVE TAB LEFT
  bindHotkey('moveTabLeft', () => {
    dispatch(reorderTabs({ direction: -1 }));
  }, userKeyBindings);

  // MOVE TAB RIGHT
  bindHotkey('moveTabRight', () => {
    dispatch(reorderTabs({ direction: 1 }));
  }, userKeyBindings);

  // CHANGE LAYOUT -> toggle response pane orientation
  bindHotkey('changeLayout', () => {
    const state = getState();
    const preferences = state.app.preferences;
    const currentOrientation = preferences?.layout?.responsePaneOrientation || 'horizontal';
    const newOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    const updatedPreferences = {
      ...preferences,
      layout: {
        ...preferences.layout,
        responsePaneOrientation: newOrientation
      }
    };
    dispatch(savePreferences(updatedPreferences));
  }, userKeyBindings);

  // CLOSE BRUNO -> send IPC to close the window
  bindHotkey('closeBruno', () => {
    window.ipcRenderer?.send('renderer:window-close');
  }, userKeyBindings);

  // OPEN PREFERENCES -> open preferences tab
  bindHotkey('openPreferences', () => {
    const state = getState();
    const tabs = state.tabs.tabs;
    const activeTabUid = state.tabs.activeTabUid;
    const activeTab = tabs.find((t) => t.uid === activeTabUid);

    dispatch(
      addTab({
        type: 'preferences',
        uid: activeTab?.collectionUid ? `${activeTab.collectionUid}-preferences` : 'preferences',
        collectionUid: activeTab?.collectionUid
      })
    );
  }, userKeyBindings);

  // IMPORT COLLECTION -> trigger event to open import modal
  bindHotkey('importCollection', () => {
    window.dispatchEvent(new CustomEvent('import-collection-open'));
  }, userKeyBindings);

  // SIDEBAR SEARCH -> trigger event to focus sidebar search
  bindHotkey('sidebarSearch', () => {
    window.dispatchEvent(new CustomEvent('sidebar-search-open'));
  }, userKeyBindings);

  // ZOOM IN
  bindHotkey('zoomIn', () => {
    window.ipcRenderer?.invoke('renderer:zoom-in');
  }, userKeyBindings);

  // ZOOM OUT
  bindHotkey('zoomOut', () => {
    window.ipcRenderer?.invoke('renderer:zoom-out');
  }, userKeyBindings);

  // RESET ZOOM
  bindHotkey('resetZoom', () => {
    window.ipcRenderer?.invoke('renderer:reset-zoom');
  }, userKeyBindings);

  // CLONE ITEM -> trigger event so the sidebar can handle opening the clone modal
  bindHotkey('cloneItem', () => {
    window.dispatchEvent(new CustomEvent('clone-item-open'));
  }, userKeyBindings);

  // COPY ITEM -> copy currently selected item to clipboard
  bindHotkey('copyItem', () => {
    window.dispatchEvent(new CustomEvent('copy-item-open'));
  }, userKeyBindings);

  // PASTE ITEM -> paste from clipboard to current location
  bindHotkey('pasteItem', () => {
    window.dispatchEvent(new CustomEvent('paste-item-open'));
  }, userKeyBindings);
}

// -----------------------
// Provider (manages hotkey lifecycle + modal state)
// -----------------------
export const HotkeysProvider = (props) => {
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const userKeyBindings = useSelector((state) => state.app.preferences?.keyBindings);

  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [showImportCollectionModal, setShowImportCollectionModal] = useState(false);

  // Keep a ref to the previous userKeyBindings so we can unbind old combos
  const prevKeyBindingsRef = useRef(undefined);

  const getCurrentCollection = () => {
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return undefined;
    return findCollectionByUid(collections, activeTab.collectionUid);
  };

  const currentCollection = getCurrentCollection();

  // Bind/rebind hotkeys whenever user preferences change
  useEffect(() => {
    // Store previous bindings before updating
    const prevBindings = prevKeyBindingsRef.current;

    // Unbind previous bindings (if any)
    if (prevBindings !== undefined) {
      unbindAllHotkeys(prevBindings);
    }

    // Bind with current preferences
    bindAllHotkeys(userKeyBindings);
    prevKeyBindingsRef.current = userKeyBindings;

    return () => {
      // Cleanup on unmount
      unbindAllHotkeys(userKeyBindings);
    };
  }, [userKeyBindings]);

  // Listen for hotkey-triggered events for modals
  useEffect(() => {
    const openNewRequest = () => setShowNewRequestModal(true);
    const openGlobalSearch = () => setShowGlobalSearchModal(true);
    const openImportCollection = () => setShowImportCollectionModal(true);

    window.addEventListener('new-request-open', openNewRequest);
    window.addEventListener('global-search-open', openGlobalSearch);
    window.addEventListener('import-collection-open', openImportCollection);

    return () => {
      window.removeEventListener('new-request-open', openNewRequest);
      window.removeEventListener('global-search-open', openGlobalSearch);
      window.removeEventListener('import-collection-open', openImportCollection);
    };
  }, []);

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      {showNewRequestModal && (
        <NewRequest collectionUid={currentCollection?.uid} onClose={() => setShowNewRequestModal(false)} />
      )}
      {showGlobalSearchModal && (
        <GlobalSearchModal isOpen={showGlobalSearchModal} onClose={() => setShowGlobalSearchModal(false)} />
      )}
      {showImportCollectionModal && (
        <ImportCollection onClose={() => setShowImportCollectionModal(false)} />
      )}
      <div>{props.children}</div>
    </HotkeysContext.Provider>
  );
};

export const useHotkeys = () => {
  const context = useContext(HotkeysContext);

  if (!context) {
    throw new Error(`useHotkeys must be used within a HotkeysProvider`);
  }

  return context;
};

export default HotkeysProvider;
