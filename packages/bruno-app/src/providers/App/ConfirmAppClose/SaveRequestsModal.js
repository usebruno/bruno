import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { pluralizeWord } from 'utils/common';
import { saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';

const SaveRequestsModal = ({ onConfirm, onClose, draftRequests = [] }) => {
  const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;
  const dispatch = useDispatch();

  useEffect(() => {
    if (draftRequests.length === 0) {
      return dispatch(onConfirm());
    }
  }, [draftRequests, dispatch]);

  const closeWithoutSave = () => {
    dispatch(onConfirm());
    onClose();
  };

  const closeWithSave = () => {
    dispatch(saveMultipleRequests(draftRequests))
      .then(() => dispatch(onConfirm()))
      .then(() => onClose());
  };

  if (!draftRequests.length) {
    return null;
  }

  return (
    <Modal
      size="md"
      title="Unsaved changes"
      confirmText="Save and Close"
      cancelText="Close without saving"
      handleCancel={onClose}
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
      hideFooter={true}
    >
      <div className="flex items-center">
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
      </div>
      <p className="mt-4">
        Do you want to save the changes you made to the following{' '}
        <span className="font-medium">{draftRequests.length}</span> {pluralizeWord('request', draftRequests.length)}?
      </p>

      <ul className="mt-4">
        {draftRequests.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item) => {
          return (
            <li key={item.uid} className="mt-1 text-xs">
              {item.filename}
            </li>
          );
        })}
      </ul>

      {draftRequests.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
        <p className="mt-1 text-xs">
          ...{draftRequests.length - MAX_UNSAVED_REQUESTS_TO_SHOW} additional{' '}
          {pluralizeWord('request', draftRequests.length - MAX_UNSAVED_REQUESTS_TO_SHOW)} not shown
        </p>
      )}

      <div className="flex justify-between mt-6">
        <div>
          <button className="btn btn-sm btn-danger" onClick={closeWithoutSave}>
            Don't Save
          </button>
        </div>
        <div>
          <button className="btn btn-close btn-sm mr-2" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={closeWithSave}>
            {draftRequests.length > 1 ? 'Save All' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveRequestsModal;
