import React from 'react';

const IconFolderDown = ({ size = 16, strokeWidth = 1.5, className = '', ...rest }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon icon-tabler icon-tabler-folder-down ${className}`}
      {...rest}
    >
      <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
      <path d="M12 10.5v5.5" />
      <path d="M9.5 13.5l2.5 2.5l2.5 -2.5" />
    </svg>
  );
};

export default IconFolderDown;
