import React from 'react';
import StyledWrapper from './StyledWrapper';

const ResponseSize = ({ size }) => {
  if (!Number.isFinite(size)) {
    return null;
  }

  let sizeToDisplay = '';

  // If size is greater than 1024 bytes, format as KB
  if (size > 1024) {
    let kb = Math.floor(size / 1024);
    let decimal = Math.round(((size % 1024) / 1024).toFixed(2) * 100);
    if (decimal >= 100) {
      kb += 1;
      decimal = 0;
    }
    let decimalStr = decimal < 10 && decimal > 0 ? '0' + decimal : decimal.toString();
    sizeToDisplay = kb + '.' + decimalStr + 'KB';
  } else {
    // If size is less than or equal to 1024 bytes, display as bytes (B)
    sizeToDisplay = size + 'B';
  }

  return (
    <StyledWrapper title={(size?.toLocaleString() || '0') + 'B'} className="ml-2">
      {sizeToDisplay}
    </StyledWrapper>
  );
};
export default ResponseSize;
