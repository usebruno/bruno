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

    .request-time {
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
    padding: 16px;
    min-height: 0;
    height: 0;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: min-content;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;

    h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: ${(props) => props.theme.console.titleColor};
      padding-bottom: 4px;
      border-bottom: 1px solid ${(props) => props.theme.console.border};
    }
  }

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .label {
      font-size: 11px;
      font-weight: 600;
      color: ${(props) => props.theme.console.countColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 12px;
      color: ${(props) => props.theme.console.messageColor};
      font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      word-break: break-all;
      padding: 4px 8px;
      background: ${(props) => props.theme.console.headerBg};
      border-radius: 4px;
      border: 1px solid ${(props) => props.theme.console.border};
    }
  }

  .headers-table,
  .timeline-table {
    overflow: auto;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.console.border};
    max-height: 300px;

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: ${(props) => props.theme.console.headerBg};

      thead {
        background: ${(props) => props.theme.console.dropdownHeaderBg};
        position: sticky;
        top: 0;
        z-index: 10;
        
        td {
          padding: 8px 12px;
          font-weight: 600;
          color: ${(props) => props.theme.console.titleColor};
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          border-bottom: 1px solid ${(props) => props.theme.console.border};
        }
      }

      tbody {
        tr {
          border-bottom: 1px solid ${(props) => props.theme.console.border};

          &:last-child {
            border-bottom: none;
          }

          &:nth-child(odd) {
            background: ${(props) => props.theme.console.contentBg};
          }

          &:hover {
            background: ${(props) => props.theme.console.logHoverBg};
          }
        }

        td {
          padding: 8px 12px;
          vertical-align: top;
          word-break: break-word;
        }
      }
    }
  }

  .header-name,
  .timeline-phase {
    color: ${(props) => props.theme.console.countColor};
    font-weight: 600;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    min-width: 120px;
  }

  .header-value,
  .timeline-message {
    color: ${(props) => props.theme.console.messageColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    word-break: break-all;
  }

  .timeline-duration {
    color: ${(props) => props.theme.console.timestampColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    text-align: right;
    min-width: 80px;
  }

  .code-block {
    background: ${(props) => props.theme.console.headerBg};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
    padding: 12px;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.4;
    color: ${(props) => props.theme.console.messageColor};
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 400px;
    margin: 0;
  }

  .empty-state {
    padding: 12px;
    text-align: center;
    color: ${(props) => props.theme.console.emptyColor};
    font-style: italic;
    font-size: 12px;
    background: ${(props) => props.theme.console.headerBg};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
  }

  .response-body-container {
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
    overflow: hidden;
    background: ${(props) => props.theme.console.headerBg};
    height: 400px;
    display: flex;
    flex-direction: column;

    .w-full.h-full.relative.flex {
      height: 100% !important;
      width: 100% !important;
      background: ${(props) => props.theme.console.headerBg} !important;
      display: flex !important;
      flex-direction: column !important;
    }

    div[role="tablist"] {
      background: ${(props) => props.theme.console.dropdownHeaderBg};
      padding: 8px 12px;
      border-bottom: 1px solid ${(props) => props.theme.console.border};
      display: flex !important;
      gap: 8px !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      min-height: 40px !important;
      flex-shrink: 0 !important;
      
      > div {
        color: ${(props) => props.theme.console.buttonColor};
        font-size: 12px !important;
        padding: 6px 12px !important;
        border-radius: 4px;
        transition: all 0.2s ease;
        cursor: pointer;
        border: 1px solid ${(props) => props.theme.console.border};
        background: ${(props) => props.theme.console.contentBg};
        white-space: nowrap !important;
        min-width: auto !important;
        height: auto !important;
        line-height: 1.2 !important;
        font-weight: 500 !important;

        &:hover {
          background: ${(props) => props.theme.console.buttonHoverBg};
          color: ${(props) => props.theme.console.buttonHoverColor};
          border-color: ${(props) => props.theme.console.buttonHoverBg};
        }

        &.active {
          background: ${(props) => props.theme.console.checkboxColor};
          color: white;
          border-color: ${(props) => props.theme.console.checkboxColor};
        }
      }
    }
    .response-filter {
      position: absolute !important;
      bottom: 8px !important;
      right: 8px !important;
      left: 8px !important;
      z-index: 10 !important;
    }
  }

  .network-logs-container {
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
    overflow: hidden;
    background: ${(props) => props.theme.console.headerBg};
    min-height: 200px;
    max-height: 400px;

    .network-logs {
      background: ${(props) => props.theme.console.contentBg} !important;
      color: ${(props) => props.theme.console.messageColor} !important;
      height: 100% !important;
      max-height: 400px !important;
      
      pre {
        color: ${(props) => props.theme.console.messageColor} !important;
        font-size: 11px !important;
        line-height: 1.4 !important;
        padding: 12px !important;
      }
    }
  }
`;

export default StyledWrapper; 