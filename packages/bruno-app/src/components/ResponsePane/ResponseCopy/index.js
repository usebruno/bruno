import React from 'react';
import { IconCopy } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const ResponseCopy = ({ item }) => {
  const response = item.response || {};

  const getResponseText = () => {
    return JSON.stringify(response.data, null, 2);
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <CopyToClipboard
        className="copy-to-clipboard"
        text={getResponseText()}
        onCopy={() => toast.success('Copied to clipboard!')}
      >
        <button title="Copy response" disabled={!response.dataBuffer}>
          <IconCopy size={16} strokeWidth={1.5} />
        </button>
      </CopyToClipboard>
    </StyledWrapper>
  );
};
export default ResponseCopy;
