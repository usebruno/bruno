import React from 'react';
import StyledWrapper from './StyledWrapper';

const Spinner = ({ size = 'md', children }) => {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32
  };

  const spinnerSize = sizeMap[size] || 20;

  return (
    <StyledWrapper $size={size}>
      <span className="spinner">
        <svg
          width={spinnerSize}
          height={spinnerSize}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="31.4 31.4"
          />
        </svg>
      </span>
      {children && <div className="spinner-text">{children}</div>}
    </StyledWrapper>
  );
};

export default Spinner;
