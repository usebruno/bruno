import { useCallback, useMemo, useState } from 'react';

const useEnvironmentActions = ({
  environments,
  selectedEnvUids,
  onRenameEnvironment,
  onClearSelection
}) => {
  const [targetEnvUids, setTargetEnvUids] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isRowMenuOpen, setIsRowMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const targetEnvUidSet = useMemo(() => new Set(targetEnvUids), [targetEnvUids]);

  const targetEnvironments = useMemo(
    () => environments?.filter((env) => targetEnvUidSet.has(env.uid)) || [],
    [environments, targetEnvUidSet]
  );

  const isMenuOpen = isContextMenuOpen || isRowMenuOpen;
  const isModalOpen = isDeleteModalOpen || isExportModalOpen || isCopyModalOpen;

  // Closes the context menu. The row menu closes itself.
  const closeMenu = useCallback(() => {
    setIsContextMenuOpen(false);
  }, []);

  // The row menu targets its own row.
  const handleRowMenuOpenChange = useCallback((env, open) => {
    setIsRowMenuOpen(open);
    if (open) setTargetEnvUids([env.uid]);
  }, []);

  // Right-clicking a selected row applies actions to the entire selection.
  // Otherwise, actions apply only to the right-clicked row.
  const handleRowContextMenu = useCallback((e, env) => {
    e.preventDefault();

    const isPartOfMultiSelection = selectedEnvUids.includes(env.uid) && selectedEnvUids.length > 1;
    setTargetEnvUids(isPartOfMultiSelection ? selectedEnvUids : [env.uid]);
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  }, [selectedEnvUids]);

  const openExportModal = useCallback((env) => {
    if (env?.uid) setTargetEnvUids([env.uid]);
    setIsExportModalOpen(true);
  }, []);

  const openCopyModal = useCallback((env) => {
    if (env?.uid) setTargetEnvUids([env.uid]);
    setIsCopyModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((env) => {
    if (env?.uid) setTargetEnvUids([env.uid]);
    setIsDeleteModalOpen(true);
  }, []);

  // Delete shortcut entry point, with a menu open it acts on that menu's targets, otherwise on the selection.
  const deleteFromShortcut = useCallback(() => {
    if (isMenuOpen) {
      setIsContextMenuOpen(false);
    } else {
      setTargetEnvUids(selectedEnvUids);
    }
    setIsDeleteModalOpen(true);
  }, [isMenuOpen, selectedEnvUids]);

  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  const closeCopyModal = useCallback(() => {
    setIsCopyModalOpen(false);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleRenameTarget = useCallback(() => {
    const target = targetEnvironments[0];
    onClearSelection();
    if (target) {
      onRenameEnvironment(target);
    }
  }, [targetEnvironments, onClearSelection, onRenameEnvironment]);

  return {
    targetEnvironments,
    isModalOpen,
    isMenuOpen,
    isContextMenuOpen,
    handleRowMenuOpenChange,
    menuPosition,
    closeMenu,
    handleRowContextMenu,
    handleRenameTarget,
    isDeleteModalOpen,
    openDeleteModal,
    deleteFromShortcut,
    closeDeleteModal,
    isExportModalOpen,
    openExportModal,
    closeExportModal,
    isCopyModalOpen,
    openCopyModal,
    closeCopyModal
  };
};

export default useEnvironmentActions;
