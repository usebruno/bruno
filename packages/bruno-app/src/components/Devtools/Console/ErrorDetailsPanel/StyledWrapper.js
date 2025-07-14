import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${(props) => props.theme.console.contentBg};
  border-left: 1px solid ${(props) => props.theme.console.border};
  min-width: 400px;
  max-width: 600px;
  width: 40%;
  overflow: hidden;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: ${(props) => props.theme.console.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    flex-shrink: 0;
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${(props) => props.theme.console.titleColor};
    font-size: 13px;
    font-weight: 500;

    .error-time {
      color: ${(props) => props.theme.console.countColor};
      font-size: 11px;
      font-weight: 400;
    }
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.console.buttonHoverBg};
      color: ${(props) => props.theme.console.buttonHoverColor};
    }
  }

  .panel-tabs {
    display: flex;
    background: ${(props) => props.theme.console.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    flex-shrink: 0;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    font-weight: 500;

    &:hover {
      background: ${(props) => props.theme.console.buttonHoverBg};
      color: ${(props) => props.theme.console.buttonHoverColor};
    }

    &.active {
      color: ${(props) => props.theme.console.checkboxColor};
      border-bottom-color: ${(props) => props.theme.console.checkboxColor};
      background: ${(props) => props.theme.console.contentBg};
    }
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background: ${(props) => props.theme.console.contentBg};
    min-height: 0;
  }

  .tab-content {
    padding: 16px;
    height: 100%;
    overflow-y: auto;
  }

  .section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 600;
      color: ${(props) => props.theme.console.titleColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
      font-size: 11px;
      font-weight: 600;
      color: ${(props) => props.theme.console.titleColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    span {
      font-size: 12px;
      color: ${(props) => props.theme.console.messageColor};
      font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      word-break: break-all;
      line-height: 1.4;
    }
  }

  .error-message-full {
    color: ${(props) => props.theme.console.messageColor} !important;
    background: ${(props) => props.theme.console.headerBg};
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.console.border};
  }

  .file-path {
    color: ${(props) => props.theme.console.checkboxColor} !important;
    font-weight: 500 !important;
  }

  .report-section {
    display: flex;
    flex-direction: column;
    gap: 12px;

    p {
      margin: 0;
      font-size: 12px;
      color: ${(props) => props.theme.console.messageColor};
      line-height: 1.4;
    }
  }

  .report-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: ${(props) => props.theme.console.buttonHoverBg};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 6px;
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    align-self: flex-start;

    &:hover {
      background: ${(props) => props.theme.console.checkboxColor};
      color: white;
      border-color: ${(props) => props.theme.console.checkboxColor};
    }

    span {
      font-family: inherit;
    }
  }

  .stack-trace-container,
  .arguments-container {
    background: ${(props) => props.theme.console.headerBg};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 6px;
    overflow: hidden;
  }

  .stack-trace,
  .arguments {
    margin: 0;
    padding: 16px;
    font-size: 11px;
    line-height: 1.5;
    color: ${(props) => props.theme.console.messageColor};
    background: transparent;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
  }
`;

export default StyledWrapper; 