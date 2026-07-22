import React from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';

const SyncFromExamplesModal = ({ onClose, onConfirm, isSyncing }) => (
  <Portal>
    <Modal
      size="sm"
      title="Sync with Collection Examples"
      confirmText={isSyncing ? 'Syncing...' : 'Sync'}
      cancelText="Cancel"
      handleConfirm={onConfirm}
      handleCancel={onClose}
      confirmDisabled={isSyncing}
      dataTestId="sync-mock-examples-modal"
    >
      <p>
        Mock responses that match collection examples will be overwritten with the latest example data.
      </p>
      <p className="mt-3 text-sm opacity-80">
        Custom mock responses without a matching example will be kept.
      </p>
    </Modal>
  </Portal>
);

export default SyncFromExamplesModal;
