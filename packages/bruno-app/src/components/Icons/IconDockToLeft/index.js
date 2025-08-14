import React from 'react';

const IconDockToLeft = ({ size = 16, strokeWidth = 1.5, className = '', ...rest }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      fill="none"
      className={className}
      {...rest}
    >
      <path stroke="none" fill="none" d="M0 0h24v24H0z" />
      <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
      <path d="M9 20V4" />
      <rect x="4.6" y="4.6" width="4.8" height="14.8" rx="0.8" fill="currentColor" />
    </svg>
  );
};

export default IconDockToLeft;
