import { createContext, useContext } from 'react';

export const ImportHandoffContext = createContext(null);

export const useImportHandoff = () => useContext(ImportHandoffContext);
