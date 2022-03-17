import React from 'react';
import useIdb from './useIdb';

export const AppContext = React.createContext();

export const AppProvider = props => {
  // boot idb
  useIdb();

  return (
    <AppContext.Provider {...props} value='appProvider'>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppProvider;
