import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  color: ${(props) => props.theme.text};

  .xterm-rows {
    color: ${(props) => props.theme.text} !important;
  }

  .terminal-content {
    height: 100%;
    width: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .terminal-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #888;
    font-size: 14px;
    z-index: 10;

    svg {
      opacity: 0.7;
    }

    span {
      font-weight: 500;
    }
  }

  .terminal-container {
    flex: 1;
    position: relative;
    
    .xterm {
      height: 100% !important;
      width: 100% !important;
      padding: 8px;
    }

    .xterm-viewport {
      background: transparent !important;
    }

    .xterm-screen {
      background: transparent !important;
    }

    .xterm-decoration-overview-ruler {
      display: none;
    }

    /* Custom scrollbar for terminal */
    .xterm-viewport::-webkit-scrollbar {
      width: 8px;
    }

    .xterm-viewport::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    .xterm-viewport::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .xterm-viewport::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  /* Dark theme adjustments */
  .xterm-helper-textarea {
    position: absolute !important;
    left: -9999px !important;
    top: -9999px !important;
  }

  /* Selection styling */
  .xterm .xterm-selection div {
    background-color: rgba(255, 255, 255, 0.3) !important;
  }

  /* Cursor styling */
  .xterm .xterm-cursor-layer .xterm-cursor {
    background-color: #d4d4d4 !important;
  }

  /* Link styling */
  .xterm .xterm-decoration-link {
    text-decoration: underline;
    color: #3b8eea;
  }

  .xterm .xterm-decoration-link:hover {
    color: #5ba7f7;
  }
`;

export default StyledWrapper;
