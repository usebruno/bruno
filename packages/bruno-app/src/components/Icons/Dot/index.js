import React from 'react';

const DotIcon = ({ width }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={width}
      viewBox="0 0 24 24" strokeWidth="1.5"
      stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"
      className='inline-block'
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M12 7a5 5 0 1 1 -4.995 5.217l-.005 -.217l.005 -.217a5 5 0 0 1 4.995 -4.783z" strokeWidth="0" fill="currentColor" />
    </svg>
  );
};

export default DotIcon;