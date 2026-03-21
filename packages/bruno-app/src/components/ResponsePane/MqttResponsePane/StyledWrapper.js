import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  border-radius: 4px;

  .ws-message {
    border-bottom: 1px solid ${(props) => props.theme.border.border0};

    &.ws-incoming .message-type-icon {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.ws-outgoing .message-type-icon {
      color: ${(props) => props.theme.textLink};
    }

    &.ws-info .message-type-icon {
      color: ${(props) => props.theme.colors.text.subtext0};
    }

    &.ws-error .message-type-icon {
      color: ${(props) => props.theme.colors.text.danger};
    }

    .message-content {
      color: ${(props) => props.theme.text};
    }

    .message-timestamp {
      font-size: 10px;
      font-family: monospace;
      color: ${(props) => props.theme.colors.text.muted};
    }

    .chevron-icon {
      color: ${(props) => props.theme.colors.text.subtext0};
    }

    &.new {
      animation: flash 0.5s ease-out;
    }
  }

  .topic-badge {
    background-color: ${(props) => props.theme.workspace.button.bg};
    color: ${(props) => props.theme.text};
  }

  .status-connected {
    color: ${(props) => props.theme.colors.text.green};
  }

  .status-error {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .status-connecting {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .muted-text {
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  @keyframes flash {
    0% {
      background-color: ${(props) => props.theme.workspace.button.bg};
    }
    100% {
      background-color: transparent;
    }
  }
`;

export default StyledWrapper;
