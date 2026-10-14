import { useCallback, useMemo, useState } from 'react';

const useEnvironmentActions = ({ environments }) => {
  const [targetEnvUids, setTargetEnvUids] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const targetEnvUidSet = useMemo(() => new Set(targetEnvUids), [targetEnvUids]);

  const targetEnvironments = useMemo(
    () => environments?.filter((env) => targetEnvUidSet.has(env.uid)) || [],
    [environments, targetEnvUidSet]
  );

  const openExportModal = useCallback((env) => {
    setTargetEnvUids([env.uid]);
    setIsExportModalOpen(true);
  }, []);

  const openCopyModal = useCallback((env) => {
    setTargetEnvUids([env.uid]);
    setIsCopyModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((env) => {
    setTargetEnvUids([env.uid]);
    setIsDeleteModalOpen(true);
  }, []);

  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  const closeCopyModal = useCallback(() => {
    setIsCopyModalOpen(false);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  return {
    targetEnvironments,
    isDeleteModalOpen,
    openDeleteModal,
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
