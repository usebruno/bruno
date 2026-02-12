import React, { createContext, useContext } from 'react';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

import NewRequest from 'components/Sidebar/NewRequest/index';
import NetworkError from 'components/ResponsePane/NetworkError';
import GlobalSearchModal from 'components/GlobalSearchModal/index';
import ImportCollection from 'components/Sidebar/ImportCollection/index';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation/index';
import ConfirmCloseEnvironment from 'components/Environments/ConfirmCloseEnvironment';
import ConfirmFolderClose from 'components/RequestTabs/RequestTab/ConfirmFolderClose';
import CloneCollection from 'components/Sidebar/Collections/Collection/CloneCollection/index';
import ConfirmRequestClose from 'components/RequestTabs/RequestTab/ConfirmRequestClose/index';
import ConfirmCollectionClose from 'components/RequestTabs/RequestTab/ConfirmCollectionClose';
import CloneCollectionItem from 'components/Sidebar/Collections/Collection/CollectionItem/CloneCollectionItem/index';

import store from 'providers/ReduxStore/index';
import { savePreferences, copyRequest } from 'providers/ReduxStore/slices/app';
import { importCollection, pasteItem } from 'providers/ReduxStore/slices/collections/actions';

import { closeWorkspaceTab } from 'providers/ReduxStore/slices/workspaceTabs';
import { saveGlobalEnvironment, clearGlobalEnvironmentDraft } from 'providers/ReduxStore/slices/global-environments';
import { addTab, closeTabs, reorderTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import {
  sendRequest, saveCollectionSettings, saveRequest,
  saveCollectionRoot, saveFolderRoot, saveEnvironment
} from 'providers/ReduxStore/slices/collections/actions';
import {
  deleteRequestDraft,
  deleteCollectionDraft,
  deleteFolderDraft,
  clearEnvironmentsDraft
} from 'providers/ReduxStore/slices/collections';

import { closeWsConnection } from 'utils/network/index';
import { findCollectionByUid, findItemInCollection, hasExampleChanges, hasRequestChanges } from 'utils/collections/index';

import {
  toggleSideSearch,
  toggleGlobalSearch,
  openNewRequestModal,
  closeNewRequestModal,
  toggleSidebarCollapse,
  openCollectionCloneModal,
  closeCollectionCloneModal,
  openCollectionCloneItemModal,
  closeCollectionCloneItemModal,
  toggleConfirmFolderCloseModal,
  toggleConfirmRequestCloseModal,
  toggleShowImportCollectionModal,
  toggleConfirmCollectionCloseModal,
  toggleConfirmEnvironmentCloseModal,
  toggleConfirmGlobalEnvironmentCloseModal
} from 'providers/ReduxStore/slices/keyBindings';

import { DEFAULT_KEY_BINDINGS } from './keyMappings';

export const HotkeysContext = createContext(null);

// -----------------------
// ✅ Allow Mousetrap to work inside CodeMirror for closeTab (Ctrl/Cmd+W)
// -----------------------
// 1) Ensure Mousetrap binds on document (not just focused element)
// Add bindGlobal method to the Mousetrap instance (not prototype)
if (!Mousetrap.bindGlobal) {
  Mousetrap.bindGlobal = function (keys, callback) {
    const keyArr = Array.isArray(keys) ? keys : [keys];
    keyArr.forEach((key) => {
      Mousetrap.bind(key, callback);
    });
  };
}

// 2) Override stopCallback to allow hotkeys when focus is in CodeMirror
const originalStopCallback = Mousetrap.prototype.stopCallback;

Mousetrap.prototype.stopCallback = function (e, element) {
  const target = e?.target || element;

  const inCodeMirror
    = !!target?.closest?.('.CodeMirror')
      || !!target?.classList?.contains('CodeMirror')
      || !!element?.closest?.('.CodeMirror');

  if (inCodeMirror) {
    return false;
  }

  return originalStopCallback.call(this, e, element);
};

// -----------------------
// Hotkeys registration (NO hooks)
// -----------------------
let HOTKEYS_INITIALIZED = false;

const SEP = '+bind+';

const toMousetrapCombo = (keysStr) => {
  if (!keysStr) return null;
  // "command+bind+s" -> "command+s"
  const parts = keysStr.split(SEP).filter(Boolean);

  // Convert arrow key names from browser format to Mousetrap format
  const converted = parts.map((part) => {
    const lower = part.toLowerCase();
    if (lower === 'arrowup') return 'up';
    if (lower === 'arrowdown') return 'down';
    if (lower === 'arrowleft') return 'left';
    if (lower === 'arrowright') return 'right';
    return lower;
  });

  return converted.join('+');
};

// Helper to check if focus is in an editable element (input, textarea, CodeMirror)
const isInEditableContext = () => {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  const isEditable
    = tagName === 'input'
      || tagName === 'textarea'
      || activeElement.isContentEditable
      || activeElement.closest('.CodeMirror') !== null;

  return isEditable;
};

const getBindingsForActionFromState = (state, action) => {
  // Try to get from user preferences first
  let kb = state?.app?.preferences?.keyBindings?.[action];

  // Fall back to defaults if not customized
  if (!kb) {
    kb = DEFAULT_KEY_BINDINGS[action];
  }

  if (!kb) return null;

  // Bind both; only the right one will match on the current OS
  const mac = toMousetrapCombo(kb.mac);
  const windows = toMousetrapCombo(kb.windows);

  const arr = [mac, windows].filter(Boolean);
  return arr.length ? arr : null;
};

function bindHotkey(action, handler, getState) {
  const bindings = getBindingsForActionFromState(getState(), action);
  if (!bindings) return;

  // Track what we bound per action so we can unbind old combos on updates
  if (!bindHotkey._boundByAction) bindHotkey._boundByAction = {};
  if (!bindHotkey._handlersByCombo) bindHotkey._handlersByCombo = {};
  if (!bindHotkey._pendingTimeout) bindHotkey._pendingTimeout = null;

  const prev = bindHotkey._boundByAction[action] || [];

  // Unbind previous bindings for this action
  if (prev.length) {
    prev.forEach((key) => {
      delete bindHotkey._handlersByCombo[key];
      Mousetrap.unbind(key);
    });
  }

  // Use bindGlobal to work inside CodeMirror and other input elements
  bindings.forEach((key) => {
    // Store handler info for conflict detection
    const keyParts = key.split('+');
    bindHotkey._handlersByCombo[key] = {
      action,
      keyCount: keyParts.length,
      keys: keyParts,
      handler
    };

    Mousetrap.bindGlobal(key, (e) => {
      e?.preventDefault?.();

      // Clear any pending timeout
      if (bindHotkey._pendingTimeout) {
        clearTimeout(bindHotkey._pendingTimeout);
        bindHotkey._pendingTimeout = null;
      }

      // Check if there's a more specific (longer) shortcut that contains all current keys
      const currentKeys = key.split('+');
      const moreSpecificShortcuts = [];

      for (const [otherKey, info] of Object.entries(bindHotkey._handlersByCombo)) {
        if (otherKey === key) continue;

        const otherKeys = otherKey.split('+');
        // Check if otherKey is more specific (longer) and contains all current keys
        if (otherKeys.length > currentKeys.length) {
          const allMatch = currentKeys.every((k) => otherKeys.includes(k));
          if (allMatch) {
            moreSpecificShortcuts.push(otherKey);
          }
        }
      }

      // If there are more specific shortcuts, wait a bit to see if user is still pressing keys
      if (moreSpecificShortcuts.length > 0) {
        bindHotkey._pendingTimeout = setTimeout(() => {
          // User stopped pressing keys, execute this handler
          handler(e);
          bindHotkey._pendingTimeout = null;
        }, 100); // 100ms delay to detect if more keys are coming
      } else {
        // No more specific shortcuts, execute immediately
        handler(e);
      }

      return false;
    });
  });

  bindHotkey._boundByAction[action] = bindings;
}

function bindAllHotkeys(getState, dispatch) {
  // SAVE (Ctrl/Cmd + S)
  bindHotkey('save', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      const tabs = state.tabs.tabs;
      const collections = state.collections.collections;
      const activeTabUid = state.tabs.activeTabUid;

      const activeTab = tabs.find((t) => t.uid === activeTabUid);
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
    }
  }, getState);

  // SEND REQUEST (Ctrl/Cmd + Enter)
  bindHotkey('sendRequest', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
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
    }
  }, getState);

  // EDIT ENV (Ctrl/Cmd + E)
  bindHotkey('editEnvironment', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
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
    }
  }, getState);

  // CLONE ITEM (Ctrl/Cmd + D)
  bindHotkey('cloneItem', () => {
    // Allow default behavior in editable contexts
    if (isInEditableContext()) return;

    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
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
    }
  }, getState);

  // COPY ITEM (Ctrl/Cmd + C) - context-aware
  bindHotkey('copyItem', () => {
    // Allow default copy in editable contexts (inputs, textareas, CodeMirror)
    if (isInEditableContext()) return;

    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      const tabs = state.tabs.tabs;
      const collections = state.collections.collections;
      const activeTabUid = state.tabs.activeTabUid;

      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (!activeTab) return;

      const collection = findCollectionByUid(collections, activeTab.collectionUid);
      const item = collection ? findItemInCollection(collection, activeTab.uid) : null;

      // Copy request or folder to clipboard
      if (item && (activeTab.type === 'request' || activeTab.type === 'folder-settings')) {
        dispatch(copyRequest(item));
        toast.success(`${item.type === 'folder' ? 'Folder' : 'Request'} copied`);
      }
    }
  }, getState);

  // PASTE ITEM (Ctrl/Cmd + V) - context-aware
  bindHotkey('pasteItem', () => {
    // Allow default paste in editable contexts (inputs, textareas, CodeMirror)
    if (isInEditableContext()) return;

    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      const tabs = state.tabs.tabs;
      const collections = state.collections.collections;
      const activeTabUid = state.tabs.activeTabUid;

      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (!activeTab) return;

      const collection = findCollectionByUid(collections, activeTab.collectionUid);
      if (!collection) return;

      // Determine target for paste - always paste as sibling (same level)
      let targetItemUid = null;
      const item = findItemInCollection(collection, activeTab.uid);

      if (item) {
        // Find the parent folder by traversing up the pathname
        const findParentFolder = (collection, itemPathname) => {
          const pathParts = itemPathname.split('/');
          if (pathParts.length <= 1) return null; // Item is at root level

          const parentPath = pathParts.slice(0, -1).join('/');

          // Recursively search for parent folder
          const searchInItems = (items) => {
            for (const i of items) {
              if (i.pathname === parentPath) return i;
              if (i.items && i.items.length > 0) {
                const found = searchInItems(i.items);
                if (found) return found;
              }
            }
            return null;
          };

          return searchInItems(collection.items);
        };

        const parentFolder = findParentFolder(collection, item.pathname);
        targetItemUid = parentFolder?.uid || null;
      }

      dispatch(pasteItem(collection.uid, targetItemUid))
        .then(() => {
          toast.success('Item pasted successfully');
        })
        .catch((err) => {
          toast.error(err.message || 'Failed to paste item');
        });
    }
  }, getState);

  // NEW REQUEST (Ctrl/Cmd + N)
  bindHotkey('newRequest', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
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
    }
  }, getState);

  // GLOBAL SEARCH (Ctrl/Cmd + K)
  bindHotkey('globalSearch', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      dispatch(toggleGlobalSearch());
    }
  }, getState);

  // IMPORT COLLECTION (Ctrl/Cmd + O)
  bindHotkey('importCollection', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      dispatch(toggleShowImportCollectionModal({ show: true }));
    }
  }, getState);

  // SIDEBAR SEARCH (Ctrl/Cmd + F)
  bindHotkey('sidebarSearch', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      dispatch(toggleSideSearch());
    }
  }, getState);

  // CLOSE TAB
  bindHotkey('closeTab', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      const tabs = state.tabs.tabs;

      const showHomePage = state.app.showHomePage;
      const activeWorkspaceTabUid = state.workspaceTabs.activeTabUid;

      const activeTabUid = state.tabs.activeTabUid;
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);

      if (
        activeTab
        && [
          'request',
          'response-example',
          'collection-settings',
          'collection-overview',
          'folder-settings',
          'variables',
          'collection-runner',
          'environment-settings',
          'global-environment-settings',
          'preferences'
        ].includes(activeTab.type)
      ) {
        if (activeTab?.type === 'request') {
          const collections = state.collections.collections;
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          const item = collection ? findItemInCollection(collection, activeTab.uid) : null;

          if (item && hasRequestChanges(item)) {
            dispatch(
              toggleConfirmRequestCloseModal({
                show: true,
                entity: 'request',
                example: null,
                item: item,
                tab: activeTab,
                collection: collection
              })
            );
            return;
          }
          if (activeTabUid) dispatch(closeTabs({ tabUids: [activeTabUid] }));
          return;
        } else if (activeTab?.type === 'response-example') {
          const collections = state.collections.collections;
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          const item = collection ? findItemInCollection(collection, activeTab.itemUid) : null;
          const example = item?.examples?.find((ex) => ex.uid === activeTab.exampleUid);

          if (item && hasExampleChanges(item, activeTab.uid)) {
            dispatch(
              toggleConfirmRequestCloseModal({
                show: true,
                entity: 'example',
                example: example,
                item: item,
                tab: activeTab,
                collection: collection
              })
            );
          }
        } else if (activeTab?.type === 'collection-settings') {
          const collections = state.collections.collections;
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          if (!collection.draft) {
            if (activeTabUid) dispatch(closeTabs({ tabUids: [activeTabUid] }));
          } else {
            dispatch(
              toggleConfirmCollectionCloseModal({
                show: true,
                item: collection,
                tab: activeTab,
                collection: collection
              })
            );
          }
        } else if (activeTab?.type === 'folder-settings') {
          const collections = state.collections.collections;
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          const item = collection ? findItemInCollection(collection, activeTab.folderUid) : null;

          if (!item.draft) {
            if (activeTabUid) dispatch(closeTabs({ tabUids: [activeTabUid] }));
          } else {
            dispatch(
              toggleConfirmFolderCloseModal({
                show: true,
                item: item,
                tab: activeTab,
                collection: collection,
                folder: item
              })
            );
          }
        } else if (activeTab?.type === 'environment-settings') {
          const collections = state.collections.collections;
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          const draft = collection.environmentsDraft;

          if (draft) {
            dispatch(toggleConfirmEnvironmentCloseModal({ show: true, tab: activeTab, collection: collection }));
          } else {
            if (activeTabUid) dispatch(closeTabs({ tabUids: [activeTabUid] }));
          }
        } else if (activeTab?.type === 'global-environment-settings') {
          const globalEnvironmentDraft = state.globalEnvironments.globalEnvironmentDraft;

          if (globalEnvironmentDraft) {
            dispatch(
              toggleConfirmGlobalEnvironmentCloseModal({
                show: true,
                globalEnvDraft: globalEnvironmentDraft,
                tab: activeTab
              })
            );
          } else {
            if (activeTabUid) dispatch(closeTabs({ tabUids: [activeTabUid] }));
          }
        }
      }

      if (showHomePage && activeWorkspaceTabUid) {
        dispatch(closeWorkspaceTab({ uid: activeWorkspaceTabUid }));
      }
    }
  }, getState);

  // SWITCH PREV TAB
  bindHotkey('switchToPreviousTab', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      dispatch(switchTab({ direction: 'pageup' }));
    }
  }, getState);

  // SWITCH NEXT TAB
  bindHotkey('switchToNextTab', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      dispatch(switchTab({ direction: 'pagedown' }));
    }
  }, getState);

  // CLOSE ALL TABS (Ctrl/Cmd + Shift + W)
  bindHotkey('closeAllTabs', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      const tabs = state.tabs.tabs;

      const collections = state.collections.collections;
      const activeTabUid = state.tabs.activeTabUid;

      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (!activeTab) return;

      const collection = findCollectionByUid(collections, activeTab.collectionUid);
      if (!collection) return;

      const tabUids = tabs.filter((tab) => tab.collectionUid === collection.uid).map((tab) => tab.uid);
      dispatch(closeTabs({ tabUids }));
    }
  }, getState);

  // COLLAPSE SIDEBAR
  bindHotkey('collapseSidebar', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      dispatch(toggleSidebarCollapse());
    }
  }, getState);

  // ZOOM IN
  bindHotkey('zoomIn', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      window.ipcRenderer.send('main:zoom-in');
    }
  }, getState);

  // ZOOM OUT
  bindHotkey('zoomOut', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      window.ipcRenderer.send('main:zoom-out');
    }
  }, getState);

  // RESET ZOOM
  bindHotkey('resetZoom', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      window.ipcRenderer.send('main:zoom-reset');
    }
  }, getState);

  // MOVE TAB LEFT
  bindHotkey('moveTabLeft', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      dispatch(reorderTabs({ direction: -1 }));
    }
  }, getState);

  // MOVE TAB RIGHT
  bindHotkey('moveTabRight', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
      dispatch(reorderTabs({ direction: 1 }));
    }
  }, getState);

  // CHANGE LAYOUT
  bindHotkey('changeLayout', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (enableShortCuts) {
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
    }
  }, getState);
}

