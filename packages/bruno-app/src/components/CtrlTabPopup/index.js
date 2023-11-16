import React from 'react';
import { findItemInCollection, findCollectionByUid } from 'utils/collections';
import { useDispatch, useSelector } from 'react-redux';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import reverse from 'lodash/reverse';
import { getSpecialTabName, isSpecialTab } from 'utils/tabs';
import { selectCtrlTabAction } from 'providers/ReduxStore/slices/tabs';

const tabStackToPopupTabs = (collections, ctrlTabStack) => {
  if (!collections) {
    return [];
  }

  return ctrlTabStack
    .map((tab) => {
      const collection = findCollectionByUid(collections, tab.collectionUid);
      return { collection, tab: findItemInCollection(collection, tab.uid) ?? tab };
    })
    .map(({ collection, tab }) => ({
      tabName: isSpecialTab(tab) ? getSpecialTabName(tab.type) : tab.name,
      collectionName: collection.name,
      uid: tab.uid
    }));
};

// required in cases where we remove a tab from the stack but the user is still holding ctrl
const tabStackToUniqueId = (ctrlTabStack) => ctrlTabStack.map((tab) => tab.uid).join('-');

export default function CtrlTabPopup() {
  const ctrlTabIndex = useSelector((state) => state.tabs.ctrlTabIndex);
  const ctrlTabStack = useSelector((state) => state.tabs.ctrlTabStack);
  const collections = useSelector((state) => state.collections.collections);
  const dispatch = useDispatch();

  if (ctrlTabIndex === null) {
    return null;
  }

  const popupTabs = tabStackToPopupTabs(collections, ctrlTabStack);

  const currentTabbedTab = popupTabs.at(ctrlTabIndex);

  return (
    <div className="absolute flex justify-center top-1 w-full">
      <StyledWrapper
        key={'dialog' + ctrlTabIndex + tabStackToUniqueId(ctrlTabStack)}
        className="flex flex-col rounded isolate z-10 p-1 overflow-y-auto max-h-80 w-96"
      >
        {reverse(popupTabs).map((popupTab) => (
          <button
            key={popupTab.uid}
            autoFocus={currentTabbedTab === popupTab}
            onClick={() => dispatch(selectCtrlTabAction(popupTab.uid))}
            type="button"
            className={classnames('py-0.5 px-5 rounded text-left truncate', {
              'is-active': currentTabbedTab === popupTab
            })}
          >
            <strong className="font-medium">{popupTab.tabName}</strong>
            {'  '}
            <span className="text-xs font-extralight">{popupTab.collectionName}</span>
          </button>
        ))}
      </StyledWrapper>
    </div>
  );
}
