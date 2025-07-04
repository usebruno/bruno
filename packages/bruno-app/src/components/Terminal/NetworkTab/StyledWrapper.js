import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${(props) => props.theme.terminal.contentBg};
  overflow: hidden;

  .network-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: ${(props) => props.theme.terminal.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.terminal.border};
    flex-shrink: 0;
  }

  .network-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${(props) => props.theme.terminal.titleColor};
    font-size: 13px;
    font-weight: 500;

    .request-count {
      color: ${(props) => props.theme.terminal.countColor};
      font-size: 12px;
      font-weight: 400;
    }
  }

  .network-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .network-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Important for proper flex behavior */
  }

  .network-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${(props) => props.theme.terminal.emptyColor};
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

  .requests-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    min-height: 0; /* Important for proper flex behavior */
  }

  .requests-header {
    display: grid;
    grid-template-columns: 80px 80px 150px 1fr 100px 80px 80px;
    gap: 12px;
    padding: 8px 16px;
    background: ${(props) => props.theme.terminal.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.terminal.border};
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => props.theme.terminal.titleColor};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .requests-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0; /* Important for proper scrolling */
  }

  .request-row {
    display: grid;
    grid-template-columns: 80px 80px 150px 1fr 100px 80px 80px;
    gap: 12px;
    padding: 6px 16px;
    border-bottom: 1px solid ${(props) => props.theme.terminal.border};
    cursor: pointer;
    transition: background-color 0.1s ease;
    font-size: 12px;
    align-items: center;

    &:hover {
      background: ${(props) => props.theme.terminal.logHoverBg};
    }

    &.selected {
      background: ${(props) => props.theme.terminal.buttonHoverBg};
      border-left: 3px solid ${(props) => props.theme.terminal.checkboxColor};
    }
  }

  .method-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 45px;
  }

  .status-badge {
    font-weight: 600;
    font-size: 12px;
  }

  .request-domain {
    color: ${(props) => props.theme.terminal.messageColor};
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .request-path {
    color: ${(props) => props.theme.terminal.messageColor};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  .request-time {
    color: ${(props) => props.theme.terminal.timestampColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 11px;
  }

  .request-duration {
    color: ${(props) => props.theme.terminal.messageColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 11px;
    text-align: right;
  }

  .request-size {
    color: ${(props) => props.theme.terminal.messageColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 11px;
    text-align: right;
  }

  .filter-dropdown {
    position: relative;
  }

  .filter-dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: transparent;
    border: 1px solid ${(props) => props.theme.terminal.border};
    border-radius: 4px;
    color: ${(props) => props.theme.terminal.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;

    &:hover {
      background: ${(props) => props.theme.terminal.buttonHoverBg};
      color: ${(props) => props.theme.terminal.buttonHoverColor};
    }

    .filter-summary {
      font-weight: 500;
      min-width: 24px;
      text-align: center;
    }
  }

  .filter-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 200px;
    max-width: 250px;
    background: ${(props) => props.theme.terminal.dropdownBg};
    border: 1px solid ${(props) => props.theme.terminal.border};
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    overflow: hidden;
  }

  .filter-dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: ${(props) => props.theme.terminal.dropdownHeaderBg};
    border-bottom: 1px solid ${(props) => props.theme.terminal.border};
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.terminal.titleColor};
  }

  .filter-toggle-all {
    background: transparent;
    border: none;
    color: ${(props) => props.theme.terminal.buttonColor};
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 4px;
    border-radius: 2px;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.terminal.buttonHoverBg};
    }
  }

  .filter-dropdown-options {
    padding: 4px 0;
  }

  .filter-option {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.terminal.optionHoverBg};
    }

    input[type="checkbox"] {
      margin: 0 8px 0 0;
      width: 14px;
      height: 14px;
      accent-color: ${(props) => props.theme.terminal.checkboxColor};
    }
  }

  .filter-option-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .filter-option-label {
    color: ${(props) => props.theme.terminal.optionLabelColor};
    font-size: 12px;
    font-weight: 400;
  }

  .filter-option-count {
    color: ${(props) => props.theme.terminal.optionCountColor};
    font-size: 11px;
    font-weight: 400;
    margin-left: auto;
  }
`;

export default StyledWrapper; 