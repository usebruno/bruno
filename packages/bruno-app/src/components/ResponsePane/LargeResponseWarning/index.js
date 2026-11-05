import React from 'react';
import { useDispatch } from 'react-redux';
import { IconDownload, IconCopy, IconEye, IconAlertTriangle } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import { formatSize } from 'utils/common/index';
import Button from 'ui/Button/index';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { updateActivePreferencesTab } from 'providers/ReduxStore/slices/app';

const LargeResponseWarning = ({ item, collectionUid, responseSize, onRevealResponse }) => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();
  const response = item.response || {};
  const isDownloadOnly = !response.data && !response.dataBuffer;

  const openPreferences = () => {
    dispatch(updateActivePreferencesTab({ tab: 'general' }));
    dispatch(addTab({ type: 'preferences', uid: collectionUid ? `${collectionUid}-preferences` : 'preferences', collectionUid }));
  };

  const downloadResponseToFile = () => {
    return new Promise((resolve) => {
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
          resolve();
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
            This response exceeds your configured preview size limit.
            <br />
            Current response size: <span className="size-highlight current-size">{formatSize(responseSize)}</span>
            <br />
            You can increase the maximum response size in <button className="text-link" onClick={openPreferences} data-testid="large-response-open-preferences">Preferences</button> to preview larger responses. Higher limits may impact performance and memory usage.
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
