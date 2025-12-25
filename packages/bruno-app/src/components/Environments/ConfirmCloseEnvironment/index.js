import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import Button from 'ui/Button';

const ConfirmCloseEnvironment = ({ onCancel, onCloseWithoutSave, onSaveAndClose, isGlobal }) => {
  return (
    <Portal>
      <Modal
        size="md"
        title="Unsaved changes"
        disableEscapeKey={true}
        disableCloseOnOutsideClick={true}
        closeModalFadeTimeout={150}
        handleCancel={onCancel}
        hideFooter={true}
      >
        <div className="flex items-center font-normal">
          <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
          <h1 className="ml-2 text-lg font-medium">Hold on...</h1>
        </div>
        <div className="font-normal mt-4">
          You have unsaved changes in {isGlobal ? 'global' : 'collection'} environment settings.
        </div>

        <div className="flex justify-between mt-6">
          <div>
            <Button size="sm" color="danger" onClick={onCloseWithoutSave}>
              Don't Save
            </Button>
          </div>
          <div>
            <Button size="sm" color="secondary" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSaveAndClose}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </Portal>
  );
};

export default ConfirmCloseEnvironment;
