import Modal from 'components/Modal';
import Portal from 'components/Portal/index';

const ConfirmCollectionImportUpdate = ({ onConfirm, onCancel }) => {
  return (
    <Portal>
      <Modal
        size="md"
        title="Update existing collection"
        confirmText="Yes"
        cancelText="No"
        disableEscapeKey={true}
        disableCloseOnOutsideClick={true}
        handleConfirm={onConfirm}
        handleCancel={onCancel}
        hideClose={true}
      >
        <div>Would you like to add to the existing collection at this location?</div>
      </Modal>
    </Portal>
  );
};

export default ConfirmCollectionImportUpdate;
