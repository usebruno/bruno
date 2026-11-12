import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { clearPersistedScope } from 'hooks/usePersistedState/PersistedScopeProvider';
import { clearPersistedSearchScope } from 'components/CodeEditor/state-persistence';

export default function usePersistedTabCleanup() {
  const tabs = useSelector((state) => state.tabs.tabs);
  const previousTabUids = useRef(new Set());

  useEffect(() => {
    const tabUids = new Set(tabs.map((tab) => tab.uid).filter(Boolean));
    // Run after React's unmount cleanups, which can still persist editor/scroll state.
    // A focus switch keeps the same UIDs; only closed or replaced tabs are cleared.
    for (const uid of previousTabUids.current) {
      if (!tabUids.has(uid)) {
        clearPersistedSearchScope(uid);
        clearPersistedScope(uid);
      }
    }
    previousTabUids.current = tabUids;
  }, [tabs]);
}
