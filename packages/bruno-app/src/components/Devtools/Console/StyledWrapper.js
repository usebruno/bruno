import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: 100%;
  background: ${(props) => props.theme.console.bg};
  border-top: 1px solid ${(props) => props.theme.console.border};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .console-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: ${(props) => props.theme.console.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    flex-shrink: 0;
    position: relative;
  }

  .console-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .console-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px 4px 0 0;

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

  .console-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .console-content {
    flex: 1;
    overflow: hidden;
    background: ${(props) => props.theme.console.contentBg};
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
    background: ${(props) => props.theme.console.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    flex-shrink: 0;
  }

  .tab-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${(props) => props.theme.console.titleColor};
    font-size: 13px;
    font-weight: 500;

    .log-count {
      color: ${(props) => props.theme.console.countColor};
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
    background: ${(props) => props.theme.console.contentBg};
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
    border-right: 1px solid ${(props) => props.theme.console.border};
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
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.console.buttonHoverBg};
      color: ${(props) => props.theme.console.buttonHoverColor};
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
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;

    &:hover {
      background: ${(props) => props.theme.console.buttonHoverBg};
      color: ${(props) => props.theme.console.buttonHoverColor};
      border-color: ${(props) => props.theme.console.border};
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
    background: ${(props) => props.theme.console.dropdownBg};
    border: 1px solid ${(props) => props.theme.console.border};
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
    background: ${(props) => props.theme.console.dropdownHeaderBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.console.titleColor};
  }

  .filter-toggle-all {
    background: transparent;
    border: none;
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 4px;
    border-radius: 2px;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.console.buttonHoverBg};
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
      background: ${(props) => props.theme.console.optionHoverBg};
    }

    input[type="checkbox"] {
      margin: 0 8px 0 0;
      width: 14px;
      height: 14px;
      accent-color: ${(props) => props.theme.console.checkboxColor};
    }
  }

  .filter-option-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .filter-option-label {
    color: ${(props) => props.theme.console.optionLabelColor};
    font-size: 12px;
    font-weight: 400;
  }

  .filter-option-count {
    color: ${(props) => props.theme.console.optionCountColor};
    font-size: 11px;
    font-weight: 400;
    margin-left: auto;
  }

  .console-empty {
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

  .logs-container {
    padding: 8px 0;
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
      background: ${(props) => props.theme.console.logHoverBg};
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
    color: ${(props) => props.theme.console.timestampColor};
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
    color: ${(props) => props.theme.console.messageColor};
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
    
    .log-object {
      margin: 4px 0;
      padding: 8px;
      background: ${(props) => props.theme.console.headerBg};
      border-radius: 4px;
      border: 1px solid ${(props) => props.theme.console.border};
      
      .react-json-view {
        background: transparent !important;
        
        .object-key-val {
          font-size: 12px !important;
        }
        
        .object-key {
          color: ${(props) => props.theme.console.messageColor} !important;
          font-weight: 500 !important;
        }
        
        .object-value {
          color: ${(props) => props.theme.console.messageColor} !important;
        }
        
        .string-value {
          color: ${(props) => props.theme.colors?.text?.green || (props.theme.console.messageColor)} !important;
        }
        
        .number-value {
          color: ${(props) => props.theme.colors?.text?.purple || (props.theme.console.messageColor)} !important;
        }
        
        .boolean-value {
          color: ${(props) => props.theme.colors?.text?.yellow || (props.theme.console.messageColor)} !important;
        }
        
        .null-value {
          color: ${(props) => props.theme.colors?.text?.danger || (props.theme.console.messageColor)} !important;
        }
        
        .object-size {
          color: ${(props) => props.theme.console.timestampColor} !important;
        }
        
        .brace, .bracket {
          color: ${(props) => props.theme.console.messageColor} !important;
        }
        
        .collapsed-icon, .expanded-icon {
          color: ${(props) => props.theme.console.checkboxColor} !important;
        }
        
        .icon-container {
          color: ${(props) => props.theme.console.checkboxColor} !important;
        }
        
        .click-to-expand, .click-to-collapse {
          color: ${(props) => props.theme.console.checkboxColor} !important;
        }
      }
    }
  }
`;

export default StyledWrapper; 