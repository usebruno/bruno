import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';

const ConfirmCollectionClose = ({ collection, onCancel, onCloseWithoutSave, onSaveAndClose }) => {
  return (
    <Modal
      size="md"
      title="Unsaved changes"
      confirmText="Save and Close"
      cancelText="Close without saving"
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
      handleCancel={onCancel}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      hideFooter={true}
    >
      <div className="flex items-center font-normal">
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-medium">Hold on..</h1>
      </div>
      <div className="font-normal mt-4">
        You have unsaved changes in <span className="font-medium">{collection.name}</span> collection settings.
      </div>

      <div className="flex justify-between mt-6">
        <div>
          <Button color="danger" onClick={onCloseWithoutSave}>
            Don't Save
          </Button>
        </div>
        <div className="flex gap-2">
          <Button color="secondary" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSaveAndClose}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmCollectionClose;
