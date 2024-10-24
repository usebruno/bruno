import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { pluralizeWord } from 'utils/common';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import { saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';

const SingleRequestMessage = ({ item }) => {
  return (
    <div className="font-normal mt-4">
      You have unsaved changes in request <span className="font-semibold">{item.name}</span>.
    </div>
  )
}

const MultipleRequestsMessage = ({ items, maxItems }) => {
  return (
    <>
      <p className="mt-4">
        Do you want to save the changes you made to the following{' '}
        <span className="font-medium">{items.length}</span> {pluralizeWord('request', items.length)}?
      </p>

      <ul className="mt-4">
        {items.slice(0, maxItems).map((item) => {
          return (
            <li key={item.uid} className="mt-1 text-xs">
              {item.filename}
            </li>
          );
        })}
      </ul>

      {items.length > maxItems && (
        <p className="mt-1 text-xs">
          ...{items.length - maxItems} additional{' '}
          {pluralizeWord('request', items.length - maxItems)} not shown
        </p>
      )}
    </>
  )
}

const SaveRequestsModal = ({ onSaveAndClose, onCloseWithoutSave, onCancel, items = [] }) => {

  const dispatch = useDispatch();
  const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;

  const handleSaveAndClose = async () => {
    await dispatch(saveMultipleRequests(items));
    onSaveAndClose(items);
  }

  const handleCloseWithoutSave = async () => {
    onCloseWithoutSave(items);
  }

  useEffect(() => {
    if (items.length === 0) {
      return onCloseWithoutSave([]);
    }
  }, [items]);

  if (!items.length) {
    return null;
  }

  return (
    <Modal
      size="md"
      title="Unsaved changes"
      confirmText="Save and Close"
      cancelText="Close without saving"
      handleCancel={onCancel}
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
      hideFooter={true}
    >
      <div className="flex items-center">
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-semibold">Hold on...</h1>
      </div>
      {items.length > 1 ? 
        <MultipleRequestsMessage items={items} maxItems={MAX_UNSAVED_REQUESTS_TO_SHOW} /> : 
        <SingleRequestMessage item={items[0]} />
      }
      <div className="flex justify-between mt-6">
        <div>
          <button className="btn btn-sm btn-danger" onClick={handleCloseWithoutSave}>
            Don't Save
          </button>
        </div>
        <div>
          <button className="btn btn-close btn-sm mr-2" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSaveAndClose}>
            {items.length > 1 ? 'Save All' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveRequestsModal;
