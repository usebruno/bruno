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

  .method-graphql-subscription {
    color: ${(props) => props.theme.request.gql};
  }

  .action-button {
    background: none;
    border: none;
    padding: 0;
  }

  .save-icon {
    cursor: default;

    &.has-changes {
      cursor: pointer;
    }
  }

  .subscribe-icon,
  .unsubscribe-icon {
    cursor: pointer;
  }

  .subscribe-icon.connecting {
    animation: iconPulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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

  @keyframes iconPulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

`;

export default StyledWrapper;
