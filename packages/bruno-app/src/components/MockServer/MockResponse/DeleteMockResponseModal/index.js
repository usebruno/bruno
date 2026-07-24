import React from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';

const DeleteMockResponseModal = ({ response, onClose, onConfirm, isDeleting }) => (
  <Portal>
    <Modal
      size="sm"
      title="Delete Mock Response"
      confirmText={isDeleting ? 'Deleting...' : 'Delete'}
      cancelText="Cancel"
      handleConfirm={onConfirm}
      handleCancel={onClose}
      confirmDisabled={isDeleting}
      confirmButtonColor="danger"
      dataTestId="delete-mock-response-modal"
    >
      Are you sure you want to delete the mock response
      {' '}
      <span className="font-medium">{response?.name}</span>
      ?
    </Modal>
  </Portal>
);

export default DeleteMockResponseModal;
