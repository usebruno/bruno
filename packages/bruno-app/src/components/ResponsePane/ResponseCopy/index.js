import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { IconCopy, IconCheck } from '@tabler/icons';

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

const ResponseCopy = ({ item, children }) => {
  const { copyResponse, copied, hasData } = useResponseCopy(item);

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && hasData) {
      copyResponse();
    }
  };

  const handleClick = () => {
    if (hasData) {
      copyResponse();
    }
  };

  return (
    <div role="button" tabIndex={0} onClick={handleClick} title={!children ? 'Copy response to clipboard' : null} onKeyDown={handleKeyDown}>
      {children ? children : (
        <StyledWrapper className="flex items-center">
          <button className="p-1" disabled={!hasData}>
            {copied ? (
              <IconCheck size={16} strokeWidth={2} />
            ) : (
              <IconCopy size={16} strokeWidth={2} />
            )}
          </button>
        </StyledWrapper>
      )}
    </div>
  );
};

export default ResponseCopy;
