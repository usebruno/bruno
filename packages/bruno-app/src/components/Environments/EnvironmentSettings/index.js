import Modal from 'components/Modal/index';
import React, { useState } from 'react';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ImportEnvironment from './ImportEnvironment';
import { IconAlertCircle, IconFileAlert } from '@tabler/icons';

const EnvButton = ({ children, className, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded bg-transparent px-2.5 py-2 w-fit text-xs font-semibold text-slate-900 dark:text-slate-50 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-700
        ${className}`}
    >
      {children}
    </button>
  );
};

const EnvironmentSettings = ({ collection, onClose }) => {
  const [isModified, setIsModified] = useState(false);
  const { environments } = collection;
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  if (!environments || !environments.length) {
    return (
      <StyledWrapper>
        <Modal
          size="md"
          title="Environments"
          confirmText={'Close'}
          handleConfirm={onClose}
          handleCancel={onClose}
          hideCancel={true}
        >
          {openCreateModal && <CreateEnvironment collection={collection} onClose={() => setOpenCreateModal(false)} />}
          {openImportModal && <ImportEnvironment collection={collection} onClose={() => setOpenImportModal(false)} />}
          <div className="text-center items-center flex flex-col">
            <IconFileAlert size={64} strokeWidth={1} />
            <span className="font-semibold mt-2">No environments found</span>
            <span className="font-extralight mt-2 text-zinc-500 dark:text-zinc-400">
              Get started by using the following buttons :
            </span>
            <div className="flex items-center justify-center mt-6">
              <EnvButton onClick={() => setOpenCreateModal(true)}>
                <span>Create Environment</span>
              </EnvButton>

              <span className="mx-4">Or</span>

              <EnvButton onClick={() => setOpenImportModal(true)}>
                <span>Import Environment</span>
              </EnvButton>
            </div>
          </div>
        </Modal>
      </StyledWrapper>
    );
  }

  return (
    <Modal size="lg" title="Environments" handleCancel={onClose} hideFooter={true}>
      <EnvironmentList
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        collection={collection}
        isModified={isModified}
        setIsModified={setIsModified}
      />
    </Modal>
  );
};

export default EnvironmentSettings;
