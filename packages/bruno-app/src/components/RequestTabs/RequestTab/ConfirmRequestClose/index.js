import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';

const ConfirmRequestClose = ({ item, example, onCancel, onCloseWithoutSave, onSaveAndClose }) => {
  const isExample = !!example;
  const itemName = isExample ? example.name : item.name;
  const itemType = isExample ? 'example' : 'request';

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
        You have unsaved changes in {itemType} <span className="font-medium">{itemName}</span>.
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
          <Button onClick={onSaveAndClose}>Save</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmRequestClose;
