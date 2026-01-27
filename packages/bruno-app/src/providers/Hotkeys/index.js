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
  saveCollectionSettings
} from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { addTab, closeTabs, reorderTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import { closeWorkspaceTab } from 'providers/ReduxStore/slices/workspaceTabs';
import { toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import { getKeyBindingsForActionAllOS } from './keyMappings';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = (props) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const showHomePage = useSelector((state) => state.app.showHomePage);
  const activeWorkspaceTabUid = useSelector((state) => state.workspaceTabs.activeTabUid);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);

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

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('save')]);
    };
  }, [activeTabUid, tabs, saveRequest, collections, dispatch]);

  // send request (ctrl/cmd + enter)
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

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('sendRequest')]);
    };
  }, [activeTabUid, tabs, saveRequest, collections]);

  // edit environments (ctrl/cmd + e)
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

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('editEnvironment')]);
    };
  }, [activeTabUid, tabs, collections, dispatch]);

  // new request (ctrl/cmd + b)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('newRequest')], (e) => {
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
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('newRequest')]);
    };
  }, [activeTabUid, tabs, collections, setShowNewRequestModal]);

  // global search (ctrl/cmd + k)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('globalSearch')], (e) => {
      setShowGlobalSearchModal(true);

      return false; // stop bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('globalSearch')]);
    };
  }, []);

  // close tab hotkey
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('closeTab')], (e) => {
      if (showHomePage && activeWorkspaceTabUid) {
        dispatch(closeWorkspaceTab({ uid: activeWorkspaceTabUid }));
      } else if (activeTabUid) {
        dispatch(
          closeTabs({
            tabUids: [activeTabUid]
          })
        );
      }

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('closeTab')]);
    };
  }, [activeTabUid, showHomePage, activeWorkspaceTabUid]);

  // Switch to the previous tab
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('switchToPreviousTab')], (e) => {
      dispatch(
        switchTab({
          direction: 'pageup'
        })
      );

      return false; // this stops the event bubbling
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

      return false; // this stops the event bubbling
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

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('closeAllTabs')]);
    };
  }, [activeTabUid, tabs, collections, dispatch]);

  // Collapse sidebar (ctrl/cmd + \)
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
      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('moveTabLeft')]);
    };
  }, [dispatch]);

  // Move tab right
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('moveTabRight')], (e) => {
      dispatch(reorderTabs({ direction: 1 }));
      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('moveTabRight')]);
    };
  }, [dispatch]);

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
