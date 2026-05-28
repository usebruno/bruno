import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ExportEnvironmentModal from 'components/Environments/Common/ExportEnvironmentModal';

const WorkspaceEnvironments = ({ workspace }) => {
  const [isModified, setIsModified] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);

  const [selectedEnvironment, setSelectedEnvironment] = useState(() => {
    const environments = globalEnvironments || [];
    if (!environments.length) return null;
    return environments.find((env) => env.uid === activeGlobalEnvironmentUid) || environments[0];
  });

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
