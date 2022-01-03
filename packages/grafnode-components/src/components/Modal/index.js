import React, {useState, useEffect} from 'react';
import StyledWrapper from './StyledWrapper';

const ModalHeader = ({title, handleCancel}) => (
  <div className="grafnode-modal-header">
    {title ? <div className="grafnode-modal-heade-title">{title}</div> : null}
    {handleCancel ? (
      <div className="close cursor-pointer" onClick={handleCancel ? () => handleCancel() : null}>
        ×
      </div>
    ) : null}
  </div>
);

const ModalContent = ({children}) => (
  <div className="grafnode-modal-content px-4 py-6">
    {children}
  </div>
);

const ModalFooter = ({confirmText, cancelText, handleSubmit, handleCancel, confirmDisabled}) => {
  confirmText = confirmText || 'Save';
  cancelText = cancelText || 'Cancel';

  return (
    <div className="flex justify-end p-4 grafnode-modal-footer">
      <span className="mr-2">
        <button type="button" onClick={handleCancel} className="btn btn-sm btn-close">
          {cancelText}
        </button>
      </span>
      <span className="">
        <button type="submit" className="submit btn btn-sm btn-secondary" disabled={confirmDisabled} onClick={handleSubmit} >
          {confirmText}
        </button>
      </span>
    </div>
  );
}

const ConfirmModal = ({
  size,
  title,
  confirmText,
  cancelText,
  handleCancel,
  handleConfirm,
  children,
  confirmDisabled
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const escFunction = (event) => {
    const escKeyCode = 27;
    if (event.keyCode === escKeyCode) {
      closeModal();
    }
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => handleCancel(), 500);
  }

  useEffect(() => {
    document.addEventListener('keydown', escFunction, false);

    return () => {
      document.removeEventListener('keydown', escFunction, false);
    }
  }, []);

  let classes = 'grafnode-modal';
  if (isClosing) {
    classes += ' modal--animate-out';
  }
  return (
    <StyledWrapper className={classes}>
      <div className={`grafnode-modal-card modal-${size}`}>
        <ModalHeader title={title} handleCancel={() => closeModal()} />
        <ModalContent>{children}</ModalContent>
        <ModalFooter 
          confirmText={confirmText}
          cancelText={cancelText}
          handleCancel={() => closeModal()} 
          handleSubmit={handleConfirm} 
          confirmDisabled={confirmDisabled}
        />
      </div>
      <div className="grafnode-modal-backdrop" onClick={() => closeModal()} />
    </StyledWrapper>
  );
};

export default ConfirmModal;
