import React from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';

const ManageSecrets = ({ onClose }) => {
  return (
    <Portal>
      <Modal size="sm" title="Manage Secrets" hideFooter={true} handleConfirm={onClose} handleCancel={onClose}>
        <div>
          <p>In any collection, there are secrets that need to be managed.</p>
          <p className="mt-2">These secrets can be anything such as API keys, passwords, or tokens.</p>
          <p className="mt-4">Bruno offers three approaches to manage secrets in collections.</p>
          <p className="mt-2">
            Read more about it in our{' '}
            <a
              href="https://docs.usebruno.com/secrets-management/overview"
              target="_blank"
              rel="noreferrer"
              className="text-link hover:underline"
            >
              docs
            </a>
            .
          </p>
        </div>
      </Modal>
    </Portal>
  );
};

export default ManageSecrets;
