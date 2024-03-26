import Modal from 'components/Modal/index';
import React, { useState } from 'react';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ImportEnvironment from './ImportEnvironment';

const EnvironmentSettings = ({ collection, onClose }) => {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  if (!collection.environments?.length) {
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
          <div className="text-center flex flex-col">
            <p>No environments found!</p>
            <button
              className="btn-create-environment text-link pr-2 py-3 mt-2 select-none"
              onClick={() => setOpenCreateModal(true)}
            >
              <span>Create Environment</span>
            </button>

            <span>Or</span>

            <button
              className="btn-import-environment text-link pl-2 pr-2 py-3 select-none"
              onClick={() => setOpenImportModal(true)}
            >
              <span>Import Environment</span>
            </button>
          </div>
        </Modal>
      </StyledWrapper>
    );
  }

  return (
    <Modal size="lg" title="Environments" handleCancel={onClose} hideFooter={true}>
      <EnvironmentList collection={collection} />
    </Modal>
  );
};

export default EnvironmentSettings;
