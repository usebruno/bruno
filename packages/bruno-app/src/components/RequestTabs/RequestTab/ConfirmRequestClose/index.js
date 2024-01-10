import React from 'react';
import Modal from 'components/Modal';
import { AlertTriangle } from 'lucide-react';

const ConfirmRequestClose = ({ item, onCancel, onCloseWithoutSave, onSaveAndClose }) => {
  return (
    <Modal
      size="md"
      title="Unsaved changes"
      confirmText="Save and Close"
      cancelText="Close without saving"
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      hideFooter={true}
    >
      <div className="flex items-center font-normal">
        <AlertTriangle size={32} strokeWidth={1.5} className="text-amber-500" />
        <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
      </div>
      <div className="font-normal mt-4">
        You have unsaved changes in request <span className="font-semibold">{item.name}</span>.
      </div>

      <div className="flex justify-between mt-6">
        <div>
          <button className="btn btn-sm btn-danger" onClick={onCloseWithoutSave}>
            Don't Save
          </button>
        </div>
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
};

export default ConfirmRequestClose;
