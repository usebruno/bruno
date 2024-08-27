import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { useSelector, useDispatch } from 'react-redux';
import SaveRequest from 'components/RequestPane/SaveRequest';
import EnvironmentSettings from 'components/Environments/EnvironmentSettings';
import NetworkError from 'components/ResponsePane/NetworkError';
import NewRequest from 'components/Sidebar/NewRequest';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = (props) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isEnvironmentSettingsModalOpen = useSelector((state) => state.app.isEnvironmentSettingsModalOpen);
  const [showSaveRequestModal, setShowSaveRequestModal] = useState(false);
  const [showEnvSettingsModal, setShowEnvSettingsModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  const getCurrentCollectionItems = () => {
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (activeTab) {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);

      return collection ? collection.items : [];
    }
  };

  const getCurrentCollection = () => {
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (activeTab) {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);

      return collection;
    }
  };

  // save hotkey
  useEffect(() => {
    Mousetrap.bind(['command+s', 'ctrl+s'], (e) => {
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
            } else {
              // todo: when ephermal requests go live
              // setShowSaveRequestModal(true);
            }
          }
        }
      }

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind(['command+s', 'ctrl+s']);
    };
  }, [activeTabUid, tabs, saveRequest, collections, isEnvironmentSettingsModalOpen]);

  // send request (ctrl/cmd + enter)
  useEffect(() => {
    Mousetrap.bind(['command+enter', 'ctrl+enter'], (e) => {
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
      Mousetrap.unbind(['command+enter', 'ctrl+enter']);
    };
  }, [activeTabUid, tabs, saveRequest, collections]);

  // edit environments (ctrl/cmd + e)
  useEffect(() => {
    Mousetrap.bind(['command+e', 'ctrl+e'], (e) => {
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
      Mousetrap.unbind(['command+e', 'ctrl+e']);
    };
  }, [activeTabUid, tabs, collections, setShowEnvSettingsModal]);

  // new request (ctrl/cmd + b)
  useEffect(() => {
    Mousetrap.bind(['command+b', 'ctrl+b'], (e) => {
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
      Mousetrap.unbind(['command+b', 'ctrl+b']);
    };
  }, [activeTabUid, tabs, collections, setShowNewRequestModal]);

  // close tab hotkey
  useEffect(() => {
    Mousetrap.bind(['command+w', 'ctrl+w'], (e) => {
      dispatch(
        closeTabs({
          tabUids: [activeTabUid]
        })
      );

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind(['command+w', 'ctrl+w']);
    };
  }, [activeTabUid]);

  // close all tabs
  useEffect(() => {
    Mousetrap.bind(['command+shift+w', 'ctrl+shift+w'], (e) => {
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
      Mousetrap.unbind(['command+shift+w', 'ctrl+shift+w']);
    };
  }, [activeTabUid, tabs, collections, dispatch]);

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      {showSaveRequestModal && (
        <SaveRequest items={getCurrentCollectionItems()} onClose={() => setShowSaveRequestModal(false)} />
      )}
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
