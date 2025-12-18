import { useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  addTab,
  focusTab,
  switchTab,
  updateTab,
  closeTabs,
  closeOtherTabs,
  closeTabsToLeft,
  closeTabsToRight,
  closeAllTabs,
  closeAllCollectionTabs,
  makeTabPermanent,
  reorderTabs,
  initLocation,
  removeLocation,
  selectTabsForLocation,
  selectActiveTabIdForLocation,
  selectActiveTabForLocation
} from 'providers/ReduxStore/slices/tabs';

const useTabPane = (location, initialTabs = []) => {
  const dispatch = useDispatch();

  const tabs = useSelector(selectTabsForLocation(location));
  const activeTabId = useSelector(selectActiveTabIdForLocation(location));
  const activeTab = useSelector(selectActiveTabForLocation(location));

  useEffect(() => {
    if (tabs.length === 0 && initialTabs.length > 0) {
      dispatch(initLocation({
        location,
        tabs: initialTabs,
        activeTabId: initialTabs[0]?.uid
      }));
    }
  }, [location, tabs.length, initialTabs, dispatch]);

  const initialize = useCallback((tabsList, activeId) => {
    dispatch(initLocation({ location, tabs: tabsList, activeTabId: activeId }));
  }, [dispatch, location]);

  const add = useCallback((tab, options = {}) => {
    dispatch(addTab({
      ...tab,
      location,
      preview: options.preview ?? true,
      properties: options.properties || tab.properties || {}
    }));
  }, [dispatch, location]);

  const update = useCallback((uid, properties) => {
    dispatch(updateTab({ uid, location, properties }));
  }, [dispatch, location]);

  const focus = useCallback((uid) => {
    dispatch(focusTab({ uid, location }));
  }, [dispatch, location]);

  const switchDirection = useCallback((direction) => {
    dispatch(switchTab({ location, direction }));
  }, [dispatch, location]);

  const close = useCallback((uid) => {
    dispatch(closeTabs({ tabUids: [uid], location }));
  }, [dispatch, location]);

  const closeMultiple = useCallback((tabUids) => {
    dispatch(closeTabs({ tabUids, location }));
  }, [dispatch, location]);

  const closeOthers = useCallback((uid) => {
    dispatch(closeOtherTabs({ uid, location }));
  }, [dispatch, location]);

  const closeLeft = useCallback((uid) => {
    dispatch(closeTabsToLeft({ uid, location }));
  }, [dispatch, location]);

  const closeRight = useCallback((uid) => {
    dispatch(closeTabsToRight({ uid, location }));
  }, [dispatch, location]);

  const closeAll = useCallback((preservePermanent = true) => {
    dispatch(closeAllTabs({ location, preservePermanent }));
  }, [dispatch, location]);

  const closeCollection = useCallback((collectionUid) => {
    dispatch(closeAllCollectionTabs({ collectionUid, location }));
  }, [dispatch, location]);

  const makePermanent = useCallback((uid) => {
    dispatch(makeTabPermanent({ uid, location }));
  }, [dispatch, location]);

  const reorder = useCallback((sourceUid, targetUid) => {
    dispatch(reorderTabs({ sourceUid, targetUid, location }));
  }, [dispatch, location]);

  const remove = useCallback(() => {
    dispatch(removeLocation({ location }));
  }, [dispatch, location]);

  const getTab = useCallback((uid) => {
    return tabs.find((t) => t.uid === uid) || null;
  }, [tabs]);

  const hasTab = useCallback((uid) => {
    return tabs.some((t) => t.uid === uid);
  }, [tabs]);

  const getTabIndex = useCallback((uid) => {
    return tabs.findIndex((t) => t.uid === uid);
  }, [tabs]);

  const getContextMenuItems = useCallback((tab, index) => {
    const totalTabs = tabs.length;
    const hasLeftTabs = index > 0;
    const hasRightTabs = index < totalTabs - 1;
    const hasOtherTabs = totalTabs > 1;
    const canClose = !tab.permanent;

    return [
      {
        id: 'close',
        label: 'Close',
        onClick: () => close(tab.uid),
        disabled: !canClose
      },
      {
        id: 'close-others',
        label: 'Close Others',
        onClick: () => closeOthers(tab.uid),
        disabled: !hasOtherTabs
      },
      {
        id: 'close-left',
        label: 'Close to the Left',
        onClick: () => closeLeft(tab.uid),
        disabled: !hasLeftTabs
      },
      {
        id: 'close-right',
        label: 'Close to the Right',
        onClick: () => closeRight(tab.uid),
        disabled: !hasRightTabs
      },
      { type: 'divider', id: 'divider-1' },
      {
        id: 'close-all',
        label: 'Close All',
        onClick: () => closeAll(true)
      }
    ];
  }, [tabs, close, closeOthers, closeLeft, closeRight, closeAll]);

  return {
    tabs,
    activeTabId,
    activeTab,
    location,
    isInitialized: tabs.length > 0,
    initialize,
    addTab: add,
    updateTab: update,
    focusTab: focus,
    switchTab: switchDirection,
    closeTab: close,
    closeTabs: closeMultiple,
    closeOtherTabs: closeOthers,
    closeTabsToLeft: closeLeft,
    closeTabsToRight: closeRight,
    closeAllTabs: closeAll,
    closeCollectionTabs: closeCollection,
    makeTabPermanent: makePermanent,
    reorderTabs: reorder,
    removeLocation: remove,
    getTab,
    hasTab,
    getTabIndex,
    getContextMenuItems
  };
};

export default useTabPane;
