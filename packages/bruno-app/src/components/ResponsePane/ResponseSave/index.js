import React from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconDownload } from '@tabler/icons';

const ResponseSave = ({ item, asDropdownItem, onClose }) => {
  const { ipcRenderer } = window;
  const response = item.response || {};

  const saveResponseToFile = () => {
    if (!response.dataBuffer) return;
    if (onClose) onClose();
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:save-response-to-file', response, item?.requestSent?.url, item.pathname)
        .then(resolve)
        .catch((err) => {
          toast.error(get(err, 'error.message') || 'Something went wrong!');
          reject(err);
        });
    });
  };

  if (asDropdownItem) {
    return (
      <div
        className="dropdown-item"
        onClick={saveResponseToFile}
        disabled={!response.dataBuffer}
        style={!response.dataBuffer ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
      >
        <IconDownload size={16} strokeWidth={1.5} className="icon mr-2" />
        Download
      </div>
    );
  }

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={saveResponseToFile} disabled={!response.dataBuffer} title="Save response to file">
        <IconDownload size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default ResponseSave;
