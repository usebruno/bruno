import React from 'react';
import StyledWrapper from './StyledWrapper';

const ResponseSize = ({ size }) => {
  let sizeToDisplay = '';

  if (size > 1024) {
    // size is greater than 1kb
    let kb = Math.floor(size / 1024);
    let decimal = Math.round(((size % 1024) / 1024).toFixed(2) * 100);
    sizeToDisplay = kb + '.' + decimal + 'KB';
  } else {
    sizeToDisplay = size + 'B';
  }

  return (
    <StyledWrapper title={size?.toLocaleString() + 'B'} className="ml-4">
      {sizeToDisplay}
    </StyledWrapper>
  );
};
export default ResponseSize;
