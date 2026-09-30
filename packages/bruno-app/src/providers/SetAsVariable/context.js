import { createContext, useContext } from 'react';

export const SetAsVariableContext = createContext(null);

export const useSetAsVariable = () => useContext(SetAsVariableContext);
