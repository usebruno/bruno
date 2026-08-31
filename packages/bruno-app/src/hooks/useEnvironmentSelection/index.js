import React, { createContext, useContext } from 'react';

const EnvironmentSelectionContext = createContext({});

export const EnvironmentSelectionProvider = ({ environments, onSelect, children }) => (
  <EnvironmentSelectionContext.Provider value={{ environments, onSelect }}>
    {children}
  </EnvironmentSelectionContext.Provider>
);

export const useEnvironmentSelection = () => useContext(EnvironmentSelectionContext);
