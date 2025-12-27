import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import { IconFileAlert } from '@tabler/icons';
import ImportEnvironmentModal from 'components/Environments/Common/ImportEnvironmentModal';
import ExportEnvironmentModal from 'components/Environments/Common/ExportEnvironmentModal';
import Button from 'ui/Button';

const DefaultTab = ({ setTab }) => (
  <div className="empty-state">
    <IconFileAlert size={48} strokeWidth={1.5} />
    <div className="title">No Environments</div>
    <div className="actions">
      <Button size="sm" color="secondary" onClick={() => setTab('create')}>
        Create Environment
      </Button>
      <Button size="sm" color="secondary" onClick={() => setTab('import')}>
        Import Environment
      </Button>
    </div>
  </div>
);

const WorkspaceEnvironments = ({ workspace }) => {
  const [isModified, setIsModified] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [tab, setTab] = useState('default');
  const [showExportModal, setShowExportModal] = useState(false);

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);

  if (!globalEnvironments || !globalEnvironments.length) {
    return (
      <StyledWrapper>
        {tab === 'create' ? (
          <CreateEnvironment onClose={() => setTab('default')} />
        ) : tab === 'import' ? (
          <ImportEnvironmentModal type="global" onClose={() => setTab('default')} />
        ) : (
          <DefaultTab setTab={setTab} />
        )}
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <EnvironmentList
        environments={globalEnvironments}
        activeEnvironmentUid={activeGlobalEnvironmentUid}
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        isModified={isModified}
        setIsModified={setIsModified}
        collection={null}
        setShowExportModal={setShowExportModal}
      />
      {showExportModal && (
        <ExportEnvironmentModal
          onClose={() => setShowExportModal(false)}
          environments={globalEnvironments}
          environmentType="global"
        />
      )}
    </StyledWrapper>
  );
};

export default WorkspaceEnvironments;
