import React, { useEffect } from 'react';
import get from 'lodash/get';
import each from 'lodash/each';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { getDefaultRequestPaneTab, findItemInCollectionByPathname } from 'utils/collections/index';
import { hideHomePage } from 'providers/ReduxStore/slices/app';
import { updateNextAction } from 'providers/ReduxStore/slices/collections/index';
import { useSelector, useDispatch } from 'react-redux';

const useCollectionNextAction = () => {
  const collections = useSelector((state) => state.collections.collections);
  const dispatch = useDispatch();

  useEffect(() => {
    each(collections, (collection) => {
      if (collection.nextAction && collection.nextAction.type === 'OPEN_REQUEST') {
        const item = findItemInCollectionByPathname(collection, get(collection, 'nextAction.payload.pathname'));

        if (item) {
          dispatch(updateNextAction({ collectionUid: collection.uid, nextAction: null }));
          dispatch(
            addTab({
              uid: item.uid,
              collectionUid: collection.uid,
              requestPaneTab: getDefaultRequestPaneTab(item.type)
            })
          );
          dispatch(hideHomePage());
        }
      }
    });
  }, [collections, each, dispatch, updateNextAction, hideHomePage, addTab]);
};

export default useCollectionNextAction;
