import React from 'react';

const IconEdit = ({ color = '#F39D0E', size = 16, ...props }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g clipPath="url(#clip0_464_9527)">
        <path d="M12.6665 13.3332H5.66654L2.85988 10.4665C2.73571 10.3416 2.66602 10.1727 2.66602 9.99654C2.66602 9.82042 2.73571 9.65145 2.85988 9.52654L9.52654 2.85988C9.65145 2.73571 9.82042 2.66602 9.99654 2.66602C10.1727 2.66602 10.3416 2.73571 10.4665 2.85988L13.7999 6.19321C13.924 6.31812 13.9937 6.48709 13.9937 6.66321C13.9937 6.83933 13.924 7.0083 13.7999 7.13321L7.66654 13.3332" stroke={color} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.9998 8.86663L7.7998 4.66663" stroke={color} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="clip0_464_9527">
          <rect width={size} height={size} fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default IconEdit;
