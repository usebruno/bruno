import { useCallback, useMemo, useState } from 'react';
import { isMacOS } from 'utils/common/platform';

const useEnvironmentListSelection = ({
  environments,
  filteredEnvironments,
  activeEnvUid,
  onOpenEnvironment
}) => {
  const [selectedEnvUids, setSelectedEnvUids] = useState([]);
  const [lastClickedEnvUid, setLastClickedEnvUid] = useState(null);

  const envUids = useMemo(() => (environments ? environments.map((env) => env.uid) : []), [environments]);
  const filteredEnvUids = useMemo(() => filteredEnvironments.map((env) => env.uid), [filteredEnvironments]);

  // Derived at read time so environments removed elsewhere (delete, file reload) drop out of the selection.
  const validSelectedEnvUids = useMemo(
    () => selectedEnvUids.filter((uid) => envUids.includes(uid)),
    [selectedEnvUids, envUids]
  );
  const selectedEnvUidSet = useMemo(() => new Set(validSelectedEnvUids), [validSelectedEnvUids]);

  const hasSelection = validSelectedEnvUids.length > 0;

  const isAllSelected = useMemo(
    () => filteredEnvUids.length > 0 && filteredEnvUids.every((uid) => selectedEnvUidSet.has(uid)),
    [filteredEnvUids, selectedEnvUidSet]
  );

  const isEnvSelected = useCallback((uid) => selectedEnvUidSet.has(uid), [selectedEnvUidSet]);

  const clearSelection = useCallback(() => {
    setSelectedEnvUids([]);
    setLastClickedEnvUid(null);
  }, []);

  const toggleEnvSelection = useCallback((uid) => {
    setSelectedEnvUids((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));
  }, []);

  const selectOnlyEnv = useCallback((uid) => {
    setSelectedEnvUids([uid]);
    setLastClickedEnvUid(uid);
  }, []);

  const selectEnvs = useCallback((uids) => {
    if (!uids || !uids.length) return;
    setSelectedEnvUids((prev) => {
      const merged = new Set(prev);
      uids.forEach((uid) => merged.add(uid));
      return Array.from(merged);
    });
    setLastClickedEnvUid(uids[uids.length - 1]);
  }, []);

  const selectAllEnvs = useCallback(() => {
    if (isAllSelected) {
      clearSelection();
      return;
    }
    setSelectedEnvUids(filteredEnvUids);
    setLastClickedEnvUid(filteredEnvUids.length ? filteredEnvUids[filteredEnvUids.length - 1] : null);
  }, [isAllSelected, filteredEnvUids, clearSelection]);

  const selectEnvRange = useCallback((toUid) => {
    setSelectedEnvUids((prev) => {
      const anchorUid = lastClickedEnvUid || activeEnvUid;
      const fromIndex = anchorUid ? filteredEnvUids.indexOf(anchorUid) : -1;
      const toIndex = filteredEnvUids.indexOf(toUid);
      if (fromIndex === -1 || toIndex === -1) {
        return prev.includes(toUid) ? prev : [...prev, toUid];
      }
      const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
      const merged = new Set(prev);
      filteredEnvUids.slice(start, end + 1).forEach((uid) => merged.add(uid));
      return Array.from(merged);
    });
  }, [lastClickedEnvUid, activeEnvUid, filteredEnvUids]);

  // Drops only the given environments (e.g. the ones that were just deleted), leaving the rest of the selection intact.
  const removeFromSelection = useCallback((uids) => {
    if (!uids || !uids.length) return;
    const removed = new Set(uids);
    setSelectedEnvUids((prev) => prev.filter((uid) => !removed.has(uid)));
    setLastClickedEnvUid((prev) => (removed.has(prev) ? null : prev));
  }, []);

  const handleRowInteraction = useCallback((e, env) => {
    // Ctrl+click is the macOS secondary-click alias. Chromium fires both `contextmenu` and `click`,
    // so treating this as a plain click would clear the selection the context menu was built for.
    if (isMacOS() && e.ctrlKey) return;

    const isSelectionModifierPressed = isMacOS() ? e.metaKey : e.ctrlKey;

    if (isSelectionModifierPressed) {
      e.preventDefault();
      e.stopPropagation();
      // Seed the selection with the environment that's currently open, so a
      // Cmd/Ctrl-click elsewhere builds a multi-selection that includes it
      if (!hasSelection && activeEnvUid && activeEnvUid !== env.uid) {
        selectEnvs([activeEnvUid, env.uid]);
      } else {
        toggleEnvSelection(env.uid);
      }
      setLastClickedEnvUid(env.uid);
      return;
    }

    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      selectEnvRange(env.uid);
      setLastClickedEnvUid(env.uid);
      return;
    }

    if (hasSelection) {
      clearSelection();
    }

    onOpenEnvironment?.(env);
  }, [toggleEnvSelection, selectEnvs, selectEnvRange, hasSelection, activeEnvUid, clearSelection, onOpenEnvironment]);

  return {
    selectedEnvUids: validSelectedEnvUids,
    hasSelection,
    isAllSelected,
    isEnvSelected,
    selectOnlyEnv,
    selectAllEnvs,
    clearSelection,
    removeFromSelection,
    handleRowInteraction
  };
};

export default useEnvironmentListSelection;
