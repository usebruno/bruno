import styled from 'styled-components';

const StyledWrapper = styled.div`
  .import-error-content {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .error-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    padding-left: 0;
    border-radius: 6px;
    background-color: ${(props) => props.theme.colors.danger}11;
    border: 1px solid ${(props) => props.theme.colors.danger}33;

    .error-icon {
      color: ${(props) => props.theme.colors.danger};
      flex-shrink: 0;
      margin-top: 2px;
    }

    .error-message {
      color: ${(props) => props.theme.text};
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      word-break: break-word;
    }
  }

  .error-raw {
    pre {
      margin: 0;
      padding: 10px 12px;
      border-radius: 6px;
      background-color: ${(props) => props.theme.input.bg};
      border: 1px solid ${(props) => props.theme.input.border};
      font-size: 12px;
      line-height: 1.5;
      color: ${(props) => props.theme.text};
      opacity: 0.8;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 140px;
      overflow-y: auto;
      font-family: monospace;
    }
  }

  .error-hint {
    font-size: 12px;
    color: ${(props) => props.theme.text};
    opacity: 0.5;
    line-height: 1.4;
  }

  .error-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;

    .action-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      background-color: ${(props) => props.theme.input.bg};
      border: 1px solid ${(props) => props.theme.input.border};
      color: ${(props) => props.theme.text};
      transition: background-color 0.15s ease;

      &:hover {
        background-color: ${(props) => props.theme.input.border};
      }
    }
  }
`;

export default StyledWrapper;
