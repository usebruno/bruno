import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconDownload } from '@tabler/icons';
import classnames from 'classnames';
import ActionIcon from 'ui/ActionIcon/index';

const ResponseDownload = forwardRef(({ item, children }, ref) => {
  const { ipcRenderer } = window;
  const response = item.response || {};
  const isDisabled = !response.dataBuffer ? true : false;
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
      ref={elementRef}
      role={!!children ? 'button' : undefined}
      aria-disabled={isDisabled}
      onClick={saveResponseToFile}
      onKeyDown={handleKeyDown}
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
