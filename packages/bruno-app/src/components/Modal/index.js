import React, {useState, useEffect} from 'react';
import StyledWrapper from './StyledWrapper';

const ModalHeader = ({title, handleCancel}) => (
  <div className="bruno-modal-header">
    {title ? <div className="bruno-modal-heade-title">{title}</div> : null}
    {handleCancel ? (
      <div className="close cursor-pointer" onClick={handleCancel ? () => handleCancel() : null}>
        ×
      </div>
    ) : null}
  </div>
);

const ModalContent = ({children}) => (
  <div className="bruno-modal-content px-4 py-6">
    {children}
  </div>
);

const ModalFooter = ({confirmText, cancelText, handleSubmit, handleCancel, confirmDisabled, hideCancel}) => {
  confirmText = confirmText || 'Save';
  cancelText = cancelText || 'Cancel';

  return (
    <div className="flex justify-end p-4 bruno-modal-footer">
      <span className={hideCancel ? "hidden" : "mr-2"}>
        <button type="button" onClick={handleCancel} className="btn btn-md btn-close">
          {cancelText}
        </button>
      </span>
      <span>
        <button type="submit" className="submit btn btn-md btn-secondary" disabled={confirmDisabled} onClick={handleSubmit} >
          {confirmText}
        </button>
      </span>
    </div>
  );
}

const Modal = ({
  size,
  title,
  confirmText,
  cancelText,
  handleCancel,
  handleConfirm,
  children,
  confirmDisabled,
  hideCancel,
  hideFooter
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
  };

  useEffect(() => {
    document.addEventListener('keydown', escFunction, false);

    return () => {
      document.removeEventListener('keydown', escFunction, false);
    }
  }, []);

  let classes = 'bruno-modal';
  if (isClosing) {
    classes += ' modal--animate-out';
  }
  return (
    <StyledWrapper className={classes}>
      <div className={`bruno-modal-card modal-${size}`}>
        <ModalHeader title={title} handleCancel={() => closeModal()} />
        <ModalContent>{children}</ModalContent>
        {!hideFooter ? <ModalFooter 
          confirmText={confirmText}
          cancelText={cancelText}
          handleCancel={() => closeModal()} 
          handleSubmit={handleConfirm} 
          confirmDisabled={confirmDisabled}
          hideCancel={hideCancel}
        /> : null}
      </div>

      {/* Clicking on backdrop closes the modal */}
      <div className="bruno-modal-backdrop" onClick={() => closeModal()} />
    </StyledWrapper>
  );
};

export default Modal;
