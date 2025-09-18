import React from 'react';

export const IconEdit = ({ color = '#F39D0E', size = 16, ...props }) => {
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

export const IconCaretDown = ({ color = '#8C8C8C', ...props }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <g clipPath="url(#clip0_464_9256)">
        <path d="M10.5444 5.75H4.46004C4.26888 5.7509 4.08142 5.78521 3.91637 5.84952C3.75132 5.91383 3.61447 6.00587 3.51947 6.11647C3.42448 6.22706 3.37466 6.35234 3.375 6.47978C3.37534 6.60723 3.42583 6.73238 3.52142 6.84275L6.56492 10.23C6.66228 10.3372 6.79942 10.4258 6.96311 10.4874C7.1268 10.5489 7.31151 10.5813 7.49945 10.5814C7.68739 10.5816 7.8722 10.5494 8.03608 10.4881C8.19995 10.4267 8.33735 10.3383 8.43504 10.2312L11.4763 6.8465C11.573 6.73635 11.6246 6.61118 11.626 6.48355C11.6273 6.35591 11.5783 6.23028 11.4839 6.11924C11.3895 6.0082 11.253 5.91564 11.088 5.85084C10.9231 5.78603 10.7359 5.75126 10.5444 5.75Z" fill="#8C8C8C" />
      </g>
      <defs>
        <clipPath id="clip0_464_9256">
          <rect width="9" height="6" fill="white" transform="translate(3 5)" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const IconCheckMark = ({ color = '#cccccc', size = 16, ...props }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3.3335 8.49996L6.66683 11.8333L13.3335 5.16663" stroke={color} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>

  );
};

export const ExampleIcon = ({ color = 'white', size = 16, ...props }) => {
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
