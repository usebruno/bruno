import React, { useState } from 'react';
import { IconX } from '@tabler/icons';
import Modal from 'components/Modal';
import FileTab from './FileTab';
import FullscreenLoader from './FullscreenLoader/index';
import { useTheme } from 'providers/Theme';

const ImportCollection = ({ onClose, handleSubmit }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (isLoading) {
    return <FullscreenLoader isLoading={isLoading} />;
  }

  return (
    <Modal size="sm" title="Import Collection" hideFooter={true} handleCancel={onClose} dataTestId="import-collection-modal">
      <div className="flex flex-col">
        {errorMessage && (
          <div
            className="mb-4 p-2 border rounded-md"
            style={{
              backgroundColor: theme.status?.danger?.background || '#fef2f2',
              borderColor: theme.status?.danger?.border || '#fecaca'
            }}
          >
            <div className="flex gap-2">
              <div
                className="text-xs flex-1"
                style={{ color: theme.status?.danger?.text || '#dc2626' }}
              >
                {errorMessage}
              </div>
              <div
                className="close-button flex items-center cursor-pointer"
                onClick={() => setErrorMessage('')}
                style={{ color: theme.status?.danger?.text || '#dc2626' }}
              >
                <IconX size={16} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )}

        <FileTab
          setIsLoading={setIsLoading}
          handleSubmit={handleSubmit}
          setErrorMessage={setErrorMessage}
        />
      </div>
    </Modal>
  );
};

export default ImportCollection;
