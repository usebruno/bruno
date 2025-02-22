import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';

const ConfirmRequestClose = ({ tabsToClose, onCancel, onCloseWithoutSave, onSaveAndClose }) => (
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
      <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
    </div>
    <div className="font-normal mt-4">
      You have unsaved changes in the following requests:
      <ul>
        {tabsToClose.map(({ item }) => (
          <li key={item.uid}>
            <span className="font-semibold">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="flex justify-between mt-6">
      <button className="btn btn-sm btn-danger" onClick={onCloseWithoutSave}>
        Don't Save
      </button>
      <div>
        <button className="btn btn-close btn-sm mr-2" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onSaveAndClose}>
          Save
        </button>
      </div>
    </div>
  </Modal>
);

export default ConfirmRequestClose;
