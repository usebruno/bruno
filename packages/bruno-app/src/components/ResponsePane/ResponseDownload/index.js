import React from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconDownload } from '@tabler/icons';
import classnames from 'classnames';

const ResponseDownload = ({ item, children }) => {
  const { ipcRenderer } = window;
  const response = item.response || {};
  const isDisabled = !response.dataBuffer;

  const saveResponseToFile = () => {
    if (isDisabled) {
      return;
    }
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

  const handleKeyDown = (e) => {
    if (isDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      saveResponseToFile();
    }
  };

  return (
    <div
      role={!!children ? 'button' : undefined}
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      onClick={saveResponseToFile}
      onKeyDown={handleKeyDown}
      title={!children ? 'Save response to file' : null}
      className={classnames({
        'opacity-50 cursor-not-allowed': isDisabled
      })}
      data-testid="response-download-btn"
    >
      {children ? children : (
        <StyledWrapper className="flex items-center">
          <button className="p-1">
            <IconDownload size={16} strokeWidth={2} />
          </button>
        </StyledWrapper>
      )}
    </div>
  );
};
export default ResponseDownload;
