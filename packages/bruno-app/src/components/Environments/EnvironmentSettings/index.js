import React, { useState } from 'react';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ExportEnvironmentModal from 'components/Environments/Common/ExportEnvironmentModal';

const EnvironmentSettings = ({ collection }) => {
  const [isModified, setIsModified] = useState(false);
  const environments = collection?.environments || [];

  const [selectedEnvironment, setSelectedEnvironment] = useState(() => {
    if (!environments.length) return null;
    return environments.find((env) => env.uid === collection?.activeEnvironmentUid) || environments[0];
  });
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <StyledWrapper>
      <EnvironmentList
        environments={environments}
        activeEnvironmentUid={collection?.activeEnvironmentUid}
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        isModified={isModified}
        setIsModified={setIsModified}
        collection={collection}
        setShowExportModal={setShowExportModal}
      />
      {showExportModal && (
        <ExportEnvironmentModal
          onClose={() => setShowExportModal(false)}
          environments={environments}
          environmentType="collection"
        />
      )}
    </StyledWrapper>
  );
};

export default EnvironmentSettings;
