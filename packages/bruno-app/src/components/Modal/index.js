import React, { useEffect, useState, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import useFocusTrap from 'hooks/useFocusTrap';
import Button from 'ui/Button';

const ESC_KEY_CODE = 27;
const ENTER_KEY_CODE = 13;

const ModalHeader = ({ title, handleCancel, customHeader, hideClose }) => (
  <div className="bruno-modal-header">
    {customHeader ? customHeader : <>{title ? <div className="bruno-modal-header-title">{title}</div> : null}</>}
    {handleCancel && !hideClose ? (
      // TODO: Remove data-test-id and use data-testid instead across the codebase.
      <div className="close cursor-pointer" onClick={handleCancel ? () => handleCancel() : null} data-testid="modal-close-button">
        ×
      </div>
    ) : null}
  </div>
);

const ModalContent = ({ children }) => <div className="bruno-modal-content px-4 py-4">{children}</div>;

const ModalFooter = ({
  confirmText,
  cancelText,
  handleSubmit,
  handleCancel,
  confirmDisabled,
  hideCancel,
  hideFooter,
  confirmButtonColor = 'primary'
}) => {
  confirmText = confirmText || 'Save';
  cancelText = cancelText || 'Cancel';

  if (hideFooter) {
    return null;
  }

  return (
    <div className="flex justify-end p-4 bruno-modal-footer">
      <span className={hideCancel ? 'hidden' : 'mr-2'}>
        <Button type="button" color="secondary" variant="ghost" onClick={handleCancel}>
          {cancelText}
        </Button>
      </span>
      <span>
        <Button
          type="submit"
          color={confirmButtonColor}
          disabled={confirmDisabled}
          onClick={handleSubmit}
          className="submit"
        >
          {confirmText}
        </Button>
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
  handleConfirm = () => {},
  children,
  confirmDisabled,
  hideCancel,
  hideFooter,
  hideClose,
  disableCloseOnOutsideClick,
  disableEscapeKey,
  onClick,
  closeModalFadeTimeout = 500,
  dataTestId,
  confirmButtonColor = 'primary'
}) => {
  const modalRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleKeydown = (event) => {
    const { keyCode, shiftKey, ctrlKey, altKey, metaKey } = event;

    // Only handle events from elements inside this modal
    if (keyCode !== ESC_KEY_CODE && (!modalRef.current || !modalRef.current.contains(event.target))) {
      return;
    }

    switch (keyCode) {
      case ESC_KEY_CODE: {
        if (disableEscapeKey) return;
        return closeModal({ type: 'esc' });
      }
      case ENTER_KEY_CODE: {
        const isSubmitButton = event.target?.type === 'submit';
        if (!shiftKey && !ctrlKey && !altKey && !metaKey && handleConfirm && !isSubmitButton && !confirmDisabled) {
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
  }, [disableEscapeKey, document, handleConfirm, confirmDisabled]);

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
        data-testid={dataTestId}
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
          confirmButtonColor={confirmButtonColor}
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
