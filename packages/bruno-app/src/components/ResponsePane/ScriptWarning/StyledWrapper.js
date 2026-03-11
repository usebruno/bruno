import styled from 'styled-components';

const StyledWrapper = styled.div`
  .script-warning-card {
    background-color: ${(props) => props.theme.background.base};
    border: solid 1px ${(props) => props.theme.border.border2};
    border-left: 4px solid ${(props) => props.theme.colors.text.warning};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .script-warning-header {
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

  .warning-title {
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.warning};
  }

  .script-warning-source-label {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) => props.theme.colors.text.muted};
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .script-warning-file-path {
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

  .script-warning-summary {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    line-height: 1.25rem;
    white-space: pre-wrap;
    word-break: break-all;
    color: ${(props) => props.theme.colors.text.warning};
  }
`;

export default StyledWrapper;
