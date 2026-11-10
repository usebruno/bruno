import React from 'react';
import toast from 'react-hot-toast';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import StyledWrapper from './StyledWrapper';

const MergedVariable = ({ field }) => {
  const { copied, copyToClipboard } = useCopyToClipboard();
  return (
    <StyledWrapper aria-label={`Merged ${field.name}`}>
      <div className="variable-heading">
        <strong>{field.name}</strong>
        <span className="muted">{field.count} fragments</span>
        <button
          type="button"
          data-testid={`sse-copy-${field.name}`}
          onClick={() => copyToClipboard(field.text).catch(() => toast.error('Failed to copy variable'))}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre data-testid={`sse-variable-${field.name}`}>{field.text}</pre>
    </StyledWrapper>
  );
};

export default MergedVariable;
