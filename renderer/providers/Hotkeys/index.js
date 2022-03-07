import React, { useEffect } from 'react';
import Mousetrap from 'mousetrap';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = props => {
  useEffect(() => {
    Mousetrap.bind(['command+s', 'ctrl+s'], (e) => {
      console.log("Save hotkey");

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
