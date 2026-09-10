import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isMacOS } from 'utils/common/platform';

const useEnvironmentBulkSelection = ({
  environments,
  filteredEnvironments,
  activeEnvironmentUid,
  selectedEnvironment,
  collectionUid,
  onOpenEnvironment
}) => {
  const [selectedEnvUids, setSelectedEnvUids] = useState([]);
  const [lastClickedEnvUid, setLastClickedEnvUid] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const scopeRef = useRef(null);

  const envUids = useMemo(() => (environments ? environments.map((env) => env.uid) : []), [environments]);
  const filteredEnvUids = useMemo(() => filteredEnvironments.map((env) => env.uid), [filteredEnvironments]);

  useEffect(() => {
    setSelectedEnvUids([]);
    setLastClickedEnvUid(null);
    setIsSelectionMode(false);
  }, [collectionUid]);

  useEffect(() => {
    setSelectedEnvUids((prev) => {
      if (!prev.length) return prev;
      const stillPresent = prev.filter((uid) => envUids.includes(uid));
      return stillPresent.length === prev.length ? prev : stillPresent;
    });
  }, [envUids]);

  const hasSelection = selectedEnvUids.length > 0;
  const isAllFilteredSelected = filteredEnvUids.length > 0 && filteredEnvUids.every((uid) => selectedEnvUids.includes(uid));
  const selectedEnvironmentsList = useMemo(
    () => environments?.filter((env) => selectedEnvUids.includes(env.uid)) || [],
    [environments, selectedEnvUids]
  );

  const toggleEnvSelection = useCallback((uid) => {
    setSelectedEnvUids((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));
  }, []);

  const selectEnvRange = useCallback((toUid) => {
    setSelectedEnvUids((prev) => {
      const fromIndex = lastClickedEnvUid ? filteredEnvUids.indexOf(lastClickedEnvUid) : -1;
      const toIndex = filteredEnvUids.indexOf(toUid);
      if (fromIndex === -1 || toIndex === -1) {
        return prev.includes(toUid) ? prev : [...prev, toUid];
      }
      const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
      const merged = new Set(prev);
      filteredEnvUids.slice(start, end + 1).forEach((uid) => merged.add(uid));
      return Array.from(merged);
    });
  }, [lastClickedEnvUid, filteredEnvUids]);

  const handleRowInteraction = useCallback((e, env) => {
    const isSelectionModifierPressed = isMacOS() ? e.metaKey : e.ctrlKey;

    if (isSelectionModifierPressed) {
      e.preventDefault();
      e.stopPropagation();
      setIsSelectionMode(true);
      toggleEnvSelection(env.uid);
      setLastClickedEnvUid(env.uid);
      return;
    }

    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setIsSelectionMode(true);
      selectEnvRange(env.uid);
      setLastClickedEnvUid(env.uid);
      return;
    }

    if (isSelectionMode) {
      toggleEnvSelection(env.uid);
      setLastClickedEnvUid(env.uid);
      return;
    }

    onOpenEnvironment?.(env);
  }, [isSelectionMode, toggleEnvSelection, selectEnvRange, onOpenEnvironment]);

  const handleToggleSelectionMode = useCallback(() => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedEnvUids([]);
      setLastClickedEnvUid(null);
      return;
    }

    setIsSelectionMode(true);
    const target = environments?.find((env) => env.uid === selectedEnvironment?.uid)
      || environments?.find((env) => env.uid === activeEnvironmentUid)
      || environments?.[0];
    if (target) {
      setSelectedEnvUids([target.uid]);
      setLastClickedEnvUid(target.uid);
    }
  }, [isSelectionMode, environments, selectedEnvironment, activeEnvironmentUid]);

  const handleCancelSelection = useCallback(() => {
    setSelectedEnvUids([]);
    setLastClickedEnvUid(null);
    setIsSelectionMode(false);
  }, []);

  const handleSelectAllToggle = useCallback(() => {
    if (isAllFilteredSelected) {
      setSelectedEnvUids([]);
      setLastClickedEnvUid(null);
      return;
    }
    setSelectedEnvUids((prev) => Array.from(new Set([...prev, ...filteredEnvUids])));
  }, [isAllFilteredSelected, filteredEnvUids]);

  const handleDeleted = useCallback((failedUids) => {
    setSelectedEnvUids(failedUids || []);
    if (!failedUids || !failedUids.length) {
      setLastClickedEnvUid(null);
      setIsSelectionMode(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isWithinScope = scopeRef.current?.contains(document.activeElement);
      if (!isWithinScope) return;

      const target = e.target;
      const isTextInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const isSelectAllCombo = (isMacOS() ? e.metaKey : e.ctrlKey) && (e.key === 'a' || e.key === 'A');

      if (isSelectAllCombo && !isTextInput) {
        if (!filteredEnvUids.length) return;
        e.preventDefault();
        setIsSelectionMode(true);
        setSelectedEnvUids(filteredEnvUids);
        setLastClickedEnvUid(null);
        return;
      }

      if (e.key === 'Escape' && isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedEnvUids([]);
        setLastClickedEnvUid(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredEnvUids, isSelectionMode]);

  return {
    scopeRef,
    isSelectionMode,
    hasSelection,
    selectedEnvUids,
    filteredEnvUids,
    isAllFilteredSelected,
    selectedEnvironmentsList,
    showDeleteModal,
    openDeleteModal: () => setShowDeleteModal(true),
    closeDeleteModal: () => setShowDeleteModal(false),
    handleRowInteraction,
    handleToggleSelectionMode,
    handleCancelSelection,
    handleSelectAllToggle,
    handleDeleted
  };
};

export default useEnvironmentBulkSelection;
