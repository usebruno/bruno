import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${(props) => props.theme.console.contentBg};
  overflow: hidden;

  .debug-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: ${(props) => props.theme.console.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    flex-shrink: 0;
  }

  .debug-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${(props) => props.theme.console.titleColor};
    font-size: 13px;
    font-weight: 500;

    .error-count {
      color: ${(props) => props.theme.console.countColor};
      font-size: 12px;
      font-weight: 400;
    }
  }

  .debug-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .control-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .debug-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .debug-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${(props) => props.theme.console.emptyColor};
    text-align: center;
    gap: 8px;
    padding: 40px 20px;

    p {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }

    span {
      font-size: 12px;
      opacity: 0.7;
    }
  }

  .errors-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    min-height: 0;
  }

  .errors-header {
    display: grid;
    grid-template-columns: 1fr 200px 120px;
    gap: 12px;
    padding: 8px 16px;
    background: ${(props) => props.theme.console.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => props.theme.console.titleColor};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .errors-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }

  .error-row {
    display: grid;
    grid-template-columns: 1fr 200px 120px;
    gap: 12px;
    padding: 8px 16px;
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    cursor: pointer;
    transition: background-color 0.1s ease;
    font-size: 12px;
    align-items: center;

    &:hover {
      background: ${(props) => props.theme.console.logHoverBg};
    }

    &.selected {
      background: ${(props) => props.theme.console.buttonHoverBg};
      border-left: 3px solid ${(props) => props.theme.console.checkboxColor};
    }
  }

  .error-message {
    color: ${(props) => props.theme.console.messageColor};
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  .error-location {
    color: ${(props) => props.theme.console.messageColor};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 11px;
  }

  .error-time {
    color: ${(props) => props.theme.console.timestampColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 11px;
    text-align: right;
  }
`;

export default StyledWrapper; 