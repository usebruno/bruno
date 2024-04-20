import React from 'react';
import StyledWrapper from './StyledWrapper';

const ResponseDockRight = ({}) => {
  const dockToRight = () => {
    alert('dock to right');
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={dockToRight} title="Dock to right">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 29 24"
          height="16"
          width="17"
          version="1.0"
        >
          <g
            transform="translate(4,22) scale(0.08,-0.085)"
            fill="currentColor"
            stroke="currentColor"
            stroke-linecap="round"
          >
            <path d="M10 120 l0 -110 135 0 135 0 0 110 0 110 -135 0 -135 0 0 -110z m180 0 l0 -90 -80 0 -80 0 0 90 0 90 80 0 80 0 0 -90z" />
          </g>
        </svg>
      </button>
    </StyledWrapper>
  );
};
export default ResponseDockRight;
