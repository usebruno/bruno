import React from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';

const ResponseSave = ({ item }) => {
  const { ipcRenderer } = window;
  const response = item.response || {};

  const saveResponseToFile = () => {
    return new Promise((resolve, reject) => {
      console.log(item);
      ipcRenderer
        .invoke('renderer:save-response-to-file', response, item.requestSent.url)
        .then(resolve)
        .catch((err) => {
          toast.error(get(err, 'error.message') || 'Something went wrong!');
          reject(err);
        });
    });
  };

  return (
    <StyledWrapper className="ml-4">
      <button onClick={saveResponseToFile} disabled={!response.dataBuffer}>
        Save Response
      </button>
    </StyledWrapper>
  );
};
export default ResponseSave;
