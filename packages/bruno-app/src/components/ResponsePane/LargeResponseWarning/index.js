import React from 'react';
import { IconDownload, IconCopy, IconEye, IconAlertTriangle } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import { formatSize } from 'utils/common/index';

const LargeResponseWarning = ({ item, responseSize, onRevealResponse }) => {
  const { ipcRenderer } = window;
  const response = item.response || {};

  const saveResponseToFile = () => {
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:save-response-to-file', response, item.requestSent.url)
        .then(() => {
          toast.success('Response saved to file');
          resolve();
        })
        .catch((err) => {
          toast.error(get(err, 'error.message') || 'Something went wrong!');
          reject(err);
        });
    });
  };

  const copyResponse = () => {
    try {
      const textToCopy = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);

      navigator.clipboard.writeText(textToCopy).then(() => {
        toast.success('Response copied to clipboard');
      }).catch(() => {
        toast.error('Failed to copy response');
      });
    } catch (error) {
      toast.error('Failed to copy response');
    }
  };

  return (
    <StyledWrapper>
      <div className="warning-container">
        <div className="warning-icon">
          <IconAlertTriangle size={45} strokeWidth={2} />
        </div>
        <div className="warning-content">
          <div className="warning-title">
            Large Response Warning
          </div>
          <div className="warning-description">
            Handling responses over <span className="size-highlight supported-size">{formatSize(10 * 1024 * 1024)}</span> could degrade performance.
          <br />
            Size of current response: <span className="size-highlight current-size">{formatSize(responseSize)}</span>
          </div>
        </div>
      </div>
      <div className="warning-actions">
        <button
          className="btn-reveal"
          onClick={onRevealResponse}
          title="Show response content"
        >
          <IconEye size={18} strokeWidth={1.5} />
          View
        </button>
        <button
          className="btn-save"
          onClick={saveResponseToFile}
          disabled={!response.dataBuffer}
          title="Save response to file"
        >
          <IconDownload size={18} strokeWidth={1.5} />
          Save
        </button>
        <button
          className="btn-copy"
          onClick={copyResponse}
          disabled={!response.data}
          title="Copy response to clipboard"
        >
          <IconCopy size={18} strokeWidth={1.5} />
          Copy
        </button>
      </div>
    </StyledWrapper>
  );
};

export default LargeResponseWarning;