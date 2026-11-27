import React, { useState } from 'react';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const CONFIRM_KEYWORD = 'delete';

const TypeToConfirmDeleteModal = ({ title, name, pathname, warning, onConfirm, onClose, dataTestId }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText.toLowerCase() === CONFIRM_KEYWORD;

  const handleConfirm = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title={title}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        confirmButtonColor="danger"
        confirmDisabled={!isConfirmed || isDeleting}
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        dataTestId={dataTestId}
      >
        <p className="modal-description">
          Are you sure you want to permanently delete <strong>"{name}"</strong>?
        </p>
        <div className="item-info-card">
          <div className="item-name">{name}</div>
          <div className="item-path">{pathname}</div>
        </div>
        <p className="warning-text">{warning}</p>
        <div className="delete-confirmation">
          <label htmlFor={`${dataTestId}-confirm-input`}>
            Type <span className="delete-keyword">{CONFIRM_KEYWORD}</span> to confirm
          </label>
          <input
            id={`${dataTestId}-confirm-input`}
            data-testid={`${dataTestId}-confirm-input`}
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_KEYWORD}
            autoComplete="off"
            autoFocus
          />
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default TypeToConfirmDeleteModal;
