import React, { useEffect, useMemo } from 'react';
import { findItemInCollection, findCollectionByUid } from 'utils/collections';
import { useDispatch, useSelector } from 'react-redux';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import reverse from 'lodash/reverse';
import { getSpecialTabName, isSpecialTab, isItemAFolder } from 'utils/tabs';
import { focusTab } from 'providers/ReduxStore/slices/tabs';

// Recursive function to get the path of an item within a collection
const getItemPath = (collection, item) => {
  if (isSpecialTab(item)) {
    return collection.name;
  }
  if (collection.items.find((i) => i.uid === item.uid)) {
    return collection.name;
  }

  const path = collection.items
    .map((i) => (isItemAFolder(i) ? getItemPath(i, item) : null))
    .find(Boolean);

  return path ? `${collection.name}/${path}` : collection.name;
};

// Function to transform active tabs into popup-friendly format
const activeTabsToPopupTabs = (collections, tabs) => {
  if (!collections) return [];

  return tabs
    .map((tab) => {
      const collection = findCollectionByUid(collections, tab.collectionUid);
      if (!collection) return null;

      const foundTab = findItemInCollection(collection, tab.uid) ?? tab;
      if (!foundTab) return null;

      return { collection, tab: foundTab };
    })
    .filter(Boolean)
    .map(({ collection, tab }) => ({
      tabName: isSpecialTab(tab) ? getSpecialTabName(tab.type) : tab.name,
      path: getItemPath(collection, tab),
      uid: tab.uid,
    }));
};

export default function CtrlTabPopup() {
  const ctrlTabIndex = useSelector((state) => state.tabs.ctrlTabIndex);
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const dispatch = useDispatch();

  // Memoize the result of activeTabsToPopupTabs to avoid recalculations
  const popupTabs = useMemo(() => activeTabsToPopupTabs(collections, tabs), [collections, tabs]);

  useEffect(() => {
    // Check for valid ctrlTabIndex and focus on the appropriate tab
    if (popupTabs.length > 0 && ctrlTabIndex !== null && ctrlTabIndex >= 0) {
      if (ctrlTabIndex < popupTabs.length) {
        const element = document.getElementById(`tab-${popupTabs[ctrlTabIndex].uid}`);
        if (element) {
          element.focus();
        }
      }
    }
  }, [ctrlTabIndex, popupTabs]);

  const shouldShowPopup = ctrlTabIndex !== null && ctrlTabIndex >= 0 && tabs.length > 0;

  if (!shouldShowPopup) return null;

  if (ctrlTabIndex < 0 || ctrlTabIndex >= popupTabs.length) {
    console.warn("Invalid ctrlTabIndex", ctrlTabIndex);
    return null;
  }

  const currentTabbedTab = popupTabs[ctrlTabIndex];

  return (
    <div className="absolute flex justify-center top-1 w-full">
      <StyledWrapper
        key={`dialog-${ctrlTabIndex}-${popupTabs.map((tab) => tab.uid).join('-')}`}
        className="flex flex-col isolate z-10 p-1"
      >
        {popupTabs.map((popupTab) => (
          <button
            id={`tab-${popupTab.uid}`}
            title={popupTab.path}
            key={popupTab.uid}
            onClick={() => dispatch(focusTab({ uid: popupTab.uid }))}
            type="button"
            className={classnames('py-0.5 px-5 rounded text-left truncate', {
              'is-active': currentTabbedTab === popupTab,
            })}
          >
            <strong className="font-medium">{popupTab.tabName}</strong>
            {'  '}
            <span className="text-xs font-extralight">{popupTab.path}</span>
          </button>
        ))}
      </StyledWrapper>
    </div>
  );
}
