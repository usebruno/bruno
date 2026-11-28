import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconFileExport } from '@tabler/icons';
import classnames from 'classnames';
import ActionIcon from 'ui/ActionIcon/index';
import { buildHarLog } from 'utils/exporters/har';

const ResponseHarExport = forwardRef(({ item, children }, ref) => {
  const { ipcRenderer } = window;
  const response = item.response || {};
  const requestSent = item.requestSent || {};
  const isDisabled = !requestSent.url || !response.status || !!response.error || !!response.stream?.running;
  const elementRef = useRef(null);

  useImperativeHandle(ref, () => ({
    click: () => elementRef.current?.click(),
    isDisabled
  }), [isDisabled]);

  const exportHarFile = () => {
    if (isDisabled) {
      return;
    }
    const har = buildHarLog({ requestSent, response });
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:export-har-file', har, item.pathname)
        .then((result) => {
          if (result && result.success) {
            toast.success('Exported request as HAR file');
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
      onClick={exportHarFile}
      title={!children ? 'Export as HAR' : null}
      className={classnames({
        'opacity-50 cursor-not-allowed': isDisabled && !children
      })}
      data-testid="response-har-export-btn"
    >
      {children ? children : (
        <StyledWrapper className="flex items-center">
          <ActionIcon className="p-1" disabled={isDisabled}>
            <IconFileExport size={16} strokeWidth={2} />
          </ActionIcon>
        </StyledWrapper>
      )}
    </div>
  );
});

ResponseHarExport.displayName = 'ResponseHarExport';

export default ResponseHarExport;
