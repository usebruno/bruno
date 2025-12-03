import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { IconCopy, IconCheck } from '@tabler/icons';

const ResponseCopy = ({ item }) => {
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

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={copyResponse} disabled={!response.data} title="Copy response to clipboard">
        {copied ? (
          <IconCheck size={16} strokeWidth={1.5} />
        ) : (
          <IconCopy size={16} strokeWidth={1.5} />
        )}
      </button>
    </StyledWrapper>
  );
};

export default ResponseCopy;
