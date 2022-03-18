import React, { useEffect } from 'react';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { saveRequest } from 'providers/ReduxStore/slices/collections';
import { requestSaved } from 'providers/ReduxStore/slices/tabs';
import { useSelector, useDispatch } from 'react-redux';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = props => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  useEffect(() => {
    Mousetrap.bind(['command+s', 'ctrl+s'], (e) => {
      console.log("Save hotkey");

      if(activeTabUid) {
        const activeTab = find(tabs, (t) => t.uid === activeTabUid);
        if(activeTab) {
          // todo: these dispatches need to be chained and errors need to be handled
          dispatch(saveRequest(activeTab.uid, activeTab.collectionUid));
          dispatch(requestSaved({
            itemUid: activeTab.uid
          }))
        }
      }

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind(['command+s', 'ctrl+s']);
    };
  }, [activeTabUid, tabs, saveRequest, requestSaved]);

  return (
    <HotkeysContext.Provider {...props} value='hotkey'>
      {props.children}
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
