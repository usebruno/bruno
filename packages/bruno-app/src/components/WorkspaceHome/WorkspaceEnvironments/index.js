import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ExportEnvironmentModal from 'components/Environments/Common/ExportEnvironmentModal';

const WorkspaceEnvironments = ({ workspace }) => {
  const [isModified, setIsModified] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);

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
