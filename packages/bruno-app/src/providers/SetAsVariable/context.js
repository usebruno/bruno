import { createContext, useContext } from 'react';

const NO_PROVIDER = {
  openFromCodeMirror: () => {},
  openFromDomSelection: () => {}
};

export const SetAsVariableContext = createContext(NO_PROVIDER);

export const useSetAsVariable = () => useContext(SetAsVariableContext);
