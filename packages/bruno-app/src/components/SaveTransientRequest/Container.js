import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { pluralizeWord } from 'utils/common';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons';
import { clearAllSaveTransientRequestModals } from 'providers/ReduxStore/slices/collections';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import SaveTransientRequest from './index';

const SaveTransientRequestContainer = () => {
  const dispatch = useDispatch();
  const modals = useSelector((state) => state.collections.saveTransientRequestModals);
  const [openItemUid, setOpenItemUid] = useState(null);

  const handleDiscardAll = () => {
    dispatch(clearAllSaveTransientRequestModals());
  };

  const handleCancel = () => {
    // Clear all modals on close
    dispatch(clearAllSaveTransientRequestModals());
  };

  const handleOpenSpecificModal = (itemUid) => {
    setOpenItemUid(itemUid);
  };

  const handleCloseSpecificModal = () => {
    setOpenItemUid(null);
  };

  // If a specific modal is open, show it
  if (openItemUid) {
    const modalToOpen = modals.find((modal) => modal.item.uid === openItemUid);
    if (modalToOpen) {
      return (
        <SaveTransientRequest
          item={modalToOpen.item}
          collection={modalToOpen.collection}
          isOpen={true}
          onClose={handleCloseSpecificModal}
        />
      );
    }
    // If modal not found, reset
    setOpenItemUid(null);
  }

  // Show list of multiple modals
  return (
    <Modal
      size="md"
      title="Unsaved Transient Requests"
      hideFooter={true}
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      handleCancel={handleCancel}
    >
      <div className="flex items-center">
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-medium">You have unsaved transient requests</h1>
      </div>
      <p className="mt-4">
        You have <span className="font-medium">{modals.length}</span>{' '}
        {pluralizeWord('request', modals.length)} that need to be saved.
      </p>

      <div className="mt-4">
        <p className="text-sm font-medium mb-2">
          Transient {pluralizeWord('Request', modals.length)} ({modals.length})
        </p>
        <p className="text-xs text-orange-600 mb-3">
          These requests need to be saved before you can proceed.
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {modals.map((modal) => {
            const { item, collection } = modal;
            return (
              <div
                key={item.uid}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded border border-gray-200"
              >
                <div className="flex flex-col flex-1 min-w-0 mr-3">
                  <span className="text-sm text-gray-700 truncate">{item.name}</span>
                  <span className="text-xs text-gray-500 truncate">
                    {collection.name}
                  </span>
                </div>
                <Button
                  color="primary"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenSpecificModal(item.uid)}
                  icon={<IconDeviceFloppy size={14} strokeWidth={1.5} />}
                >
                  Save
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t">
        <Button color="danger" onClick={handleDiscardAll}>
          Discard All
        </Button>
      </div>
    </Modal>
  );
};

export default SaveTransientRequestContainer;
