import React from 'react';
import Modal from '@components/Modal';

const ConfirmRequestClose = ({ onCancel, onCloseWithoutSave, onSaveAndClose }) => {
  const _handleCancel = ({ type }) => {
    if (type === 'button') {
      return onCloseWithoutSave();
    }

    return onCancel();
  };

  return (
    <Modal
      size="sm"
      title="Unsaved changes"
      confirmText="Save and Close"
      cancelText="Close without saving"
      handleConfirm={onSaveAndClose}
      handleCancel={_handleCancel}
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
    >
      <div className="font-normal">You have unsaved changes in you request.</div>
    </Modal>
  );
};

export default ConfirmRequestClose;
