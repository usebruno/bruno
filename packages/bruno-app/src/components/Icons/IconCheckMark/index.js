import React from 'react';

const IconCheckMark = ({ color = '#cccccc', size = 16, ...props }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3.3335 8.49996L6.66683 11.8333L13.3335 5.16663" stroke={color} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default IconCheckMark;
