import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { pluralizeWord } from 'utils/common';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons';
import { clearAllSaveTransientRequestModals } from 'providers/ReduxStore/slices/collections';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import SaveTransientRequest from './index';
import StyledWrapper from './StyledWrapper';

const SaveTransientRequestContainer = () => {
  const dispatch = useDispatch();
  const modals = useSelector((state) => state.collections.saveTransientRequestModals);
  const [openItemUid, setOpenItemUid] = useState(null);

  // Reset openItemUid if the modal no longer exists in the array
  useEffect(() => {
    if (openItemUid && !modals.find((modal) => modal.item.uid === openItemUid)) {
      setOpenItemUid(null);
    }
  }, [modals, openItemUid]);

  const handleDiscardAll = () => {
    // Close all tabs for the transient requests (this will also delete the transient files)
    const tabUids = modals.map((modal) => modal.item.uid);
    dispatch(closeTabs({ tabUids }));

    // Clear all modals
    dispatch(clearAllSaveTransientRequestModals());

    // Show success message
    toast.success(`Discarded ${modals.length} ${pluralizeWord('request', modals.length)}`);
  };

  const handleCancel = () => {
    // Clear all modals on close
    dispatch(clearAllSaveTransientRequestModals());
  };

  const handleOpenSpecificModal = (itemUid) => {
    setOpenItemUid(itemUid);
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
        />
      );
    }
  }

  // Show list of multiple modals
  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Unsaved Transient Requests"
        hideFooter={true}
        disableEscapeKey={true}
        disableCloseOnOutsideClick={true}
        handleCancel={handleCancel}
      >
        <div className="unsaved-requests-header">
          <IconAlertTriangle size={32} strokeWidth={1.5} className="unsaved-requests-icon" />
          <h1 className="unsaved-requests-title">You have unsaved transient requests</h1>
        </div>
        <p className="unsaved-requests-description">
          You have <span className="font-medium">{modals.length}</span>{' '}
          {pluralizeWord('request', modals.length)} that need to be saved.
        </p>

        <div className="unsaved-requests-list-section">
          <p className="unsaved-requests-list-title">
            Transient {pluralizeWord('Request', modals.length)} ({modals.length})
          </p>
          <p className="unsaved-requests-list-subtitle">
            These requests need to be saved before you can proceed.
          </p>
          <div className="unsaved-requests-list">
            {modals.map((modal) => {
              const { item, collection } = modal;
              return (
                <div key={item.uid} className="unsaved-request-item">
                  <div className="unsaved-request-item-content">
                    <span className="unsaved-request-item-name">{item.name}</span>
                    <span className="unsaved-request-item-collection">
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

        <div className="unsaved-requests-footer">
          <Button color="danger" onClick={handleDiscardAll}>
            Discard All
          </Button>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default SaveTransientRequestContainer;
