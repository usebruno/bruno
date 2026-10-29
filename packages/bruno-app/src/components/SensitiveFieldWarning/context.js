import { createContext, useContext } from 'react';

export const SensitiveFieldOwnerContext = createContext(null);

export const useSensitiveFieldOwner = () => useContext(SensitiveFieldOwnerContext);
