
import * as React from "react"
import { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export const PersistedScopeContext = createContext<string>('');

export function usePersistedScope(): string {
  return useContext(PersistedScopeContext);
}

export function PersistedScopeProvider({ scope, children }: { scope: string; children: ReactNode }) {
  return <PersistedScopeContext.Provider value={scope}>{children}</PersistedScopeContext.Provider>;
}

export function clearPersistedScope(scope: string) {
  const prefix = `persisted::${scope}::`;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
}
