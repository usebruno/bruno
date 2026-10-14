import { useCallback, useMemo, useState } from 'react';
import { isMacOS } from 'utils/common/platform';

const useEnvironmentListSelection = ({
  environments,
  filteredEnvironments,
  activeEnvUid,
  onOpenEnvironment
}) => {
  const [selectedEnvUids, setSelectedEnvUids] = useState([]);
  // needed to support shift-click range selection, which requires knowing the last clicked environment
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

  const isEnvSelected = useCallback((uid) => selectedEnvUidSet.has(uid), [selectedEnvUidSet]);

  const clearSelection = useCallback(() => {
    setSelectedEnvUids([]);
    setLastClickedEnvUid(null);
  }, []);

  const toggleEnvSelection = useCallback((uid) => {
    setSelectedEnvUids((prev) => {
      if (prev.includes(uid)) {
        return prev.filter((selectedUid) => selectedUid !== uid);
      }

      return [...prev, uid];
    });
  }, []);

  const selectEnvs = useCallback((uids) => {
    if (!uids?.length) return;

    setSelectedEnvUids((prev) => {
      const newUids = uids.filter((uid) => !prev.includes(uid));
      return [...prev, ...newUids];
    });

    setLastClickedEnvUid(uids[uids.length - 1]);
  }, []);

  const selectEnvRange = useCallback((toUid) => {
    setSelectedEnvUids((prev) => {
      const anchorUid = lastClickedEnvUid || activeEnvUid;
      const fromIndex = filteredEnvUids.indexOf(anchorUid);
      const toIndex = filteredEnvUids.indexOf(toUid);

      // If the range can't be determined, select only the clicked environment.
      if (fromIndex === -1 || toIndex === -1) {
        return prev.includes(toUid) ? prev : [...prev, toUid];
      }

      const startIndex = Math.min(fromIndex, toIndex);
      const endIndex = Math.max(fromIndex, toIndex);
      const rangeUids = filteredEnvUids.slice(startIndex, endIndex + 1);

      const selectedUids = new Set(prev);
      rangeUids.forEach((uid) => selectedUids.add(uid));

      return Array.from(selectedUids);
    });
  }, [lastClickedEnvUid, activeEnvUid, filteredEnvUids]);

  const handleRowInteraction = useCallback((e, env) => {
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
    isEnvSelected,
    clearSelection,
    handleRowInteraction
  };
};

export default useEnvironmentListSelection;
