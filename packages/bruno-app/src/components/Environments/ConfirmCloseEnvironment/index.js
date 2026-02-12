import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import Button from 'ui/Button';

const ConfirmCloseEnvironment = ({ onCancel, onCloseWithoutSave, onSaveAndClose, isGlobal, isDotEnv }) => {
  let settingsLabel = 'collection environment settings';
  if (isDotEnv) {
    settingsLabel = '.env file';
  } else if (isGlobal) {
    settingsLabel = 'global environment settings';
  }

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
          You have unsaved changes in {settingsLabel}.
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
    </Portal>
  );
};

export default ConfirmCloseEnvironment;
