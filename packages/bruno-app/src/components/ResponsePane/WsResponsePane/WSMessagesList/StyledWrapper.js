import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0; 
  height: 100%;

  .empty-state {
    padding: 1rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .ws-message {
    background: ${(props) => props.theme.bg};

    &.new {
      background-color: ${({ theme }) => theme.table.striped};
    }

    &:not(:last-child) {
      border-bottom: 1px solid ${({ theme }) => theme.border.border1};
    }

    &:not(:last-child).open {
      border-bottom-width: 0px;
    }

    .message-content {
      color: ${(props) => props.theme.text};
    }

    .message-timestamp {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
    }

    .chevron-icon {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .ws-incoming .message-type-icon {
    color: ${(props) => props.theme.colors.text.green};
  }

  .ws-outgoing .message-type-icon {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .ws-info .message-type-icon {
    color: ${(props) => props.theme.colors.text.blue};
  }

  .ws-error .message-type-icon {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .CodeMirror {
    border-radius: 0.25rem;
  }

  .CodeMirror-foldgutter, .CodeMirror-linenumbers, .CodeMirror-lint-markers {
    background: ${({ theme }) => theme.bg};
  }

  div[role='tablist'] {
    color: ${(props) => props.theme.colors.text.muted};

    .active {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }
`;

export default StyledWrapper;
