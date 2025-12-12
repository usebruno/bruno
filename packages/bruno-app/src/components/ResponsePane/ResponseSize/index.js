import React from 'react';
import StyledWrapper from './StyledWrapper';

const ResponseSize = ({ size }) => {
  if (!Number.isFinite(size)) {
    return null;
  }

  let sizeToDisplay = '';

  if (size >= 1024 * 1024) {
    // Show as MB with two decimals
    const mb = size / (1024 * 1024);
    sizeToDisplay = mb.toFixed(2) + 'MB';
  } else if (size >= 1024) {
    // Show as KB with two decimals
    const kb = size / 1024;
    sizeToDisplay = kb.toFixed(2) + 'KB';
  } else {
    // Show as bytes
    sizeToDisplay = size + 'B';
  }

  return (
    <StyledWrapper title={(size?.toLocaleString() || '0') + 'B'} className="ml-2">
      {sizeToDisplay}
    </StyledWrapper>
  );
};
export default ResponseSize;
