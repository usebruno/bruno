import React from 'react';
import toast from 'react-hot-toast';
import { IconDownload } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';

const LabelDownloadButton = ({ label, fileName, content, encoding, testId }) => {
  const saveLabel = () => {
    window.ipcRenderer
      .invoke('renderer:save-label-file', { fileName, content, encoding })
      .then((result) => {
        if (result.success) {
          toast.success(`Saved ${fileName}`);
        }
      })
      .catch((err) => toast.error(err.message || 'Failed to save label'));
  };

  return (
    <ActionIcon label={label} onClick={saveLabel} className="p-1" data-testid={testId}>
      <IconDownload size={16} strokeWidth={2} />
    </ActionIcon>
  );
};

export default LabelDownloadButton;
