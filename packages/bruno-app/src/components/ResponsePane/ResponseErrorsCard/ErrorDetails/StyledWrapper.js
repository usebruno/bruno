import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.125rem 0.75rem 0.75rem;

  .error-source {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.5rem;
    white-space: nowrap;
  }

  .error-source-label {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error-file-path {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.navigable {
      &:hover {
        color: ${(props) => props.theme.text};
        text-decoration: underline;
      }
    }
  }

  .error-message {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    white-space: pre-wrap;
    word-break: break-word;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .error-stack-trace-toggle {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;

    &:hover {
      color: ${(props) => props.theme.text};
    }

    &:focus-visible {
      outline: 1px solid ${(props) => props.theme.input.focusBorder};
      outline-offset: 2px;
    }
  }

  .error-stack-trace {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-all;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
