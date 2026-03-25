import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { useSelector, useDispatch } from 'react-redux';
import NetworkError from 'components/ResponsePane/NetworkError';
import NewRequest from 'components/Sidebar/NewRequest';
import GlobalSearchModal from 'components/GlobalSearchModal';
import {
  sendRequest,
  saveRequest,
  saveCollectionRoot,
  saveFolderRoot,
  saveCollectionSettings,
  closeTabs
} from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { addTab, reorderTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import { toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import { getKeyBindingsForActionAllOS } from './keyMappings';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = (props) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const userKeyBindings = useSelector((state) => state.app.preferences?.keyBindings);
  const keybindingsEnabled = useSelector((state) => state.app.preferences?.keybindingsEnabled !== false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);

  const getCurrentCollection = () => {
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (activeTab) {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);

      return collection;
    }
  };

  // Helper: get Mousetrap combos for an action, merged with user overrides
  const getCombos = (action) => getKeyBindingsForActionAllOS(action, userKeyBindings);

  // Helper: bind a shortcut only if keybindings are enabled
  const bindAction = (action, handler) => {
    if (!keybindingsEnabled) return;
    const combos = getCombos(action);
    if (!combos) return;
    Mousetrap.bind(combos, handler);
  };

  const unbindAction = (action) => {
    const combos = getCombos(action);
    if (!combos) return;
    Mousetrap.unbind(combos);
  };

  // save hotkey
  useEffect(() => {
    bindAction('save', (e) => {
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

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('save');
    };
  }, [activeTabUid, tabs, saveRequest, collections, dispatch, userKeyBindings, keybindingsEnabled]);

  // send request
  useEffect(() => {
    bindAction('sendRequest', (e) => {
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

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('sendRequest');
    };
  }, [activeTabUid, tabs, saveRequest, collections, userKeyBindings, keybindingsEnabled]);

  // edit environments
  useEffect(() => {
    bindAction('editEnvironment', (e) => {
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

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('editEnvironment');
    };
  }, [activeTabUid, tabs, collections, dispatch, userKeyBindings, keybindingsEnabled]);

  // new request
  useEffect(() => {
    bindAction('newRequest', (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);

        if (collection) {
          setShowNewRequestModal(true);
        }
      }

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('newRequest');
    };
  }, [activeTabUid, tabs, collections, setShowNewRequestModal, userKeyBindings, keybindingsEnabled]);

  // global search
  useEffect(() => {
    bindAction('globalSearch', (e) => {
      setShowGlobalSearchModal(true);

      return false; // stop bubbling
    });

    return () => {
      unbindAction('globalSearch');
    };
  }, [userKeyBindings, keybindingsEnabled]);

  // close tab hotkey
  useEffect(() => {
    bindAction('closeTab', (e) => {
      if (activeTabUid) {
        dispatch(
          closeTabs({
            tabUids: [activeTabUid]
          })
        );
      }

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('closeTab');
    };
  }, [activeTabUid, userKeyBindings, keybindingsEnabled]);

  // Switch to the previous tab
  useEffect(() => {
    bindAction('switchToPreviousTab', (e) => {
      dispatch(
        switchTab({
          direction: 'pageup'
        })
      );

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('switchToPreviousTab');
    };
  }, [dispatch, userKeyBindings, keybindingsEnabled]);

  // Switch to the next tab
  useEffect(() => {
    bindAction('switchToNextTab', (e) => {
      dispatch(
        switchTab({
          direction: 'pagedown'
        })
      );

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('switchToNextTab');
    };
  }, [dispatch, userKeyBindings, keybindingsEnabled]);

  // Close all tabs
  useEffect(() => {
    bindAction('closeAllTabs', (e) => {
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

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('closeAllTabs');
    };
  }, [activeTabUid, tabs, collections, dispatch, userKeyBindings, keybindingsEnabled]);

  // Collapse sidebar
  useEffect(() => {
    bindAction('collapseSidebar', (e) => {
      dispatch(toggleSidebarCollapse());
      return false;
    });

    return () => {
      unbindAction('collapseSidebar');
    };
  }, [dispatch, userKeyBindings, keybindingsEnabled]);

  // Move tab left
  useEffect(() => {
    bindAction('moveTabLeft', (e) => {
      dispatch(reorderTabs({ direction: -1 }));
      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('moveTabLeft');
    };
  }, [dispatch, userKeyBindings, keybindingsEnabled]);

  // Move tab right
  useEffect(() => {
    bindAction('moveTabRight', (e) => {
      dispatch(reorderTabs({ direction: 1 }));
      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('moveTabRight');
    };
  }, [dispatch, userKeyBindings, keybindingsEnabled]);

  const currentCollection = getCurrentCollection();

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      {showNewRequestModal && (
        <NewRequest collectionUid={currentCollection?.uid} onClose={() => setShowNewRequestModal(false)} />
      )}
      {showGlobalSearchModal && (
        <GlobalSearchModal isOpen={showGlobalSearchModal} onClose={() => setShowGlobalSearchModal(false)} />
      )}
      <div>{props.children}</div>
    </HotkeysContext.Provider>
  );
};

export const useHotkeys = () => {
  const context = React.useContext(HotkeysContext);

  if (!context) {
    throw new Error(`useHotkeys must be used within a HotkeysProvider`);
  }

  return context;
};

export default HotkeysProvider;
