import React from 'react';
import { IconDownload, IconCopy, IconEye, IconAlertTriangle } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import { formatSize } from 'utils/common/index';
import Button from 'ui/Button/index';
import { getResponseBodyClient } from 'utils/response-body';

/** Show inline below this size; warning UI above (bytes). */
export const SHOW_INLINE_BYTES = 10 * 1024 * 1024;

/** View-from-disk allowed at or below this; Download only above (bytes). */
export const VIEW_MAX_BYTES = 50 * 1024 * 1024;

const LargeResponseWarning = ({
  item,
  responseSize,
  onRevealResponse,
  canView = true,
  revealLoading = false
}) => {
  const { ipcRenderer } = window;
  const response = item.response || {};
  const canDownload = Boolean(response.bodyRef) && !response.stream?.running;
  const canCopy = response.data != null;

  const downloadResponseToFile = () => {
    if (!canDownload) return;
    return new Promise((resolve, reject) => {
      const savePromise = response.bodyRef
        ? getResponseBodyClient().save(response.bodyRef, {
            url: item?.requestSent?.url,
            pathname: item.pathname,
            headers: response.headers
          })
        : ipcRenderer.invoke('renderer:save-response-to-file', response, item.requestSent.url, item.pathname);

      savePromise
        .then((result) => {
          if (result && result.success) {
            toast.success('Response downloaded to file');
          }
          resolve();
        })
        .catch((err) => {
          toast.error(get(err, 'error.message') || get(err, 'message') || 'Something went wrong!');
          reject(err);
        });
    });
  };

  const copyResponse = () => {
    if (!canCopy) return;
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
            Handling responses over <span className="size-highlight supported-size">{formatSize(SHOW_INLINE_BYTES)}</span> could degrade performance.
            <br />
            Size of current response: <span className="size-highlight current-size">{formatSize(responseSize)}</span>
            {!canView ? (
              <>
                <br />
                Responses over <span className="size-highlight supported-size">{formatSize(VIEW_MAX_BYTES)}</span> can only be downloaded.
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
          disabled={!canView || revealLoading}
          title={canView ? 'Show response content' : 'Response is too large to view in-app'}
          color="secondary"
          size="sm"
        >
          {revealLoading ? 'Loading…' : 'View'}
        </Button>
        <Button
          icon={<IconDownload size={18} strokeWidth={1.5} />}
          iconPosition="left"
          onClick={downloadResponseToFile}
          disabled={!canDownload}
          title="Download response to file"
          color="secondary"
          size="sm"
          data-testid="large-response-download-btn"
        >
          Download
        </Button>
        <Button
          icon={<IconCopy size={18} strokeWidth={1.5} />}
          iconPosition="left"
          onClick={copyResponse}
          disabled={!canCopy}
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
