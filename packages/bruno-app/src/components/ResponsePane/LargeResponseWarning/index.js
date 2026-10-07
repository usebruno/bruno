import React from 'react';
import { IconDownload, IconCopy, IconEye, IconAlertTriangle } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import { formatSize } from 'utils/common/index';
import Button from 'ui/Button/index';
import { MAX_RENDERABLE_RESPONSE_BYTES } from 'utils/common/constants';

const LargeResponseWarning = ({ item, responseSize, onRevealResponse }) => {
  const { ipcRenderer } = window;
  const response = item.response || {};
  const isDownloadOnly = responseSize > MAX_RENDERABLE_RESPONSE_BYTES;

  const downloadResponseToFile = () => {
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:save-response-to-file', response, item.requestSent.url, item.pathname)
        .then((result) => {
          if (result && result.success) {
            toast.success('Response downloaded to file');
          }
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
            {isDownloadOnly ? (
              <>
                <br />
                <span data-testid="large-response-download-only">
                  Responses over <span className="size-highlight">{formatSize(MAX_RENDERABLE_RESPONSE_BYTES)}</span> can only be downloaded.
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="warning-actions">
        <Button
          icon={<IconEye size={18} strokeWidth={1.5} />}
          iconPosition="left"
          onClick={onRevealResponse}
          disabled={isDownloadOnly}
          data-testid="large-response-view"
          title="Show response content"
          color="secondary"
          size="sm"
        >
          View
        </Button>
        <Button
          icon={<IconDownload size={18} strokeWidth={1.5} />}
          iconPosition="left"
          onClick={downloadResponseToFile}
          disabled={!response.dataBuffer && !response.storedRequestUid}
          data-testid="large-response-download"
          title="Download response to file"
          color="secondary"
          size="sm"
        >
          Download
        </Button>
        <Button
          icon={<IconCopy size={18} strokeWidth={1.5} />}
          iconPosition="left"
          onClick={copyResponse}
          disabled={isDownloadOnly || !response.data}
          data-testid="large-response-copy"
          title="Copy response to clipboard"
          color="secondary"
          size="sm"
        >
          Copy
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default LargeResponseWarning;
