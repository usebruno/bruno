
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
  const prefix = `persisted::${scope}::`;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
}

export function clearAllPersistedState() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('persisted::'))
    .forEach((k) => localStorage.removeItem(k));
}

// Clear all persisted state on app boot so no orphaned keys from the previous session remain.
// Done on startup (not on close) because Electron's renderer process is killed before
// beforeunload can reliably fire.
if (typeof window !== 'undefined') {
  clearAllPersistedState();
}
