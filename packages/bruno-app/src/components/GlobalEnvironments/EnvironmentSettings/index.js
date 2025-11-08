import Modal from 'components/Modal/index';
import React, { useState } from 'react';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import { IconFileAlert } from '@tabler/icons';
import ImportEnvironmentModal from 'components/Environments/Common/ImportEnvironmentModal';
import ExportEnvironmentModal from 'components/Environments/Common/ExportEnvironmentModal';

export const SharedButton = ({ children, className, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded bg-transparent px-2.5 py-2 w-fit text-xs font-semibold text-zinc-900 dark:text-zinc-50 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-700
        ${className}`}
    >
      {children}
    </button>
  );
};

const DefaultTab = ({ setTab }) => {
  return (
    <div className="text-center items-center flex flex-col">
      <IconFileAlert size={64} strokeWidth={1} />
      <span className="font-semibold mt-2">No Global Environments found</span>
      <div className="flex items-center justify-center mt-6">
        <SharedButton onClick={() => setTab('create')}>
          <span>Create Global Environment</span>
        </SharedButton>

        <span className="mx-4">Or</span>

        <SharedButton onClick={() => setTab('import')}>
          <span>Import Environment</span>
        </SharedButton>
      </div>
    </div>
  );
};

const EnvironmentSettings = ({ globalEnvironments, collection, activeGlobalEnvironmentUid, onClose }) => {
  const [isModified, setIsModified] = useState(false);
  const environments = globalEnvironments;
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [tab, setTab] = useState('default');
  const [showExportModal, setShowExportModal] = useState(false);
  if (!environments || !environments.length) {
    return (
      <StyledWrapper>
        <Modal size="md" title="Global Environments" handleCancel={onClose} hideCancel={true} hideFooter={true}>
          {tab === 'create' ? (
            <CreateEnvironment onClose={() => setTab('default')} />
          ) : tab === 'import' ? (
            <ImportEnvironmentModal type="global" onClose={() => setTab('default')} />
          ) : (
            <DefaultTab setTab={setTab} />
          )}
        </Modal>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <Modal size="lg" title="Global Environments" handleCancel={onClose} hideFooter={true}>
        <EnvironmentList
          environments={globalEnvironments}
          activeEnvironmentUid={activeGlobalEnvironmentUid}
          selectedEnvironment={selectedEnvironment}
          setSelectedEnvironment={setSelectedEnvironment}
          isModified={isModified}
          setIsModified={setIsModified}
          collection={collection}
          setShowExportModal={setShowExportModal}
        />
      </Modal>
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

export default EnvironmentSettings;
