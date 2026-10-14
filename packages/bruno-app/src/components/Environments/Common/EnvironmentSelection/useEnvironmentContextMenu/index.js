import { useCallback, useEffect, useMemo, useState } from 'react';

const useEnvironmentContextMenu = ({
  environments,
  selectedEnvUids,
  activeEnvUid,
  onRenameEnvironment,
  onClearSelection,
  onEnvsDeleted
}) => {
  const [actionTargetUids, setActionTargetUids] = useState([]);

  const [activeModal, setActiveModal] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const actionTargetUidSet = useMemo(() => new Set(actionTargetUids), [actionTargetUids]);
  const actionTargetEnvironmentsList = useMemo(
    () => environments?.filter((env) => actionTargetUidSet.has(env.uid)) || [],
    [environments, actionTargetUidSet]
  );

  const showDeleteModal = activeModal === 'delete';
  const showExportModal = activeModal === 'export';
  const showCopyModal = activeModal === 'copy';
  const isAnyModalOpen = activeModal !== null;

  // If the targets disappear while a modal is open (file deleted or reloaded outside the app) the modals
  // render nothing and never call onClose, which would leave the flag stuck open and the shortcuts disabled.
  useEffect(() => {
    if (activeModal !== null && actionTargetEnvironmentsList.length === 0) {
      setActiveModal(null);
    }
  }, [activeModal, actionTargetEnvironmentsList]);

  const openMenuAt = useCallback((e) => {
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuVisible(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleRowContextMenu = useCallback((e, env) => {
    e.preventDefault();
    e.stopPropagation();

    const isPartOfMultiSelection = selectedEnvUids.includes(env.uid) && selectedEnvUids.length > 1;
    setActionTargetUids(isPartOfMultiSelection ? selectedEnvUids : [env.uid]);

    openMenuAt(e);
  }, [selectedEnvUids, openMenuAt]);

  // Targets the whole selection, or the open environment when nothing is selected.
  const deleteSelected = useCallback(() => {
    const targets = selectedEnvUids.length > 0 ? selectedEnvUids : (activeEnvUid ? [activeEnvUid] : []);
    if (!targets.length) return;
    setActionTargetUids(targets);
    setActiveModal('delete');
  }, [selectedEnvUids, activeEnvUid]);

  // Called with the uids whose delete failed. Everything else in the targets is gone, so the
  // selection is told to drop just those; a failed target stays targeted (and selected) for a retry.
  const handleDeleted = useCallback((failedUids) => {
    const failed = failedUids || [];
    const failedSet = new Set(failed);
    const deleted = actionTargetUids.filter((uid) => !failedSet.has(uid));

    setActionTargetUids(failed);
    onEnvsDeleted(deleted);
  }, [actionTargetUids, onEnvsDeleted]);

  const openDeleteModal = useCallback(() => {
    setActiveModal('delete');
    closeMenu();
  }, [closeMenu]);

  const closeDeleteModal = useCallback(() => {
    setActiveModal((prev) => (prev === 'delete' ? null : prev));
  }, []);

  const openExportModal = useCallback(() => {
    setActiveModal('export');
    closeMenu();
  }, [closeMenu]);

  const closeExportModal = useCallback(() => {
    setActiveModal((prev) => (prev === 'export' ? null : prev));
  }, []);

  const openCopyModal = useCallback(() => {
    setActiveModal('copy');
    closeMenu();
  }, [closeMenu]);

  const closeCopyModal = useCallback(() => {
    setActiveModal((prev) => (prev === 'copy' ? null : prev));
  }, []);

  const handleRenameSelected = useCallback(() => {
    const target = actionTargetEnvironmentsList[0];
    closeMenu();
    onClearSelection();
    if (target) {
      onRenameEnvironment(target);
    }
  }, [actionTargetEnvironmentsList, closeMenu, onClearSelection, onRenameEnvironment]);

  const startExportForEnv = useCallback((env) => {
    setActionTargetUids([env.uid]);
    setActiveModal('export');
  }, []);

  const startCopyForEnv = useCallback((env) => {
    setActionTargetUids([env.uid]);
    setActiveModal('copy');
  }, []);

  const startDeleteForEnv = useCallback((env) => {
    setActionTargetUids([env.uid]);
    setActiveModal('delete');
  }, []);

  return {
    actionTargetUids,
    actionTargetEnvironmentsList,
    isAnyModalOpen,
    menuVisible,
    menuPosition,
    closeMenu,
    handleRowContextMenu,
    deleteSelected,
    handleDeleted,
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
    startDeleteForEnv
  };
};

export default useEnvironmentContextMenu;
