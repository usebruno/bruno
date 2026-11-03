import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTabState } from 'providers/ReduxStore/slices/tabs';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ExportEnvironmentModal from 'components/Environments/Common/ExportEnvironmentModal';

const WorkspaceEnvironments = ({ workspace }) => {
  const dispatch = useDispatch();
  const [isModified, setIsModified] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);

  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const persistedEnvUid = useSelector((state) => state.tabs.tabs.find((t) => t.uid === activeTabUid)?.tabState?.envUid);

  // Remember which environment the user last viewed in this tab (via tabState) so navigating away and back preserves it.
  const selectedEnvironment = useMemo(() => {
    const environments = globalEnvironments || [];
    if (!environments.length) return null;
    return (
      environments.find((env) => env.uid === persistedEnvUid)
      || environments.find((env) => env.uid === activeGlobalEnvironmentUid)
      || environments[0]
    );
  }, [globalEnvironments, persistedEnvUid, activeGlobalEnvironmentUid]);

  const setSelectedEnvironment = (env) => {
    if (!activeTabUid || !env?.uid) return;
    dispatch(updateTabState({ uid: activeTabUid, tabState: { envUid: env.uid } }));
  };

  return (
    <StyledWrapper>
      <EnvironmentList
        environments={globalEnvironments || []}
        activeEnvironmentUid={activeGlobalEnvironmentUid}
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        isModified={isModified}
        setIsModified={setIsModified}
        collection={null}
        workspace={workspace}
        setShowExportModal={setShowExportModal}
      />
      {showExportModal && (
        <ExportEnvironmentModal
          onClose={() => setShowExportModal(false)}
          environments={globalEnvironments || []}
          environmentType="global"
        />
      )}
    </StyledWrapper>
  );
};

export default WorkspaceEnvironments;
