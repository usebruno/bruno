import React, { createContext, useContext } from 'react';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

import NewRequest from 'components/Sidebar/NewRequest/index';
import NetworkError from 'components/ResponsePane/NetworkError';

import GlobalSearchModal from 'components/GlobalSearchModal/index';
import ConfirmCloseEnvironment from 'components/Environments/ConfirmCloseEnvironment';
import ConfirmFolderClose from 'components/RequestTabs/RequestTab/ConfirmFolderClose';
import CloneCollection from 'components/Sidebar/Collections/Collection/CloneCollection/index';
import ConfirmRequestClose from 'components/RequestTabs/RequestTab/ConfirmRequestClose/index';
import ConfirmCollectionClose from 'components/RequestTabs/RequestTab/ConfirmCollectionClose';
import CloneCollectionItem from 'components/Sidebar/Collections/Collection/CollectionItem/CloneCollectionItem/index';

import store from 'providers/ReduxStore/index';
import { savePreferences } from 'providers/ReduxStore/slices/app';

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

export const HotkeysContext = createContext(null);

// -----------------------
// ✅ Allow Mousetrap to work inside CodeMirror for closeTab (Ctrl/Cmd+W)
// -----------------------
// 1) Ensure Mousetrap binds on document (not just focused element)
Mousetrap.prototype.bindGlobal = function (keys, callback) {
  const mousetrap = this;
  const keyArr = Array.isArray(keys) ? keys : [keys];
  keyArr.forEach((key) => {
    mousetrap.bind(key, callback, null, document);
  });
};

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
  return keysStr.split(SEP).filter(Boolean).join('+').toLowerCase();
};

const getBindingsForActionFromState = (state, action) => {
  const kb = state?.app?.preferences?.keyBindings?.[action];
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
  const prev = bindHotkey._boundByAction[action] || [];

  if (prev.length) Mousetrap.unbind(prev);

  Mousetrap.bind(bindings, (e) => {
    e?.preventDefault?.();
    handler(e);
    return false;
  });

  bindHotkey._boundByAction[action] = bindings;
}

function bindAllHotkeys(getState, dispatch) {
  // SAVE (Ctrl/Cmd + S)
  bindHotkey('save', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
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
    if (!enableShortCuts) {
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
    if (!enableShortCuts) {
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
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
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

  // NEW REQUEST (Ctrl/Cmd + N)
  bindHotkey('newRequest', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
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
    if (!enableShortCuts) {
      dispatch(toggleGlobalSearch());
    }
  }, getState);

  // IMPORT COLLECTION (Ctrl/Cmd + O)
  bindHotkey('importCollection', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
      dispatch(toggleShowImportCollectionModal({ show: true }));
    }
  }, getState);

  // SIDEBAR SEARCH (Ctrl/Cmd + F)
  bindHotkey('sidebarSearch', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
      dispatch(toggleSideSearch());
    }
  }, getState);

  // CLOSE TAB
  bindHotkey('closeTab', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
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
    if (!enableShortCuts) {
      dispatch(switchTab({ direction: 'pageup' }));
    }
  }, getState);

  // SWITCH NEXT TAB
  bindHotkey('switchToNextTab', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
      dispatch(switchTab({ direction: 'pagedown' }));
    }
  }, getState);

  // CLOSE ALL TABS (Ctrl/Cmd + Shift + W)
  bindHotkey('closeAllTabs', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
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
    if (!enableShortCuts) {
      dispatch(toggleSidebarCollapse());
    }
  }, getState);

  // MOVE TAB LEFT
  bindHotkey('moveTabLeft', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
      dispatch(reorderTabs({ direction: -1 }));
    }
  }, getState);

  // MOVE TAB RIGHT
  bindHotkey('moveTabRight', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
      dispatch(reorderTabs({ direction: 1 }));
    }
  }, getState);

  // CHANGE LAYOUT
  bindHotkey('changeLayout', () => {
    const state = getState();
    const enableShortCuts = state.keyBindings.enableShortCuts;
    if (!enableShortCuts) {
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
