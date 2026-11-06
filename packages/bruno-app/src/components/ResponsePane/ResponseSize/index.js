import React from 'react';
import StyledWrapper from './StyledWrapper';
import { formatSize } from 'utils/common';

const ResponseSize = ({ size }) => {
  if (!Number.isFinite(size)) {
    return null;
  }

  const sizeToDisplay = formatSize(size, 2);

  return (
    <StyledWrapper title={(size?.toLocaleString() || '0') + 'B'} className="ml-2">
      {sizeToDisplay}
    </StyledWrapper>
  );
};

export default ResponseSize;
