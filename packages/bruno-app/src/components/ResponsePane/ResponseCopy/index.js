import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { IconCopy, IconCheck } from '@tabler/icons';
import classnames from 'classnames';
import ActionIcon from 'ui/ActionIcon/index';

// Hook to get copy response function
export const useResponseCopy = (item) => {
  const response = item.response || {};
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const copyResponse = async () => {
    try {
      const textToCopy = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);

      await navigator.clipboard.writeText(textToCopy);
      toast.success('Response copied to clipboard');
      setCopied(true);
    } catch (error) {
      toast.error('Failed to copy response');
    }
  };

  return { copyResponse, copied, hasData: !!response.data };
};

const ResponseCopy = forwardRef(({ item, children }, ref) => {
  const { copyResponse, copied, hasData } = useResponseCopy(item);
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
      role={!!children ? 'button' : undefined}
      tabIndex={!!children || !isDisabled ? 0 : -1}
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
