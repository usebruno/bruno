import React, { useState, useEffect } from 'react';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { useSelector, useDispatch } from 'react-redux';
import SaveRequest from 'components/RequestPane/SaveRequest';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = props => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const [showSaveRequestModal, setShowSaveRequestModal] = useState(false);
  
  const getCurrentCollectionItems = () => {
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if(activeTab) {
      const collection = findCollectionByUid(collections, activeTab.collectionUid);

      return collection ? collection.items : [];
    };
  };

  // save hotkey
  useEffect(() => {
    Mousetrap.bind(['command+s', 'ctrl+s'], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if(activeTab) {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);
        if(collection) {
          const item = findItemInCollection(collection, activeTab.uid);
          if(item && item.uid) {
            dispatch(saveRequest(activeTab.uid, activeTab.collectionUid))
          } else {
            setShowSaveRequestModal(true);
          }
        }
      }

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind(['command+s', 'ctrl+s']);
    };
  }, [activeTabUid, tabs, saveRequest, collections]);

  // send request (ctrl/cmd + enter)
  useEffect(() => {
    Mousetrap.bind(['command+enter', 'ctrl+enter'], (e) => {
      const activeTab = find(tabs, (t) => t.uid === activeTabUid);
      if(activeTab) {
        const collection = findCollectionByUid(collections, activeTab.collectionUid);

        if(collection) {
          const item = findItemInCollection(collection, activeTab.uid);
          if(item) {
            dispatch(sendRequest(item, collection.uid));
          }
        }
      }

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind(['command+enter', 'ctrl+enter']);
    };
  }, [activeTabUid, tabs, saveRequest, collections]);

  return (
    <HotkeysContext.Provider {...props} value='hotkey'>
      {showSaveRequestModal && <SaveRequest items={getCurrentCollectionItems()} onClose={() => setShowSaveRequestModal(false)}/>}
      <div>
        {props.children}
      </div>
    </HotkeysContext.Provider>
  );
};

export const useHotkeys = () =>  {
  const context = React.useContext(HotkeysContext);

  if (!context) {
    throw new Error(`useHotkeys must be used within a HotkeysProvider`);
  }

  return context;
}

export default HotkeysProvider;
