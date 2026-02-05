import React, { useEffect, useContext, createContext } from 'react';
import toast from 'react-hot-toast';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { useSelector, useDispatch } from 'react-redux';

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
  openNewRequestModal, toggleSideSearch, toggleGlobalSearch, toggleSidebarCollapse, closeNewRequestModal, closeCollectionCloneModal, closeCollectionCloneItemModal,
  openCollectionCloneModal, openCollectionCloneItemModal, toggleConfirmRequestModal, toggleShowImportCollectionModal
} from 'providers/ReduxStore/slices/keyBindings';

export const HotkeysContext = createContext();

export const HotkeysProvider = (props) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const showHomePage = useSelector((state) => state.app.showHomePage);
  const activeWorkspaceTabUid = useSelector((state) => state.workspaceTabs.activeTabUid);
  const { newRequestModal, showGlobalSearch, cloneCollectionModal, cloneCollectionItemModal } = useSelector((state) => state.keyBindings);
  const preferences = useSelector((state) => state.app.preferences);
  const orientation = preferences?.layout?.responsePaneOrientation || 'horizontal';

  const getCurrentCollection = () => {
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (activeTab) {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);

      return collection;
    }
  };

  // save hotkey
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('save')], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        if (activeTab.type === 'environment-settings' || activeTab.type === 'global-environment-settings') {
          window.dispatchEvent(new CustomEvent('environment-save'));
          return false;
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

      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('save')]);
    };
  }, [activeTabUid, tabs, saveRequest, collections, dispatch]);

  // send request (Ctrl/Cmd + enter)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('sendRequest')], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);

        if (collection) {
          const item = findItemInCollection(collection, activeTab.uid);
          if (item) {
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

            dispatch(sendRequest(item, collection.uid)).catch((err) =>
              toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
                duration: 5000
              })
            );
          }
        }
      }

      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('sendRequest')]);
    };
  }, [activeTabUid, tabs, saveRequest, collections]);

  // edit environments (Ctrl/Cmd + e)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('editEnvironment')], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);

        if (collection) {
          dispatch(
            addTab({
              uid: `${collection.uid}-environment-settings`,
              collectionUid: collection.uid,
              type: 'environment-settings'
            })
          );
        }
      }

      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('editEnvironment')]);
    };
  }, [activeTabUid, tabs, collections, dispatch]);

  // Clone Collection/Request/Folder (Ctrl/Cmd + d)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('cloneItem')], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        let collection = findCollectionByUid(collections, activeTab.collectionUid);
        let item = findItemInCollection(collection, activeTab.uid);
        switch (activeTab.type) {
          case 'request':
            dispatch(openCollectionCloneItemModal({ item: item, collectionUid: activeTab.collectionUid }));
            break;

          case 'folder-settings':
            dispatch(openCollectionCloneItemModal({ item: item, collectionUid: activeTab.collectionUid }));
            break;

          case 'collection-settings':
            dispatch(openCollectionCloneModal({ collectionUid: activeTab.collectionUid }));
            break;

          default:
            break;
        }
      }

      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('cloneItem')]);
    };
  }, [activeTabUid, tabs, collections, dispatch]);

  // new request (Ctrl/Cmd + n)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('newRequest')], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);

        if (collection) {
          dispatch(openNewRequestModal({ collectionUid: collection.uid }));
        }
      }

      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('newRequest')]);
    };
  }, [activeTabUid, tabs, collections, dispatch]);

  // global search (Ctrl/Cmd + k)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('globalSearch')], (e) => {
      dispatch(toggleGlobalSearch());

      return false; // stop bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('globalSearch')]);
    };
  }, []);

  // Collection Search (Ctrl/Cmd + o)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('importCollection')], (e) => {
      dispatch(toggleShowImportCollectionModal({ show: true }));

      return false; // stop bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('importCollection')]);
    };
  }, []);

  // Collection Search (Ctrl/Cmd + f)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('sidebarSearch')], (e) => {
      dispatch(toggleSideSearch());

      return false; // stop bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('sidebarSearch')]);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      const state = store.getState();
      const tabs = state.tabs.tabs;
      const activeTabUid = state.tabs.activeTabUid;
      const collections = state.collections.collections;

      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab?.type === 'request') {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);
        const item = findItemInCollection(collection, activeTab.uid);
        if (hasRequestChanges(item)) {
          dispatch(toggleConfirmRequestModal({ show: true }));
        } else {
          dispatch(closeTabs({ tabUids: [activeTabUid] }));
        }
      } else if (showHomePage && activeWorkspaceTabUid) {
        dispatch(closeWorkspaceTab({ uid: activeWorkspaceTabUid }));
      } else if (activeTabUid) {
        dispatch(
          closeTabs({
            tabUids: [activeTabUid]
          })
        );
      }
      return false;
    };

    Mousetrap.bind([...getKeyBindingsForActionAllOS('closeTab')], handler);
    return () => Mousetrap.unbind([...getKeyBindingsForActionAllOS('closeTab')]);
  }, [dispatch]);

  // Switch to the previous tab
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('switchToPreviousTab')], (e) => {
      dispatch(
        switchTab({
          direction: 'pageup'
        })
      );

      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('switchToPreviousTab')]);
    };
  }, [dispatch]);

  // Switch to the next tab
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('switchToNextTab')], (e) => {
      dispatch(
        switchTab({
          direction: 'pagedown'
        })
      );

      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('switchToNextTab')]);
    };
  }, [dispatch]);

  // Close all tabs
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('closeAllTabs')], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);

        if (collection) {
          const tabUids = tabs.filter((tab) => tab.collectionUid === collection.uid).map((tab) => tab.uid);
          dispatch(
            closeTabs({
              tabUids: tabUids
            })
          );
        }
      }

      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('closeAllTabs')]);
    };
  }, [activeTabUid, tabs, collections, dispatch]);

  // Collapse sidebar (Ctrl/Cmd + \)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('collapseSidebar')], (e) => {
      dispatch(toggleSidebarCollapse());
      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('collapseSidebar')]);
    };
  }, [dispatch]);

  // Move tab left
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('moveTabLeft')], (e) => {
      dispatch(reorderTabs({ direction: -1 }));
      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('moveTabLeft')]);
    };
  }, [dispatch]);

  // Move tab right
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('moveTabRight')], (e) => {
      dispatch(reorderTabs({ direction: 1 }));
      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('moveTabRight')]);
    };
  }, [dispatch]);

  // Move tab right
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('changeLayout')], (e) => {
      const newOrientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
      const updatedPreferences = {
        ...preferences,
        layout: {
          ...preferences.layout,
          responsePaneOrientation: newOrientation
        }
      };
      debugger;
      dispatch(savePreferences(updatedPreferences));
      return false;
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('changeLayout')]);
    };
  }, [dispatch, preferences]);

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      {newRequestModal.open && (
        <NewRequest
          collectionUid={newRequestModal.collectionUid}
          onClose={() => dispatch(closeNewRequestModal())}
        />
      )}
      {showGlobalSearch && (
        <GlobalSearchModal isOpen={showGlobalSearch} onClose={() => dispatch(toggleGlobalSearch())} />
      )}
      {cloneCollectionModal.open && (
        <CloneCollection
          collectionUid={cloneCollectionModal.collectionUid}
          onClose={() => dispatch(closeCollectionCloneModal())}
        />
      )}
      {cloneCollectionItemModal.open && (
        <CloneCollectionItem
          item={cloneCollectionItemModal.item}
          collectionUid={cloneCollectionItemModal.collectionUid}
          onClose={() => dispatch(closeCollectionCloneItemModal())}
        />
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
