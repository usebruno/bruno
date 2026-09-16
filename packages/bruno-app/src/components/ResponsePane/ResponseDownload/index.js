import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconDownload } from '@tabler/icons';
import classnames from 'classnames';
import ActionIcon from 'ui/ActionIcon/index';
import { formatResponse } from 'utils/common';

const FORMAT_CONTENT_TYPES = {
  json: 'application/json',
  html: 'text/html',
  xml: 'application/xml',
  javascript: 'application/javascript',
  raw: 'text/plain',
  hex: 'text/plain',
  base64: 'text/plain'
};

export const getResponseText = (selectedTab, selectedFormat, data, dataBuffer) => {
  if (selectedTab === 'preview') {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }

  if (selectedFormat && data && dataBuffer) {
    return formatResponse(data, dataBuffer, selectedFormat, null);
  }

  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
};

export const getDownloadResponse = ({ response, selectedFormat, selectedTab, data, dataBuffer }) => {
  if (!selectedFormat || !dataBuffer) {
    return response;
  }

  const responseText = getResponseText(selectedTab, selectedFormat, data, dataBuffer);

  return {
    ...response,
    data: responseText,
    dataBuffer: Buffer.from(responseText).toString('base64'),
    size: Buffer.byteLength(responseText),
    headers: {
      ...response.headers,
      'content-type': FORMAT_CONTENT_TYPES[selectedFormat] || 'text/plain'
    }
  };
};

const ResponseDownload = forwardRef(({ item, children, selectedFormat, selectedTab, data, dataBuffer }, ref) => {
  const { ipcRenderer } = window;
  const response = item.response || {};
  const isDisabled = !response.dataBuffer || response.stream?.running;
  const elementRef = useRef(null);

  useImperativeHandle(ref, () => ({
    click: () => elementRef.current?.click(),
    isDisabled
  }), [isDisabled]);

  const saveResponseToFile = () => {
    if (isDisabled) {
      return;
    }
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:save-response-to-file', getDownloadResponse({ response, selectedFormat, selectedTab, data, dataBuffer }), item?.requestSent?.url, item.pathname)
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

  return (
    <div
      ref={elementRef}
      aria-disabled={isDisabled}
      onClick={saveResponseToFile}
      title={!children ? 'Save response to file' : null}
      className={classnames({
        'opacity-50 cursor-not-allowed': isDisabled && !children
      })}
      data-testid="response-download-btn"
    >
      {children ? children : (
        <StyledWrapper className="flex items-center">
          <ActionIcon className="p-1" disabled={isDisabled}>
            <IconDownload size={16} strokeWidth={2} />
          </ActionIcon>
        </StyledWrapper>
      )}
    </div>
  );
});

ResponseDownload.displayName = 'ResponseDownload';

export default ResponseDownload;
