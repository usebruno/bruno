import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { useSelector, useDispatch } from 'react-redux';
import EnvironmentSettings from 'components/Environments/EnvironmentSettings';
import NetworkError from 'components/ResponsePane/NetworkError';
import NewRequest from 'components/Sidebar/NewRequest';
import { sendRequest, saveRequest, saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { closeTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import { getKeyBindingsForActionAllOS } from './keyMappings';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = (props) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isEnvironmentSettingsModalOpen = useSelector((state) => state.app.isEnvironmentSettingsModalOpen);
  const [showEnvSettingsModal, setShowEnvSettingsModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

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
      if (isEnvironmentSettingsModalOpen) {
        console.log('todo: save environment settings');
      } else {
        const activeTab = find(tabs, (t) => t.uid === activeTabUid);
        if (activeTab) {
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          if (collection) {
            const item = findItemInCollection(collection, activeTab.uid);
            if (item && item.uid) {
              dispatch(saveRequest(activeTab.uid, activeTab.collectionUid));
            } else if (activeTab.type === 'collection-settings') {
              dispatch(saveCollectionRoot(collection.uid));
            }
          }
        }
      }

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('save')]);
    };
  }, [activeTabUid, tabs, saveRequest, collections, isEnvironmentSettingsModalOpen]);

  // send request (ctrl/cmd + enter)
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('sendRequest')], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);

        if (collection) {
          const item = findItemInCollection(collection, activeTab.uid);
          if (item) {
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
          setShowEnvSettingsModal(true);
        }
      }

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('editEnvironment')]);
    };
  }, [activeTabUid, tabs, collections, setShowEnvSettingsModal]);

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

  // close tab hotkey
  useEffect(() => {
    Mousetrap.bind([...getKeyBindingsForActionAllOS('closeTab')], (e) => {
      dispatch(
        closeTabs({
          tabUids: [activeTabUid]
        })
      );

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind([...getKeyBindingsForActionAllOS('closeTab')]);
    };
  }, [activeTabUid]);

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

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      {showEnvSettingsModal && (
        <EnvironmentSettings collection={getCurrentCollection()} onClose={() => setShowEnvSettingsModal(false)} />
      )}
      {showNewRequestModal && (
        <NewRequest collection={getCurrentCollection()} onClose={() => setShowNewRequestModal(false)} />
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
