import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isMacOS } from 'utils/common/platform';

const useEnvironmentBulkSelection = ({
  environments,
  filteredEnvironments,
  collectionUid,
  onOpenEnvironment,
  onRenameEnvironment
}) => {
  const [selectedEnvUids, setSelectedEnvUids] = useState([]);
  const [actionTargetUids, setActionTargetUids] = useState([]);
  const [lastClickedEnvUid, setLastClickedEnvUid] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const scopeRef = useRef(null);

  const envUids = useMemo(() => (environments ? environments.map((env) => env.uid) : []), [environments]);
  const filteredEnvUids = useMemo(() => filteredEnvironments.map((env) => env.uid), [filteredEnvironments]);

  useEffect(() => {
    setSelectedEnvUids([]);
    setActionTargetUids([]);
    setLastClickedEnvUid(null);
    setMenuVisible(false);
  }, [collectionUid]);

  useEffect(() => {
    setSelectedEnvUids((prev) => {
      if (!prev.length) return prev;
      const stillPresent = prev.filter((uid) => envUids.includes(uid));
      return stillPresent.length === prev.length ? prev : stillPresent;
    });
  }, [envUids]);

  const hasSelection = selectedEnvUids.length > 0;
  const selectedEnvironmentsList = useMemo(
    () => environments?.filter((env) => selectedEnvUids.includes(env.uid)) || [],
    [environments, selectedEnvUids]
  );
  const actionTargetEnvironmentsList = useMemo(
    () => environments?.filter((env) => actionTargetUids.includes(env.uid)) || [],
    [environments, actionTargetUids]
  );

  const openMenuAt = useCallback((e) => {
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuVisible(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEnvUids([]);
    setLastClickedEnvUid(null);
    setMenuVisible(false);
  }, []);

  const toggleEnvSelection = useCallback((uid) => {
    setSelectedEnvUids((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));
  }, []);

  const selectOnlyEnv = useCallback((uid) => {
    setSelectedEnvUids([uid]);
    setLastClickedEnvUid(uid);
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

  // Matches the Sidebar's own convention (see useSidebarSelectionClick):
  // the multi-select toggle modifier is OS-appropriate — Cmd on macOS,
  // Ctrl on Windows/Linux — and it only builds the selection, quietly.
  const handleRowInteraction = useCallback((e, env) => {
    const isSelectionModifierPressed = isMacOS() ? e.metaKey : e.ctrlKey;

    if (isSelectionModifierPressed) {
      e.preventDefault();
      e.stopPropagation();
      toggleEnvSelection(env.uid);
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
  }, [toggleEnvSelection, selectEnvRange, hasSelection, clearSelection, onOpenEnvironment]);

  const handleRowContextMenu = useCallback((e, env) => {
    e.preventDefault();
    e.stopPropagation();

    const isPartOfMultiSelection = selectedEnvUids.includes(env.uid) && selectedEnvUids.length > 1;
    setActionTargetUids(isPartOfMultiSelection ? selectedEnvUids : [env.uid]);

    openMenuAt(e);
  }, [selectedEnvUids, openMenuAt]);

  const handleDeleted = useCallback((failedUids) => {
    const stillPresent = new Set(failedUids || []);
    setActionTargetUids(Array.from(stillPresent));
    setSelectedEnvUids((prev) => prev.filter((uid) => stillPresent.has(uid)));
    if (!failedUids || !failedUids.length) {
      setLastClickedEnvUid(null);
    }
  }, []);

  const openExportModal = useCallback(() => {
    setShowExportModal(true);
    closeMenu();
  }, [closeMenu]);

  const closeExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  const openCopyModal = useCallback(() => {
    setShowCopyModal(true);
    closeMenu();
  }, [closeMenu]);

  const closeCopyModal = useCallback(() => {
    setShowCopyModal(false);
  }, []);

  const handleRenameSelected = useCallback(() => {
    const target = actionTargetEnvironmentsList[0];
    closeMenu();
    clearSelection();
    if (target) {
      onRenameEnvironment?.(target);
    }
  }, [actionTargetEnvironmentsList, closeMenu, clearSelection, onRenameEnvironment]);

  const startExportForEnv = useCallback((env) => {
    setActionTargetUids([env.uid]);
    setShowExportModal(true);
  }, []);

  const startCopyForEnv = useCallback((env) => {
    setActionTargetUids([env.uid]);
    setShowCopyModal(true);
  }, []);

  const startDeleteForEnv = useCallback((env) => {
    setActionTargetUids([env.uid]);
    setShowDeleteModal(true);
  }, []);

  const startRenameForEnv = useCallback((env) => {
    onRenameEnvironment?.(env);
  }, [onRenameEnvironment]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && hasSelection) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasSelection, clearSelection]);

  return {
    scopeRef,
    hasSelection,
    selectedEnvUids,
    selectedEnvironmentsList,
    actionTargetUids,
    actionTargetEnvironmentsList,
    selectOnlyEnv,
    showDeleteModal,
    openDeleteModal: () => {
      setShowDeleteModal(true);
      closeMenu();
    },
    closeDeleteModal: () => setShowDeleteModal(false),
    showExportModal,
    openExportModal,
    closeExportModal,
    showCopyModal,
    openCopyModal,
    closeCopyModal,
    handleRenameSelected,
    startExportForEnv,
    startCopyForEnv,
    startDeleteForEnv,
    startRenameForEnv,
    handleRowInteraction,
    handleRowContextMenu,
    handleDeleted,
    menuVisible,
    menuPosition,
    closeMenu
  };
};

export default useEnvironmentBulkSelection;
