import React, { useState } from 'react';
import CreateEnvironment from 'components/Environments/EnvironmentSettings/CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import { IconFileAlert } from '@tabler/icons';
import ImportEnvironmentModal from 'components/Environments/Common/ImportEnvironmentModal';
import ExportEnvironmentModal from 'components/Environments/Common/ExportEnvironmentModal';

const DefaultTab = ({ setTab }) => (
  <div className="empty-state">
    <IconFileAlert size={48} strokeWidth={1.5} />
    <div className="title">No Environments</div>
    <div className="actions">
      <button className="shared-button" onClick={() => setTab('create')}>
        Create Environment
      </button>
      <button className="shared-button" onClick={() => setTab('import')}>
        Import Environment
      </button>
    </div>
  </div>
);

const EnvironmentSettings = ({ collection }) => {
  const [isModified, setIsModified] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [tab, setTab] = useState('default');
  const [showExportModal, setShowExportModal] = useState(false);

  const environments = collection?.environments || [];

  if (!environments || !environments.length) {
    return (
      <StyledWrapper>
        {tab === 'create' ? (
          <CreateEnvironment collection={collection} onClose={() => setTab('default')} />
        ) : tab === 'import' ? (
          <ImportEnvironmentModal type="collection" collection={collection} onClose={() => setTab('default')} />
        ) : (
          <DefaultTab setTab={setTab} />
        )}
      </StyledWrapper>
    );
  }

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
