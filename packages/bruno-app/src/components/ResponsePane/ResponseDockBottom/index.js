import React from 'react';
import StyledWrapper from './StyledWrapper';

const ResponseDockBottom = ({}) => {
  const dockToBottom = () => {
    alert('dock to bottom');
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={dockToBottom} title="Dock to bottom">
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
            <path d="M10 120 l0 -110 135 0 135 0 0 110 0 110 -135 0 -135 0 0 -110z m250 30 l0 -60 -115 0 -115 0 0 60 0 60 115 0 115 0 0 -60z" />
          </g>
        </svg>
      </button>
    </StyledWrapper>
  );
};
export default ResponseDockBottom;
