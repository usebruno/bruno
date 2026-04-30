
import * as React from "react"
import { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export const ScopedPersistedContext = createContext<string>('');

export function usePersistenceScope(): string {
  return useContext(ScopedPersistedContext);
}

export function ScopedPersistenceProvider({ scope, children }: { scope: string; children: ReactNode }) {
  return <ScopedPersistedContext.Provider value={scope}>{children}</ScopedPersistedContext.Provider>;
}

export function clearPersistedScope(scope: string) {
  const prefix = scope ? `persisted::${scope}::` : 'persisted::';
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
}