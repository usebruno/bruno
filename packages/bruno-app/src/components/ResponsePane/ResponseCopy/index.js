import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { IconCopy, IconCheck } from '@tabler/icons';
import classnames from 'classnames';
import ActionIcon from 'ui/ActionIcon/index';
import { formatResponse } from 'utils/common';

// Helper function to get text to copy
const getTextToCopy = (selectedTab, selectedFormat, data, dataBuffer) => {
  // If preview is on, copy raw data (what's shown in TextPreview)
  if (selectedTab === 'preview') {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }
  // If editor is on, copy formatted data based on selected format
  if (selectedFormat && data && dataBuffer) {
    return formatResponse(data, dataBuffer, selectedFormat, null);
  }
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
};

// Hook to get copy response function
export const useResponseCopy = (item, selectedFormat, selectedTab, data, dataBuffer) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const copyResponse = useCallback(async () => {
    try {
      const textToCopy = getTextToCopy(selectedTab, selectedFormat, data, dataBuffer);
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Response copied to clipboard');
      setCopied(true);
    } catch (error) {
      toast.error('Failed to copy response');
    }
  }, [selectedTab, selectedFormat, data, dataBuffer]);

  return { copyResponse, copied, hasData: !!data };
};

const ResponseCopy = forwardRef(({ item, children, selectedFormat, selectedTab, data, dataBuffer }, ref) => {
  const { copyResponse, copied, hasData } = useResponseCopy(item, selectedFormat, selectedTab, data, dataBuffer);
  const elementRef = useRef(null);

  const isDisabled = !hasData ? true : false;

  useImperativeHandle(ref, () => ({
    click: () => elementRef.current?.click(),
    isDisabled
  }), [isDisabled]);

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && hasData) {
      e.preventDefault();
      copyResponse();
    }
  };

  const handleClick = () => {
    if (hasData) {
      copyResponse();
    }
  };

  return (
    <div
      ref={elementRef}
      onClick={handleClick}
      title={!children ? 'Copy response to clipboard' : null}
      onKeyDown={handleKeyDown}
      aria-disabled={isDisabled}
      className={classnames({
        'opacity-50 cursor-not-allowed': isDisabled && !children
      })}
      data-testid="response-copy-btn"
    >
      {children ? children : (
        <StyledWrapper className="flex items-center">
          <ActionIcon className="p-1" disabled={isDisabled}>
            {copied ? (
              <IconCheck size={16} strokeWidth={2} />
            ) : (
              <IconCopy size={16} strokeWidth={2} />
            )}
          </ActionIcon>
        </StyledWrapper>
      )}
    </div>
  );
});

ResponseCopy.displayName = 'ResponseCopy';

export default ResponseCopy;
