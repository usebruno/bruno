import React from 'react';
import Modal from 'components/Modal/index';
import Portal from 'components/Portal/index';
import GitNotFoundMessage from 'components/Git/GitNotFoundMessage';

const GitNotFoundModal = ({ onClose }) => (
  <Portal>
    <Modal
      size="sm"
      title="Git Not Found"
      handleCancel={onClose}
      hideFooter={true}
    >
      <GitNotFoundMessage />
    </Modal>
  </Portal>
);

export default GitNotFoundModal;
