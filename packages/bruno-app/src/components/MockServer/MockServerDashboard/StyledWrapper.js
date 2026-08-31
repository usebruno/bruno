import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Server control bar */
  .server-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
    flex-shrink: 0;
    border-bottom: 1px solid ${(props) => props.theme.table.border};
    margin-bottom: 4px;

    .server-bar-main {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${(props) => props.theme.colors.text.muted};
        flex-shrink: 0;

        &.running {
          background: ${(props) => props.theme.status.success.text};
        }

        &.starting {
          background: ${(props) => props.theme.status.warning.text};
          animation: pulse 1s infinite;
        }

        &.stopping {
          background: ${(props) => props.theme.status.warning.text};
          animation: pulse 1s infinite;
        }

        &.error {
          background: ${(props) => props.theme.status.danger.text};
        }
      }

      .status-text {
        font-size: ${(props) => props.theme.font.size.base};
        font-weight: 500;
      }
    }

    .copy-url-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      font-size: ${(props) => props.theme.font.size.sm};
      font-family: monospace;
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: ${(props) => props.theme.border.radius.sm};
      background: transparent;
      color: inherit;
      cursor: pointer;
      transition: border-color 0.15s;

      &:hover {
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      .url-text {
        opacity: 0.7;
      }
    }

    .server-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;

      .control-group {
        display: flex;
        align-items: center;
        gap: 6px;

        label {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.muted};
        }

        input {
          width: calc(8ch + 32px);
          padding: 6px 8px;
          font-size: ${(props) => props.theme.font.size.sm};
          line-height: 1.2;
          border: 1px solid ${(props) => props.theme.input.border};
          border-radius: ${(props) => props.theme.border.radius.sm};
          background: ${(props) => props.theme.input.bg};
          color: inherit;

          &:focus {
            outline: none;
            border-color: ${(props) => props.theme.input.focusBorder};
          }

          &:disabled {
            opacity: 0.5;
          }
        }
      }
    }

    .server-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
    }

    .server-notice {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.status.warning.text};
    }

    .server-error {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.danger};
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

  .mock-server-name-input {
    display: block;
    width: 100%;
    max-width: 420px;
    margin-left: -7px;
    padding: 2px 6px;
    font-size: ${(props) => props.theme.font.size.lg};
    font-weight: 500;
    line-height: 1.4;
    border: 1px solid transparent;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: inherit;

    &:hover {
      border-color: ${(props) => props.theme.input.border};
    }

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .source-label {
    margin-top: 2px;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
