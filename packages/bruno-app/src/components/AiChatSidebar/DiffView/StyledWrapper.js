import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin-top: 8px;
  border-radius: ${(props) => props.theme.border.radius.base};
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.border.border1};
  background: ${(props) => props.theme.codemirror.bg};

  &.accepted {
    border-color: ${(props) => props.theme.colors.text.green};
  }

  &.rejected {
    opacity: 0.5;
  }

  .diff-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: ${(props) => props.theme.background.mantle};
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    gap: 8px;
    flex-wrap: nowrap;
  }

  .diff-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    flex-shrink: 0;

    .diff-icon {
      color: ${(props) => props.theme.brand};
      display: flex;
      align-items: center;
    }
  }

  .diff-content-type {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 1px 6px;
    border-radius: 3px;
    background: ${(props) => props.theme.background.surface0};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .diff-stats {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;

    .stat {
      padding: 1px 5px;
      border-radius: 4px;
    }
    .additions {
      background: ${(props) => props.theme.status.success.background};
      color: ${(props) => props.theme.colors.text.green};
    }
    .deletions {
      background: ${(props) => props.theme.status.danger.background};
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .diff-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .diff-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 500;
    border: 1px solid transparent;
    border-radius: ${(props) => props.theme.border.radius.base};
    cursor: pointer;
    white-space: nowrap;

    &.accept {
      background: ${(props) => props.theme.brand};
      color: ${(props) => (props.theme.mode === 'dark' ? '#000' : '#fff')};

      &:hover:not(:disabled) {
        opacity: 0.9;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    &.reject {
      background: transparent;
      color: ${(props) => props.theme.colors.text.muted};
      border-color: ${(props) => props.theme.border.border1};

      &:hover {
        background: ${(props) => props.theme.status.danger.background};
        color: ${(props) => props.theme.colors.text.danger};
        border-color: ${(props) => props.theme.status.danger.background};
      }
    }
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    font-size: 11px;
    border-radius: ${(props) => props.theme.border.radius.base};
    font-weight: 500;

    &.accepted {
      background: ${(props) => props.theme.status.success.background};
      color: ${(props) => props.theme.colors.text.green};
    }

    &.rejected {
      background: ${(props) => props.theme.status.danger.background};
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .diff-warning {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font-size: 11px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};

    &.warn {
      background: ${(props) => props.theme.status.warning.background};
      color: ${(props) => props.theme.status.warning.text};
    }

    &.error {
      background: ${(props) => props.theme.status.danger.background};
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .diff-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    border-top: 1px solid ${(props) => props.theme.border.border1};
    cursor: pointer;
    width: 100%;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
      color: ${(props) => props.theme.text};
    }
  }

  .diff-content {
    max-height: 300px;
    overflow: auto;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.5;

    &::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.border.border1};
      border-radius: 2px;
    }
  }

  .diff-line {
    padding: 0 8px 0 4px;
    white-space: pre;
    display: flex;
    min-height: 18px;
    line-height: 18px;

    .line-number {
      width: 24px;
      text-align: right;
      padding-right: 8px;
      color: ${(props) => props.theme.colors.text.muted};
      user-select: none;
      flex-shrink: 0;
      opacity: 0.5;
    }

    .line-prefix {
      width: 12px;
      flex-shrink: 0;
    }

    .line-content {
      flex: 1;
      overflow-x: auto;
    }

    &.added {
      background: ${(props) => props.theme.status.success.background};
      .line-content { color: ${(props) => props.theme.colors.text.green}; }
      .line-prefix { color: ${(props) => props.theme.colors.text.green}; font-weight: 600; }
    }

    &.removed {
      background: ${(props) => props.theme.status.danger.background};
      .line-content { color: ${(props) => props.theme.colors.text.danger}; }
      .line-prefix { color: ${(props) => props.theme.colors.text.danger}; font-weight: 600; }
    }

    &.unchanged {
      .line-content { color: ${(props) => props.theme.colors.text.muted}; }
      .line-prefix { opacity: 0; }
    }
  }

  .expand-marker {
    display: flex;
    align-items: center;
    padding: 0 8px 0 4px;
    min-height: 22px;
    background: ${(props) => props.theme.background.mantle};

    .expand-gutter {
      width: 24px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 4px;
    }

    .expand-buttons {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 11px;
      padding: 0;
      background: transparent;
      border: none;
      color: ${(props) => props.theme.colors.text.muted};
      cursor: pointer;
      opacity: 0.6;

      &:hover {
        color: ${(props) => props.theme.text};
        opacity: 1;
      }
    }

    .expand-line {
      flex: 1;
      height: 1px;
      background: ${(props) => props.theme.border.border1};
      margin-left: 8px;
    }
  }
`;

export default StyledWrapper;
