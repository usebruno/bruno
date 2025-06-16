import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: fixed;
  bottom: 22px; /* Account for status bar height */
  left: 0;
  right: 0;
  width: 100%;
  background: ${(props) => props.theme.terminal.bg};
  border-top: 1px solid ${(props) => props.theme.terminal.border};
  display: flex;
  flex-direction: column;
  animation: slideUp 0.2s ease-out;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
  transform: translateY(0);

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .terminal-resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    cursor: row-resize;
    background: transparent;
    transition: background-color 0.2s ease;
    z-index: 1;
    
    &:hover {
      background: ${(props) => props.theme.terminal.resizeHandleHover};
    }
    
    &:active {
      background: ${(props) => props.theme.terminal.resizeHandleActive};
    }
  }

  .terminal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: ${(props) => props.theme.terminal.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.terminal.border};
    flex-shrink: 0;
    position: relative;
  }

  .terminal-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .terminal-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: ${(props) => props.theme.terminal.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px 4px 0 0;

    &:hover {
      background: ${(props) => props.theme.terminal.buttonHoverBg};
      color: ${(props) => props.theme.terminal.buttonHoverColor};
    }

    &.active {
      color: ${(props) => props.theme.terminal.checkboxColor};
      border-bottom-color: ${(props) => props.theme.terminal.checkboxColor};
      background: ${(props) => props.theme.terminal.contentBg};
    }
  }

  .terminal-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .terminal-content {
    flex: 1;
    overflow: hidden;
    background: ${(props) => props.theme.terminal.contentBg};
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .tab-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: ${(props) => props.theme.terminal.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.terminal.border};
    flex-shrink: 0;
  }

  .tab-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${(props) => props.theme.terminal.titleColor};
    font-size: 13px;
    font-weight: 500;

    .log-count {
      color: ${(props) => props.theme.terminal.countColor};
      font-size: 12px;
      font-weight: 400;
    }
  }

  .tab-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tab-content-area {
    flex: 1;
    overflow-y: auto;
    background: ${(props) => props.theme.terminal.contentBg};
    min-height: 0;
  }

  .network-with-details {
    display: flex;
    height: 100%;
    overflow: hidden;
  }

  .network-main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .debug-with-details {
    display: flex;
    height: 100%;
    overflow: hidden;
  }

  .debug-main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-right: 8px;
    padding-right: 8px;
    border-right: 1px solid ${(props) => props.theme.terminal.border};
  }

  .action-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .control-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: ${(props) => props.theme.terminal.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.terminal.buttonHoverBg};
      color: ${(props) => props.theme.terminal.buttonHoverColor};
    }

    &.close-button:hover {
      background: #e81123;
      color: white;
    }
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
      border-color: ${(props) => props.theme.terminal.border};
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
    left: 0;
    min-width: 200px;
    max-width: 250px;
    background: ${(props) => props.theme.terminal.dropdownBg};
    border: 1px solid ${(props) => props.theme.terminal.border};
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    overflow: hidden;
    
    &.right {
      left: auto;
      right: 0;
    }
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

  .terminal-empty {
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

  .logs-container {
    padding: 8px 0;
  }

  .log-entry {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 4px 16px;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
    border-left: 2px solid transparent;
    transition: background-color 0.1s ease;

    &:hover {
      background: ${(props) => props.theme.terminal.logHoverBg};
    }

    &.error {
      border-left-color: #f14c4c;
      
      .log-level {
        background: #f14c4c;
        color: white;
      }
      
      .log-icon {
        color: #f14c4c;
      }
    }

    &.warn {
      border-left-color: #ffcc02;
      
      .log-level {
        background: #ffcc02;
        color: #000;
      }
      
      .log-icon {
        color: #ffcc02;
      }
    }

    &.info {
      border-left-color: #0078d4;
      
      .log-level {
        background: #0078d4;
        color: white;
      }
      
      .log-icon {
        color: #0078d4;
      }
    }

    &.debug {
      border-left-color: #9b59b6;
      
      .log-level {
        background: #9b59b6;
        color: white;
      }
      
      .log-icon {
        color: #9b59b6;
      }
    }

    &.log {
      border-left-color: #6a6a6a;
      
      .log-level {
        background: #6a6a6a;
        color: white;
      }
      
      .log-icon {
        color: #6a6a6a;
      }
    }
  }

  .log-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    min-width: 120px;
  }

  .log-timestamp {
    color: ${(props) => props.theme.terminal.timestampColor};
    font-size: 11px;
    font-weight: 400;
  }

  .log-level {
    font-size: 9px;
    font-weight: 600;
    padding: 2px 4px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .log-icon {
    flex-shrink: 0;
  }

  .log-message {
    color: ${(props) => props.theme.terminal.messageColor};
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
  }
`;

export default StyledWrapper; 