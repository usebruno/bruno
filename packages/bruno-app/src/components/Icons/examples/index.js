import React from 'react';

const ExampleIcon = ({ color = 'white', size = 16, ...props }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g clipPath="url(#clip0_486_1191)">
        <path d="M2.66699 3.33329C2.66699 3.15648 2.73723 2.98691 2.86225 2.86189C2.98728 2.73686 3.15685 2.66663 3.33366 2.66663H12.667C12.8438 2.66663 13.0134 2.73686 13.1384 2.86189C13.2634 2.98691 13.3337 3.15648 13.3337 3.33329V12.6666C13.3337 12.8434 13.2634 13.013 13.1384 13.138C13.0134 13.2631 12.8438 13.3333 12.667 13.3333H3.33366C3.15685 13.3333 2.98728 13.2631 2.86225 13.138C2.73723 13.013 2.66699 12.8434 2.66699 12.6666V3.33329Z" stroke={color} stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9.33366 5.33337H6.66699V10.6667H9.33366" stroke={color} stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9.33366 8H6.66699" stroke={color} stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <defs>
        <clipPath id="clip0_486_1191">
          <rect width={size} height={size} fill="white" />
        </clipPath>
      </defs>
    </svg>

  );
};

export default ExampleIcon;
