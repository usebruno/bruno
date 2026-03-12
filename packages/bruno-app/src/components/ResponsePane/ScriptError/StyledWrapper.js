import styled from 'styled-components';

const StyledWrapper = styled.div`
  .script-error-card {
    background-color: ${(props) => props.theme.background.base};
    border: solid 1px ${(props) => props.theme.border.border2};
    border-left: 4px solid ${(props) => props.theme.colors.text.danger};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: visible;
  }

  .script-error-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .close-button {
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }

    svg {
      color: ${(props) => props.theme.text};
    }
  }

  .error-title {
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .script-error-source-label {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .script-error-file-path {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.15s, text-decoration 0.15s;

    &:hover {
      opacity: 1;
      text-decoration: underline;
    }
  }

  .script-error-message {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.25rem;
    white-space: pre-wrap;
    word-break: break-all;
    color: ${(props) => props.theme.colors.text.danger};
    font-weight: 500;
  }

  .script-error-stack-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .script-error-stack {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.muted};
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    padding: 0.25rem 0;
  }
`;

export default StyledWrapper;
