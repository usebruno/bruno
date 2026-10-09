import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isMacOS } from 'utils/common/platform';

const noop = () => {};

const useEnvironmentBulkSelection = ({
  environments,
  filteredEnvironments,
  activeEnvUid,
  onOpenEnvironment,
  onRenameEnvironment = noop
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

  const validSelectedEnvUids = useMemo(
    () => selectedEnvUids.filter((uid) => envUids.includes(uid)),
    [selectedEnvUids, envUids]
  );
  const selectedEnvUidSet = useMemo(() => new Set(validSelectedEnvUids), [validSelectedEnvUids]);
  const actionTargetUidSet = useMemo(() => new Set(actionTargetUids), [actionTargetUids]);

  const hasSelection = validSelectedEnvUids.length > 0;
  const actionTargetEnvironmentsList = useMemo(
    () => environments?.filter((env) => actionTargetUidSet.has(env.uid)) || [],
    [environments, actionTargetUidSet]
  );

  const isAllSelected = useMemo(
    () => filteredEnvUids.length > 0 && filteredEnvUids.every((uid) => selectedEnvUidSet.has(uid)),
    [filteredEnvUids, selectedEnvUidSet]
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

  const deleteViaShortcut = useCallback(() => {
    const targets = hasSelection ? validSelectedEnvUids : (activeEnvUid ? [activeEnvUid] : []);
    if (!targets.length) return;
    setActionTargetUids(targets);
    setShowDeleteModal(true);
  }, [hasSelection, validSelectedEnvUids, activeEnvUid]);

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

  const handleRowInteraction = useCallback((e, env) => {
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

  const handleRowContextMenu = useCallback((e, env) => {
    e.preventDefault();
    e.stopPropagation();

    const isPartOfMultiSelection = selectedEnvUidSet.has(env.uid) && validSelectedEnvUids.length > 1;
    setActionTargetUids(isPartOfMultiSelection ? validSelectedEnvUids : [env.uid]);

    openMenuAt(e);
  }, [validSelectedEnvUids, selectedEnvUidSet, openMenuAt]);

  const handleDeleted = useCallback((failedUids) => {
    const failed = failedUids || [];
    const failedSet = new Set(failed);
    const deletedSet = new Set(actionTargetUids.filter((uid) => !failedSet.has(uid)));

    setActionTargetUids(failed);

    setSelectedEnvUids((prev) => prev.filter((uid) => !deletedSet.has(uid)));
    setLastClickedEnvUid((prev) => (deletedSet.has(prev) ? null : prev));
  }, [actionTargetUids]);

  const openDeleteModal = useCallback(() => {
    setShowDeleteModal(true);
    closeMenu();
  }, [closeMenu]);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
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
      onRenameEnvironment(target);
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

  const isAnyModalOpen = showDeleteModal || showExportModal || showCopyModal;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // While a modal is open every key belongs to the modal, keep the selection it acts on intact.
      if (isAnyModalOpen) return;

      if (e.key === 'Escape') {
        if (hasSelection) clearSelection();
        return;
      }

      const isMac = isMacOS();
      const hasPlatformModifierOnly = !e.shiftKey && !e.altKey && (isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey);
      const hasNoModifier = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;

      const isSelectAllShortcut = hasPlatformModifierOnly && e.key.toLowerCase() === 'a';
      const isDeleteShortcut = isMac
        ? hasPlatformModifierOnly && (e.key === 'Backspace' || e.key === 'Delete')
        : hasNoModifier && e.key === 'Delete';

      if (!isSelectAllShortcut && !isDeleteShortcut) return;

      const activeTag = document.activeElement?.tagName;
      const isTextFieldFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (isTextFieldFocused) return;

      if (!scopeRef.current?.matches(':hover')) return;

      e.preventDefault();
      if (isSelectAllShortcut) {
        selectAllEnvs();
      } else {
        deleteViaShortcut();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAnyModalOpen, hasSelection, clearSelection, selectAllEnvs, deleteViaShortcut]);

  const isEnvSelected = useCallback((uid) => selectedEnvUidSet.has(uid), [selectedEnvUidSet]);

  return {
    scopeRef,
    selectedEnvUids: validSelectedEnvUids,
    isEnvSelected,
    actionTargetUids,
    actionTargetEnvironmentsList,
    selectOnlyEnv,
    selectAllEnvs,
    isAllSelected,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
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
    startRenameForEnv: onRenameEnvironment,
    handleRowInteraction,
    handleRowContextMenu,
    handleDeleted,
    menuVisible,
    menuPosition,
    closeMenu
  };
};

export default useEnvironmentBulkSelection;
