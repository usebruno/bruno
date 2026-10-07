import Portal from 'components/Portal';
import Modal from 'components/Modal';

const MockConfirmModal = ({
  title,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  confirmDisabled = false,
  confirmButtonColor,
  dataTestId,
  size = 'sm',
  children
}) => (
  <Portal>
    <Modal
      size={size}
      title={title}
      confirmText={confirmText}
      cancelText={cancelText}
      handleConfirm={onConfirm}
      handleCancel={onClose}
      confirmDisabled={confirmDisabled}
      confirmButtonColor={confirmButtonColor}
      dataTestId={dataTestId}
    >
      {children}
    </Modal>
  </Portal>
);

export default MockConfirmModal;
