import { useCallback, useMemo, useState } from 'react';
import { isMacOS } from 'utils/common/platform';

const useEnvironmentListSelection = ({
  filteredEnvironments,
  activeEnvUid,
  onOpenEnvironment
}) => {
  const [selectedEnvUids, setSelectedEnvUids] = useState([]);
  // needed to support shift-click range selection, which requires knowing the last clicked environment
  const [lastClickedEnvUid, setLastClickedEnvUid] = useState(null);

  const filteredEnvUids = useMemo(() => filteredEnvironments.map((env) => env.uid), [filteredEnvironments]);

  // Only visible environments count as selected. rows hidden by the search are ignored,
  const validSelectedEnvUids = useMemo(
    () => selectedEnvUids.filter((uid) => filteredEnvUids.includes(uid)),
    [selectedEnvUids, filteredEnvUids]
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
    setSelectedEnvUids((prev) => {
      if (prev.includes(uid)) {
        return prev.filter((selectedUid) => selectedUid !== uid);
      }

      return [...prev, uid];
    });
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

  const selectAllEnvs = useCallback(() => {
    if (isAllSelected) {
      setSelectedEnvUids((prev) => prev.filter((uid) => !filteredEnvUids.includes(uid)));
      setLastClickedEnvUid(null);
      return;
    }
    setSelectedEnvUids((prev) => Array.from(new Set([...prev, ...filteredEnvUids])));
    setLastClickedEnvUid(filteredEnvUids[filteredEnvUids.length - 1] ?? null);
  }, [isAllSelected, filteredEnvUids]);

  const handleRowInteraction = useCallback((e, env) => {
    if (isMacOS() && e.ctrlKey) return;

    const isSelectionModifierPressed = isMacOS() ? e.metaKey : e.ctrlKey;

    if (isSelectionModifierPressed) {
      toggleEnvSelection(env.uid);
      setLastClickedEnvUid(env.uid);
      return;
    }

    if (e.shiftKey) {
      selectEnvRange(env.uid);
      setLastClickedEnvUid(env.uid);
      return;
    }

    // A plain click starts over, including any selection the search is hiding.
    if (selectedEnvUids.length > 0) {
      clearSelection();
    }

    onOpenEnvironment(env);
  }, [toggleEnvSelection, selectEnvRange, selectedEnvUids, clearSelection, onOpenEnvironment]);

  // A click on the empty space around the rows clears the selection.
  const handleBackgroundClick = useCallback((e) => {
    if (!e.currentTarget.contains(e.target)) return;
    if (e.target.closest('[role="option"], button, input')) return;
    clearSelection();
  }, [clearSelection]);

  return {
    selectedEnvUids: validSelectedEnvUids,
    hasSelection,
    isAllSelected,
    isEnvSelected,
    selectAllEnvs,
    clearSelection,
    handleRowInteraction,
    handleBackgroundClick
  };
};

export default useEnvironmentListSelection;
