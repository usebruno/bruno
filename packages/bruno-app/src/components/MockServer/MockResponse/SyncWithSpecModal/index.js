import React from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';

const SyncWithSpecModal = ({ specName, isSyncing, onClose, onConfirm }) => (
  <Portal>
    <Modal
      size="sm"
      title="Sync with API Spec"
      confirmText={isSyncing ? 'Syncing...' : 'Sync'}
      cancelText="Cancel"
      handleConfirm={onConfirm}
      handleCancel={onClose}
      confirmDisabled={isSyncing}
      dataTestId="mock-response-sync-spec-modal"
    >
      <p>
        Mock responses matching an endpoint in
        {' '}
        <span className="font-medium">{specName || 'this API spec'}</span>
        {' '}
        will be overwritten with the latest spec data (bodies generated from schema).
      </p>
      <p className="mt-3 text-sm opacity-80">
        Custom mock responses without a matching endpoint will be kept.
      </p>
    </Modal>
  </Portal>
);

export default SyncWithSpecModal;
