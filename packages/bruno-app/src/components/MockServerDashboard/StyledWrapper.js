import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Server control bar */
  .server-bar {
    padding: 12px 0;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    flex-shrink: 0;
    border-bottom: 1px solid ${(props) => props.theme.table.border};
    margin-bottom: 4px;

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #6b7280;
        flex-shrink: 0;

        &.running {
          background: #22c55e;
        }

        &.starting {
          background: #f59e0b;
          animation: pulse 1s infinite;
        }

        &.stopping {
          background: #f59e0b;
          animation: pulse 1s infinite;
        }

        &.error {
          background: #ef4444;
        }
      }

      .status-text {
        font-size: 13px;
        font-weight: 500;
      }
    }

    .copy-url-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      font-size: 12px;
      font-family: monospace;
      border: 1px solid ${(props) => props.theme.table.border};
      border-radius: ${(props) => props.theme.border.radius.sm};
      background: transparent;
      color: inherit;
      cursor: pointer;
      transition: border-color 0.15s;

      &:hover {
        border-color: var(--color-tab-active-border);
      }

      .url-text {
        opacity: 0.7;
      }
    }

    .server-controls {
      display: flex;
      align-items: center;
      gap: 10px;

      .control-group {
        display: flex;
        align-items: center;
        gap: 4px;

        label {
          font-size: 12px;
          opacity: 0.6;
        }

        input {
          width: 70px;
          padding: 3px 6px;
          font-size: 12px;
          border: 1px solid ${(props) => props.theme.table.border};
          border-radius: ${(props) => props.theme.border.radius.sm};
          background: transparent;
          color: inherit;

          &:focus {
            outline: none;
            border-color: var(--color-tab-active-border);
          }

          &:disabled {
            opacity: 0.5;
          }
        }
      }
    }

    .action-btn {
      padding: 4px 12px;
      font-size: 12px;
      border-radius: ${(props) => props.theme.border.radius.sm};
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;

      &.start-btn {
        background: #1b8e45;
        color: white;
        &:hover { background: #16a34a; }
      }

      &.stop-btn {
        background: #ef4444;
        color: white;
        &:hover { background: #dc2626; }
      }

      &.refresh-btn {
        background: transparent;
        border-color: ${(props) => props.theme.table.border};
        color: inherit;
        display: flex;
        align-items: center;
        padding: 4px 8px;
        &:hover { border-color: var(--color-tab-active-border); }
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .server-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: auto;
      font-size: 12px;
      color: ${(props) => props.theme.colors.text.muted};
    }

    .error-message {
      width: 100%;
      font-size: 12px;
      color: ${(props) => props.theme.colors.text.danger};
      padding: 4px 0;
    }
  }

  /* Tabs - matching CollectionSettings pattern */
  div.tabs {
    div.tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      color: ${(props) => props.theme.colors.text.subtext0};
      cursor: pointer;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:hover {
        color: ${(props) => props.theme.tabs.active.color} !important;
      }

      &.active {
        font-weight: ${(props) => props.theme.tabs.active.fontWeight} !important;
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;

export default StyledWrapper;
