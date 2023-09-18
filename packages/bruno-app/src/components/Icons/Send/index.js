import React from 'react';

const SendIcon = ({ color, width }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={width} viewBox="0 0 48 48">
      <path fill={color} d="M4.02 42l41.98-18-41.98-18-.02 14 30 4-30 4z" />
      <path d="M0 0h48v48h-48z" fill="none" />
    </svg>
  );
};

export default SendIcon;
