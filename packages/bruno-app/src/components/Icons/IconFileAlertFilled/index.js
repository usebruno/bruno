import React from 'react';

const IconFIleAlertFilled = ({ size = 16, ...props }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line><line x1="12" y1="11" x2="12" y2="14"></line>
    </svg>
  );
};

export default IconFIleAlertFilled;
