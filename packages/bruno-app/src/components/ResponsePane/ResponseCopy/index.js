import React from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { IconCopy } from '@tabler/icons';

const ResponseCopy = ({ item }) => {
  const response = item.response || {};

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
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={copyResponse} disabled={!response.data} title="Copy response to clipboard">
        <IconCopy size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default ResponseCopy;