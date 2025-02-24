import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { findCollectionByUid, flattenItems, isItemARequest } from 'utils/collections';
import each from 'lodash/each';
import filter from 'lodash/filter';
import groupBy from 'lodash/groupBy';
import SaveRequestsModal from 'components/SaveRequestsModal';
import { isElectron } from 'utils/common/platform';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';

const ConfirmAppClose = () => {
  const { ipcRenderer } = window;
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);

  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    const clearListener = ipcRenderer.on('main:start-quit-flow', () => {
      setShowConfirmClose(true);
    });

    return () => {
      clearListener();
    };
  }, [isElectron, ipcRenderer, dispatch, setShowConfirmClose]);

  if (!showConfirmClose) {
    return null;
  }

  const getAllDraftRequests = () => {
    const draftRequests = [];
    const tabsByCollection = groupBy(tabs, (t) => t.collectionUid);
    Object.keys(tabsByCollection).forEach((collectionUid) => {
      const collection = findCollectionByUid(collections, collectionUid);
      if (collection) {
        const items = flattenItems(collection.items);
        const requests = filter(items, (item) => isItemARequest(item) && item.draft);
        each(requests, (request) => {
          draftRequests.push({
            ...request,
            collectionUid: collectionUid
          });
        });
      }
    });
    return draftRequests
  }

  const quit = () => dispatch(completeQuitFlow());

  return <SaveRequestsModal items={getAllDraftRequests()} 
    onCancel={() => setShowConfirmClose(false)}
    onCloseWithoutSave={quit}
    onSaveAndClose={quit} />;
};

export default ConfirmAppClose;
