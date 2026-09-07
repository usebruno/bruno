import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 2.1rem;
  position: relative;

  .input-container {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    border: ${(props) => props.theme.requestTabPanel.url.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    position: relative;

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

    &.disconnecting {
      animation: blink 0.8s ease-in-out infinite;
      background-color: ${(props) => props.theme.colors.text.yellow};
    }
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

  @keyframes blink {
    0% {
      opacity: 0.2;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.2;
    }
  }

  .animate-blink {
    animation: blink 0.8s ease-in-out infinite;
  }

`;

export default StyledWrapper;
