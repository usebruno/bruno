import React from 'react';
import StyledWrapper from './StyledWrapper';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

const formatSize = (size) => {
  if (size <= 1024) {
    return size + 'B';
  }

  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const whole = Math.floor(value);
  const decimal = Math.round((value - whole).toFixed(2) * 100);
  return whole + '.' + decimal + UNITS[unit];
};

const ResponseSize = ({ size }) => {
  if (!Number.isFinite(size)) {
    return null;
  }

  return (
    <StyledWrapper title={(size?.toLocaleString() || '0') + 'B'} className="ml-2">
      {formatSize(size)}
    </StyledWrapper>
  );
};
export default ResponseSize;
