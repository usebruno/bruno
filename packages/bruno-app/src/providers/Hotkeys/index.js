import React, { useState, useEffect } from 'react';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { useSelector, useDispatch } from 'react-redux';
import NewRequest from 'components/Sidebar/NewRequest';
import GlobalSearchModal from 'components/GlobalSearchModal';
import SaveRequestsModal from 'providers/App/ConfirmAppClose/SaveRequestsModal';
import filter from 'lodash/filter';
import each from 'lodash/each';
import { findCollectionByUid, findItemInCollection, flattenItems, isItemARequest, hasRequestChanges, findEnvironmentInCollection } from 'utils/collections';
import { addTab, focusTab, reorderTabs } from 'providers/ReduxStore/slices/tabs';
import { saveMultipleRequests, saveMultipleCollections, saveMultipleFolders, saveEnvironment, reopenClosedTab } from 'providers/ReduxStore/slices/collections/actions';
import { toggleSidebarCollapse, savePreferences } from 'providers/ReduxStore/slices/app';
import { setLocalStorageValue, SIDEBAR_COLLAPSED_KEY } from 'utils/common/localStorage';
import { openDevtoolsAndSwitchToTerminal } from 'utils/terminal';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import { getVisibleTabs } from 'utils/tabs';
import { isEnvironmentValidationError } from 'utils/environments';
import toast from 'react-hot-toast';
import { getKeyBindingsForActionAllOS } from './keyMappings';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = (props) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const userKeyBindings = useSelector((state) => state.app.preferences?.keyBindings);
  const keybindingsEnabled = useSelector((state) => state.app.preferences?.keybindingsEnabled !== false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [showSaveRequestsModal, setShowSaveRequestsModal] = useState(false);
  const [tabUidsToClose, setTabUidsToClose] = useState([]);
  const preferences = useSelector((state) => state.app.preferences);
  const tabsAcrossCollections = useBetaFeature(BETA_FEATURES.TABS_ACROSS_COLLECTIONS);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);

  const getCurrentCollection = () => {
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (activeTab) {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);

      return collection;
    }
  };

  // The tabs the tab strip currently shows — tab navigation and close-all must stay in lockstep
  // with what's visible, or shortcuts land on tabs hidden by the tabs-across-collections filter.
  const getCollectionTabs = () => {
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return [];
    const scratchCollectionUids = new Set(workspaces.map((w) => w.scratchCollectionUid).filter(Boolean));
    return getVisibleTabs({ tabs, tabsAcrossCollections, activeTabCollectionUid: activeTab.collectionUid, scratchCollectionUids });
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

  // Switch to the previous tab (active-collection-tabs-only)
  useEffect(() => {
    bindAction('switchToPreviousTab', (e) => {
      const collectionTabs = getCollectionTabs();
      if (collectionTabs.length === 0) return false;
      const currentIndex = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      const prevIndex = (currentIndex - 1 + collectionTabs.length) % collectionTabs.length;
      dispatch(focusTab({ uid: collectionTabs[prevIndex].uid }));
      return false;
    });

    return () => {
      unbindAction('switchToPreviousTab');
    };
  }, [activeTabUid, tabs, dispatch, userKeyBindings, keybindingsEnabled, tabsAcrossCollections, workspaces]);

  // Switch to the next tab (active-collection-tabs-only)
  useEffect(() => {
    bindAction('switchToNextTab', (e) => {
      const collectionTabs = getCollectionTabs();
      if (collectionTabs.length === 0) return false;
      const currentIndex = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      const nextIndex = (currentIndex + 1) % collectionTabs.length;
      dispatch(focusTab({ uid: collectionTabs[nextIndex].uid }));
      return false;
    });

    return () => {
      unbindAction('switchToNextTab');
    };
  }, [activeTabUid, tabs, dispatch, userKeyBindings, keybindingsEnabled, tabsAcrossCollections, workspaces]);

  // Switch to tab at position (Cmd+1 through Cmd+8) and last tab (Cmd+9) — collection-scoped
  useEffect(() => {
    for (let i = 1; i <= 8; i++) {
      bindAction(`switchToTab${i}`, (e) => {
        const collectionTabs = getCollectionTabs();
        const tab = collectionTabs[i - 1];
        if (tab) {
          dispatch(focusTab({ uid: tab.uid }));
        }
        return false;
      });
    }

    bindAction('switchToLastTab', (e) => {
      const collectionTabs = getCollectionTabs();
      const lastTab = collectionTabs[collectionTabs.length - 1];
      if (lastTab) {
        dispatch(focusTab({ uid: lastTab.uid }));
      }
      return false;
    });

    return () => {
      for (let i = 1; i <= 8; i++) {
        unbindAction(`switchToTab${i}`);
      }
      unbindAction('switchToLastTab');
    };
  }, [activeTabUid, tabs, dispatch, userKeyBindings, keybindingsEnabled, tabsAcrossCollections, workspaces]);

  // Close all tabs
  useEffect(() => {
    bindAction('closeAllTabs', (e) => {
      const tabUids = getCollectionTabs().map((tab) => tab.uid);
      if (tabUids.length) {
        setTabUidsToClose(tabUids);
        setShowSaveRequestsModal(true);
      }

      return false; // this stops the event bubbling
    });

    return () => {
      unbindAction('closeAllTabs');
    };
  }, [activeTabUid, tabs, collections, userKeyBindings, keybindingsEnabled, tabsAcrossCollections, workspaces]);

  // Reopen last closed tab (active-collection-tabs-only)
  useEffect(() => {
    bindAction('reopenLastClosedTab', (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab?.collectionUid) {
        dispatch(reopenClosedTab({ collectionUid: activeTab.collectionUid }));
      } else {
        dispatch(reopenClosedTab({}));
      }
      return false;
    });

    return () => {
      unbindAction('reopenLastClosedTab');
    };
  }, [activeTabUid, tabs, dispatch, userKeyBindings, keybindingsEnabled]);

  // Save all tabs (active-collection-tabs-only)
  useEffect(() => {
    bindAction('saveAllTabs', (e) => {
      const collection = getCurrentCollection();
      if (!collection) return false;
      const collectionUid = collection.uid;

      const requestDrafts = [];
      const collectionDrafts = [];
      const folderDrafts = [];

      // Collection settings draft
      if (collection.draft) {
        collectionDrafts.push({ collectionUid });
      }

      // Environment draft
      if (collection.environmentsDraft) {
        const { environmentUid, variables } = collection.environmentsDraft;
        const environment = findEnvironmentInCollection(collection, environmentUid);
        if (environment && variables) {
          dispatch(saveEnvironment(variables, environmentUid, collectionUid))
            .catch((err) =>
              toast.error(isEnvironmentValidationError(err) ? err.message : 'Failed to save environment')
            );
        }
      }

      // Request and folder drafts
      const items = flattenItems(collection.items);
      const requests = filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
      each(requests, (draft) => {
        requestDrafts.push({ ...draft, collectionUid });
      });

      const folders = filter(items, (item) => item.type === 'folder' && item.draft);
      each(folders, (folder) => {
        folderDrafts.push({ folderUid: folder.uid, collectionUid });
      });

      if (collectionDrafts.length > 0) {
        dispatch(saveMultipleCollections(collectionDrafts));
      }
      if (folderDrafts.length > 0) {
        dispatch(saveMultipleFolders(folderDrafts));
      }
      if (requestDrafts.length > 0) {
        dispatch(saveMultipleRequests(requestDrafts));
      }

      return false;
    });

    return () => {
      unbindAction('saveAllTabs');
    };
  }, [activeTabUid, tabs, collections, dispatch, userKeyBindings, keybindingsEnabled]);

  // Collapse sidebar
  useEffect(() => {
    bindAction('collapseSidebar', (e) => {
      dispatch(toggleSidebarCollapse());
      setLocalStorageValue(SIDEBAR_COLLAPSED_KEY, !sidebarCollapsed);
      return false;
    });

    return () => {
      unbindAction('collapseSidebar');
    };
  }, [dispatch, userKeyBindings, keybindingsEnabled, sidebarCollapsed]);

  // Open terminal — context-aware:
  // focusedSidebarPath: null = no sidebar focus, '' = request focused (no-op), '/path' = folder/collection
  const focusedSidebarPath = useSelector((state) => state.app.focusedSidebarPath);
  const activeWorkspace = useSelector((state) => {
    const { workspaces, activeWorkspaceUid } = state.workspaces;
    return workspaces?.find((w) => w.uid === activeWorkspaceUid);
  });

  useEffect(() => {
    bindAction('openTerminal', (e) => {
      // 1. Sidebar focus takes priority
      if (focusedSidebarPath) {
        openDevtoolsAndSwitchToTerminal(dispatch, focusedSidebarPath);
        return false;
      }
      if (focusedSidebarPath === '') {
        // Request focused in sidebar → no-op
        return false;
      }

      // 2. No sidebar focus → check active tab type
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if (activeTab) {
        if (activeTab.type === 'collection-settings' && activeTab.collectionUid) {
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          if (collection?.pathname) {
            openDevtoolsAndSwitchToTerminal(dispatch, collection.pathname);
            return false;
          }
        } else if (activeTab.type === 'folder-settings' && activeTab.collectionUid && activeTab.uid) {
          const collection = findCollectionByUid(collections, activeTab.collectionUid);
          if (collection) {
            const item = findItemInCollection(collection, activeTab.uid);
            if (item?.pathname) {
              openDevtoolsAndSwitchToTerminal(dispatch, item.pathname);
              return false;
            }
          }
        }
      }

      // 3. Default to workspace root
      if (activeWorkspace?.pathname) {
        openDevtoolsAndSwitchToTerminal(dispatch, activeWorkspace.pathname);
      }
      return false;
    });

    return () => {
      unbindAction('openTerminal');
    };
  }, [focusedSidebarPath, activeTabUid, tabs, collections, activeWorkspace, dispatch, userKeyBindings, keybindingsEnabled]);

  // Move tab left (active-collection-tabs-only)
  useEffect(() => {
    bindAction('moveTabLeft', (e) => {
      const collectionTabs = getCollectionTabs();
      const currentIndex = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      if (currentIndex <= 0) return false; // already at leftmost position in collection
      dispatch(reorderTabs({ sourceUid: activeTabUid, targetUid: collectionTabs[currentIndex - 1].uid }));
      return false;
    });

    return () => {
      unbindAction('moveTabLeft');
    };
  }, [activeTabUid, tabs, dispatch, userKeyBindings, keybindingsEnabled, tabsAcrossCollections, workspaces]);

  // Move tab right (active-collection-tabs-only)
  useEffect(() => {
    bindAction('moveTabRight', (e) => {
      const collectionTabs = getCollectionTabs();
      const currentIndex = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      if (currentIndex < 0 || currentIndex >= collectionTabs.length - 1) return false; // already at rightmost
      dispatch(reorderTabs({ sourceUid: activeTabUid, targetUid: collectionTabs[currentIndex + 1].uid }));
      return false;
    });

    return () => {
      unbindAction('moveTabRight');
    };
  }, [activeTabUid, tabs, dispatch, userKeyBindings, keybindingsEnabled, tabsAcrossCollections, workspaces]);

  // Open preferences
  useEffect(() => {
    bindAction('openPreferences', (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      const collectionUid = activeTab?.collectionUid || activeWorkspace?.scratchCollectionUid;

      // Preferences is app-level — a single, stably-keyed tab shared across collections.
      dispatch(
        addTab({
          type: 'preferences',
          uid: 'preferences',
          collectionUid
        })
      );
      return false;
    });

    return () => {
      unbindAction('openPreferences');
    };
  }, [activeTabUid, tabs, activeWorkspace, dispatch, userKeyBindings, keybindingsEnabled]);

  // Change layout orientation
  useEffect(() => {
    bindAction('changeLayout', (e) => {
      const orientation = preferences?.layout?.responsePaneOrientation || 'horizontal';
      const newOrientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
      dispatch(savePreferences({
        ...preferences,
        layout: {
          ...preferences?.layout,
          responsePaneOrientation: newOrientation
        }
      }));
      return false;
    });

    return () => {
      unbindAction('changeLayout');
    };
  }, [preferences, dispatch, userKeyBindings, keybindingsEnabled]);

  // Zoom in
  useEffect(() => {
    bindAction('zoomIn', () => {
      const { ipcRenderer } = window;
      ipcRenderer?.invoke('renderer:zoom-in');
      return false;
    });

    return () => {
      unbindAction('zoomIn');
    };
  }, [userKeyBindings, keybindingsEnabled]);

  // Zoom out
  useEffect(() => {
    bindAction('zoomOut', () => {
      const { ipcRenderer } = window;
      ipcRenderer?.invoke('renderer:zoom-out');
      return false;
    });

    return () => {
      unbindAction('zoomOut');
    };
  }, [userKeyBindings, keybindingsEnabled]);

  // Reset zoom
  useEffect(() => {
    bindAction('resetZoom', () => {
      const { ipcRenderer } = window;
      ipcRenderer?.invoke('renderer:reset-zoom');
      return false;
    });

    return () => {
      unbindAction('resetZoom');
    };
  }, [userKeyBindings, keybindingsEnabled]);

  // Close Bruno
  useEffect(() => {
    bindAction('closeBruno', () => {
      window.close();
      return false;
    });

    return () => {
      unbindAction('closeBruno');
    };
  }, [userKeyBindings, keybindingsEnabled]);

  const currentCollection = getCurrentCollection();

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      {showNewRequestModal && (
        <NewRequest collectionUid={currentCollection?.uid} onClose={() => setShowNewRequestModal(false)} />
      )}
      {showGlobalSearchModal && (
        <GlobalSearchModal isOpen={showGlobalSearchModal} onClose={() => setShowGlobalSearchModal(false)} />
      )}
      {showSaveRequestsModal && (
        <SaveRequestsModal
          forceCloseTabs={true}
          tabUidsToClose={tabUidsToClose}
          onClose={() => {
            setShowSaveRequestsModal(false);
            setTabUidsToClose([]);
          }}
        />
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
