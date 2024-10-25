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
import { CTRL_TAB_ACTIONS, closeTabs, switchTab, ctrlTab } from 'providers/ReduxStore/slices/tabs';
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
  const [tabPressCount, setTabPressCount] = useState(0);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

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

  // switch tab hotkey
  useEffect(() => {
    // Handle Ctrl keydown
    Mousetrap.bind(
      'ctrl',
      () => {
        setIsCtrlPressed(true);
        setTabPressCount(0);
      },
      'keydown'
    );

    // Handle Ctrl+Tab keydown
    Mousetrap.bind(
      'ctrl+tab',
      (e) => {
        if (isCtrlPressed) {
          setTabPressCount((prevCount) => prevCount + 1);
          dispatch(ctrlTab(CTRL_TAB_ACTIONS.PLUS));
          e.preventDefault(); // Prevent default tab switching behavior
        }
      },
      'keydown'
    );

    // Handle Ctrl keyup
    Mousetrap.bind(
      'ctrl',
      () => {
        if (isCtrlPressed) {
          dispatch(ctrlTab(CTRL_TAB_ACTIONS.SWITCH));
          setIsCtrlPressed(false);
          setTabPressCount(0);
        }
      },
      'keyup'
    );

    // Cleanup Mousetrap bindings when the component unmounts
    return () => {
      Mousetrap.unbind('ctrl', 'keydown');
      Mousetrap.unbind('ctrl+tab', 'keydown');
      Mousetrap.unbind('ctrl', 'keyup');
    };
  }, [isCtrlPressed, tabPressCount]);

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
