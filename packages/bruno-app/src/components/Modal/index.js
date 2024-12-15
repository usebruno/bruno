import React, { useEffect, useState, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import useFocusTrap from 'hooks/useFocusTrap';

const ESC_KEY_CODE = 27;
const ENTER_KEY_CODE = 13;

const ModalHeader = ({ title, handleCancel, customHeader, hideClose }) => (
  <div className="bruno-modal-header">
    {customHeader ? customHeader : <>{title ? <div className="bruno-modal-header-title">{title}</div> : null}</>}
    {handleCancel && !hideClose ? (
      <div className="close cursor-pointer" onClick={handleCancel ? () => handleCancel() : null}>
        ×
      </div>
    ) : null}
  </div>
);

const ModalContent = ({ children }) => <div className="bruno-modal-content px-4 py-6">{children}</div>;

const ModalFooter = ({
  confirmText,
  cancelText,
  handleSubmit,
  handleCancel,
  confirmDisabled,
  hideCancel,
  hideFooter
}) => {
  confirmText = confirmText || 'Save';
  cancelText = cancelText || 'Cancel';

  if (hideFooter) {
    return null;
  }

  return (
    <div className="flex justify-end p-4 bruno-modal-footer">
      <span className={hideCancel ? 'hidden' : 'mr-2'}>
        <button type="button" onClick={handleCancel} className="btn btn-md btn-close">
          {cancelText}
        </button>
      </span>
      <span>
        <button
          type="submit"
          className="submit btn btn-md btn-secondary"
          disabled={confirmDisabled}
          onClick={handleSubmit}
        >
          {confirmText}
        </button>
      </span>
    </div>
  );
};

const Modal = ({
  size,
  title,
  customHeader,
  confirmText,
  cancelText,
  handleCancel,
  handleConfirm,
  children,
  confirmDisabled,
  hideCancel,
  hideFooter,
  hideClose,
  disableCloseOnOutsideClick,
  disableEscapeKey,
  onClick,
  closeModalFadeTimeout = 500
}) => {
  const modalRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleKeydown = (event) => {
    const { keyCode, shiftKey, ctrlKey, altKey, metaKey } = event;
    switch (keyCode) {
      case ESC_KEY_CODE: {
        if (disableEscapeKey) return;
        return closeModal({ type: 'esc' });
      }
      case ENTER_KEY_CODE: {
        if (!shiftKey && !ctrlKey && !altKey && !metaKey && handleConfirm) {
          return handleConfirm();
        }
      }
    }
  };

  useFocusTrap(modalRef);
  
  const closeModal = (args) => {
    setIsClosing(true);
    setTimeout(() => handleCancel(args), closeModalFadeTimeout);
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeydown, false);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [disableEscapeKey, document]);

  let classes = 'bruno-modal';
  if (isClosing) {
    classes += ' modal--animate-out';
  }
  if (hideFooter) {
    classes += ' modal-footer-none';
  }
  return (
    <StyledWrapper className={classes} onClick={onClick ? (e) => onClick(e) : null}>
      <div
        className={`bruno-modal-card modal-${size}`}
        ref={modalRef}
        role="dialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <ModalHeader
          title={title}
          hideClose={hideClose}
          handleCancel={() => closeModal({ type: 'icon' })}
          customHeader={customHeader}
        />
        <ModalContent>{children}</ModalContent>
        <ModalFooter
          confirmText={confirmText}
          cancelText={cancelText}
          handleCancel={() => closeModal({ type: 'button' })}
          handleSubmit={handleConfirm}
          confirmDisabled={confirmDisabled}
          hideCancel={hideCancel}
          hideFooter={hideFooter}
        />
      </div>

      {/* Clicking on backdrop closes the modal */}
      <div
        className="bruno-modal-backdrop"
        onClick={
          disableCloseOnOutsideClick
            ? null
            : () => {
                closeModal({ type: 'backdrop' });
              }
        }
      />
    </StyledWrapper>
  );
};

export default Modal;
