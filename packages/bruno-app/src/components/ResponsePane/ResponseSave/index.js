import React from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconDownload } from '@tabler/icons';

const ResponseSave = ({ item }) => {
  const { ipcRenderer } = window;
  const response = item.response || {};

  const saveResponseToFile = () => {
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:save-response-to-file', response, item?.requestSent?.url)
        .then(resolve)
        .catch((err) => {
          toast.error(get(err, 'error.message') || 'Something went wrong!');
          reject(err);
        });
    });
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={saveResponseToFile} disabled={!response.dataBuffer} title="Save response to file">
        <IconDownload size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default ResponseSave;
