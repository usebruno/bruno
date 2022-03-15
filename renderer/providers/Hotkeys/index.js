import React, { useEffect } from 'react';
import Mousetrap from 'mousetrap';
import { useStore } from 'providers/Store';
import actions from 'providers/Store/actions';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = props => {
  const [store, storeDispatch] = useStore();

  useEffect(() => {
    Mousetrap.bind(['command+s', 'ctrl+s'], (e) => {
      console.log("Save hotkey");

      storeDispatch({
        type: actions.HOTKEY_SAVE
      });

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind(['command+s', 'ctrl+s']);
    };
  }, []);

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
