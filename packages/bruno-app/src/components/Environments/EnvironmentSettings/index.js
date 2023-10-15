import Modal from 'components/Modal/index';
import React, { useState } from 'react';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ImportEnvironment from "components/Environments/EnvironmentSettings/ImportEnvironment";

const EnvironmentSettings = ({ collection, onClose }) => {
  const { environments } = collection;
  const [openCreateModal, setOpenCreateModal] = useState(false);

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
          <div className="text-center">
            <p>No environments found!</p>
            <button
              className="btn-create-environment text-link pr-2 py-3 mt-2 select-none"
              onClick={() => setOpenCreateModal(true)}
            >
              + <span>Create Environment</span>
            </button>
            <ImportEnvironment title={"Import Postman Environment"} collectionUid={collection.uid}/>
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
