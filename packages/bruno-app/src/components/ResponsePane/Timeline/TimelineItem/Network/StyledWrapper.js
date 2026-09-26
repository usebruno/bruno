import styled from 'styled-components';

const StyledWrapper = styled.div`
  .network-logs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    background: transparent;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    font-size: 12px;

    &:hover:not(:disabled) {
      color: ${(props) => props.theme.text};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  .network-logs-container {
    color: ${(props) => props.theme.text};
  }

  .network-logs-pre {
    margin: 0;
    padding: 0;
    background: none;
    border: none;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.6;
    font-family: var(--font-family-mono);
  }

  .network-logs-entry {
    color: ${(props) => props.theme.colors.text.muted};

    &--request {
      color: ${(props) => props.theme.textLink};
    }

    &--response {
      color: ${(props) => props.theme.colors.text.green};
    }

    &--error {
      color: ${(props) => props.theme.colors.text.danger};
    }

    &--tls {
      color: ${(props) => props.theme.colors.text.purple};
    }

    &--info {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .network-logs-separator {
    border-top: 1px solid ${(props) => props.theme.border.border1};
    width: 100%;
    margin: 0.5rem 0;
  }

  .network-logs-spacing {
    margin-top: 0.5rem;
  }
`;

export default StyledWrapper;
