import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 2.3rem;
  position: relative;

  .input-container {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;

    input {
      background-color: ${(props) => props.theme.requestTabPanel.url.bg};
      outline: none;
      box-shadow: none;

      &:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    }
  }

  .method-ws {
    color: ${(props) => props.theme.request.ws};
  }

  .connection-status-strip {
    animation: pulse 1.5s ease-in-out infinite;
    background-color: ${(props) => props.theme.colors.text.green};
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
  }

  @keyframes pulse {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.4;
    }
  }

  .infotip {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }

  .infotip:hover .infotip-text {
    visibility: visible;
    opacity: 1;
  }

  .infotip-text {
    visibility: hidden;
    width: auto;
    background-color: ${(props) => props.theme.requestTabs.active.bg};
    color: ${(props) => props.theme.text};
    text-align: center;
    border-radius: 4px;
    padding: 4px 8px;
    position: absolute;
    z-index: 1;
    bottom: 34px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.3s;
    white-space: nowrap;
  }

  .infotip-text::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -4px;
    border-width: 4px;
    border-style: solid;
    border-color: ${(props) => props.theme.requestTabs.active.bg} transparent transparent transparent;
  }

  .shortcut {
    font-size: 0.625rem;
  }

  .connection-controls {
    .infotip {
      &:hover {
        background-color: ${(props) => props.theme.requestTabPanel.url.errorHoverBg};
      }
    }
  }
`;

export default StyledWrapper;