function initHotkeysOnce() {
  if (HOTKEYS_INITIALIZED) return;
  HOTKEYS_INITIALIZED = true;

  const { dispatch, getState } = store;

  // initial bind
  bindAllHotkeys(getState, dispatch);

  // rebind when preferences.keyBindings changes
  let lastKeyBindingsRef = getState()?.app?.preferences?.keyBindings;

  store.subscribe(() => {
    const next = getState()?.app?.preferences?.keyBindings;
    if (next && next !== lastKeyBindingsRef) {
      lastKeyBindingsRef = next;
      bindAllHotkeys(getState, dispatch);
    }
  });

  // Listen for zoom events from menu (these bypass keybindings)
  if (window.ipcRenderer) {
    window.ipcRenderer.on('main:menu-zoom-in', () => {
      window.ipcRenderer.send('main:zoom-in');
    });

    window.ipcRenderer.on('main:menu-zoom-out', () => {
      window.ipcRenderer.send('main:zoom-out');
    });

    window.ipcRenderer.on('main:menu-zoom-reset', () => {
      window.ipcRenderer.send('main:zoom-reset');
    });
  }
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
    cloneCollectionItemModal,
    showImportCollectionModal,
    showConfirmEnvironmentClose,
    showConfirmFolderCloseModal,
    showConfirmRequestCloseModal,
    showConfirmCollectionCloseModal,
    showConfirmGlobalEnvironmentClose
  } = useSelector((state) => state.keyBindings);

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      {newRequestModal.open && newRequestModal?.collectionUid && (
        <NewRequest
          item={newRequestModal.item ? newRequestModal.item : null}
          collectionUid={newRequestModal?.collectionUid}
          onClose={() => store.dispatch(closeNewRequestModal())}
        />
      )}

      {showImportCollectionModal.show && !showImportCollectionModal.importData && (
        <ImportCollection
          onClose={() => store.dispatch(toggleShowImportCollectionModal({ show: false }))}
          handleSubmit={({ rawData, type }) => {
            store.dispatch(toggleShowImportCollectionModal({ show: true, importData: { rawData, type } }));
          }}
        />
      )}

      {showImportCollectionModal.show && showImportCollectionModal.importData && (
        <ImportCollectionLocation
          rawData={showImportCollectionModal.importData.rawData}
          format={showImportCollectionModal.importData.type}
          onClose={() => store.dispatch(toggleShowImportCollectionModal({ show: false }))}
          handleSubmit={(convertedCollection, collectionLocation, options = {}) => {
            store.dispatch(importCollection(convertedCollection, collectionLocation, options))
              .then(() => {
                store.dispatch(toggleShowImportCollectionModal({ show: false }));
                toast.success('Collection imported successfully');
              })
              .catch((err) => {
                console.error(err);
                toast.error('An error occurred while importing the collection');
              });
          }}
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

      {showConfirmRequestCloseModal.show && showConfirmRequestCloseModal.entity === 'request' && (
        <ConfirmRequestClose
          item={showConfirmRequestCloseModal.item}
          onCancel={() => {
            showConfirmRequestCloseModal.item?.type === 'ws-request'
            && closeWsConnection(showConfirmRequestCloseModal.itemUid);
            store.dispatch(
              toggleConfirmRequestCloseModal({
                show: false,
                entity: null,
                example: null,
                item: null,
                tab: null,
                collection: null
              })
            );
          }}
          onCloseWithoutSave={() => {
            showConfirmRequestCloseModal.item?.type === 'ws-request'
            && closeWsConnection(showConfirmRequestCloseModal.itemUid);
            store.dispatch(
              deleteRequestDraft({
                itemUid: showConfirmRequestCloseModal.item.uid,
                collectionUid: showConfirmRequestCloseModal.collection.uid
              })
            );
            store.dispatch(closeTabs({ tabUids: [showConfirmRequestCloseModal.tab.uid] }));
            store.dispatch(
              toggleConfirmRequestCloseModal({
                show: false,
                entity: null,
                example: null,
                item: null,
                tab: null,
                collection: null
              })
            );
          }}
          onSaveAndClose={() => {
            showConfirmRequestCloseModal.item?.type === 'ws-request'
            && closeWsConnection(showConfirmRequestCloseModal.itemUid);
            store
              .dispatch(saveRequest(showConfirmRequestCloseModal.item.uid, showConfirmRequestCloseModal.collection.uid))
              .then(() => {
                store.dispatch(closeTabs({ tabUids: [showConfirmRequestCloseModal.tab.uid] }));
                store.dispatch(
                  toggleConfirmRequestCloseModal({
                    show: false,
                    entity: null,
                    example: null,
                    item: null,
                    tab: null,
                    collection: null
                  })
                );
              })
              .catch(() => {});
          }}
        />
      )}

      {showConfirmRequestCloseModal.show && showConfirmRequestCloseModal.entity === 'example' && (
        <ConfirmRequestClose
          item={showConfirmRequestCloseModal.item}
          example={showConfirmRequestCloseModal.example}
          onCancel={() =>
            store.dispatch(
              toggleConfirmRequestCloseModal({
                show: false,
                entity: null,
                example: null,
                item: null,
                tab: null,
                collection: null
              })
            )}
          onCloseWithoutSave={() => {
            store.dispatch(
              deleteRequestDraft({
                itemUid: showConfirmRequestCloseModal.item.uid,
                collectionUid: showConfirmRequestCloseModal.collection.uid
              })
            );
            store.dispatch(closeTabs({ tabUids: [showConfirmRequestCloseModal.tab.uid] }));
            store.dispatch(
              toggleConfirmRequestCloseModal({
                show: false,
                entity: null,
                example: null,
                item: null,
                tab: null,
                collection: null
              })
            );
          }}
          onSaveAndClose={() => {
            store.dispatch(
              saveRequest(showConfirmRequestCloseModal.item.uid, showConfirmRequestCloseModal.collection.uid, true)
            );
            store.dispatch(closeTabs({ tabUids: [showConfirmRequestCloseModal.tab.uid] }));
            store.dispatch(
              toggleConfirmRequestCloseModal({
                show: false,
                entity: null,
                example: null,
                item: null,
                tab: null,
                collection: null
              })
            );
          }}
        />
      )}

      {showConfirmCollectionCloseModal.show && (
        <ConfirmCollectionClose
          collection={showConfirmCollectionCloseModal.collection}
          onCancel={() =>
            store.dispatch(
              toggleConfirmCollectionCloseModal({ show: false, item: null, tab: null, collection: null })
            )}
          onCloseWithoutSave={() => {
            store.dispatch(deleteCollectionDraft({ collectionUid: showConfirmCollectionCloseModal.collection.uid }));
            store.dispatch(closeTabs({ tabUids: [showConfirmCollectionCloseModal.tab.uid] }));
            store.dispatch(
              toggleConfirmCollectionCloseModal({ show: false, item: null, tab: null, collection: null })
            );
          }}
          onSaveAndClose={() => {
            store
              .dispatch(saveCollectionRoot(showConfirmCollectionCloseModal.collection.uid))
              .then(() => {
                store.dispatch(closeTabs({ tabUids: [showConfirmCollectionCloseModal.tab.uid] }));
                store.dispatch(
                  toggleConfirmCollectionCloseModal({ show: false, item: null, tab: null, collection: null })
                );
              })
              .catch(() => {});
          }}
        />
      )}

      {showConfirmFolderCloseModal.show && (
        <ConfirmFolderClose
          folder={showConfirmFolderCloseModal.folder}
          onCancel={() =>
            store.dispatch(
              toggleConfirmFolderCloseModal({ sshow: false, item: null, tab: null, collection: null, folder: null })
            )}
          onCloseWithoutSave={() => {
            store.dispatch(
              deleteFolderDraft({
                collectionUid: showConfirmFolderCloseModal.collection.uid,
                folderUid: showConfirmFolderCloseModal.folder.uid
              })
            );
            store.dispatch(closeTabs({ tabUids: [showConfirmFolderCloseModal.tab.uid] }));
            store.dispatch(
              toggleConfirmFolderCloseModal({ sshow: false, item: null, tab: null, collection: null, folder: null })
            );
          }}
          onSaveAndClose={() => {
            store
              .dispatch(saveFolderRoot(showConfirmFolderCloseModal.collection.uid, showConfirmFolderCloseModal.folder.uid))
              .then(() => {
                store.dispatch(closeTabs({ tabUids: [showConfirmFolderCloseModal.tab.uid] }));
                store.dispatch(
                  toggleConfirmFolderCloseModal({ show: false, item: null, tab: null, collection: null, folder: null })
                );
              })
              .catch(() => {});
          }}
        />
      )}

      {showConfirmEnvironmentClose.show && (
        <ConfirmCloseEnvironment
          isGlobal={false}
          onCancel={() => store.dispatch(toggleConfirmEnvironmentCloseModal({ show: false, tab: null, collection: null }))}
          onCloseWithoutSave={() => {
            store.dispatch(clearEnvironmentsDraft({ collectionUid: showConfirmEnvironmentClose.collection.uid }));
            store.dispatch(closeTabs({ tabUids: [showConfirmEnvironmentClose.tab.uid] }));
            store.dispatch(toggleConfirmEnvironmentCloseModal({ show: false, tab: null, collection: null }));
          }}
          onSaveAndClose={() => {
            const draft = showConfirmEnvironmentClose.collection.environmentsDraft;
            if (draft?.environmentUid && draft?.variables) {
              store
                .dispatch(saveEnvironment(draft.variables, draft.environmentUid, showConfirmEnvironmentClose.collection.uid))
                .then(() => {
                  store.dispatch(clearEnvironmentsDraft({ collectionUid: showConfirmEnvironmentClose.collection.uid }));
                  store.dispatch(closeTabs({ tabUids: [showConfirmEnvironmentClose.tab.uid] }));
                  store.dispatch(toggleConfirmEnvironmentCloseModal({ show: false, tab: null, collection: null }));
                  toast.success('Environment saved');
                })
                .catch(() => {
                  toast.error('Failed to save environment');
                });
            }
          }}
        />
      )}

      {showConfirmGlobalEnvironmentClose.show && (
        <ConfirmCloseEnvironment
          isGlobal={true}
          onCancel={() =>
            store.dispatch(toggleConfirmGlobalEnvironmentCloseModal({ show: false, globalEnvDraft: null, tab: null }))}
          onCloseWithoutSave={() => {
            store.dispatch(clearGlobalEnvironmentDraft());
            store.dispatch(closeTabs({ tabUids: [showConfirmGlobalEnvironmentClose.tab.uid] }));
            store.dispatch(toggleConfirmGlobalEnvironmentCloseModal({ show: false, globalEnvDraft: null, tab: null }));
          }}
          onSaveAndClose={() => {
            const draft = showConfirmGlobalEnvironmentClose.globalEnvDraft;
            if (draft?.environmentUid && draft?.variables) {
              store
                .dispatch(saveGlobalEnvironment({ variables: draft.variables, environmentUid: draft.environmentUid }))
                .then(() => {
                  store.dispatch(clearGlobalEnvironmentDraft());
                  store.dispatch(closeTabs({ tabUids: [showConfirmGlobalEnvironmentClose.tab.uid] }));
                  store.dispatch(toggleConfirmGlobalEnvironmentCloseModal({ show: false, globalEnvDraft: null, tab: null }));
                  toast.success('Global Environment saved');
                })
                .catch(() => {
                  toast.error('Failed to save environment');
                });
            }
          }}
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
