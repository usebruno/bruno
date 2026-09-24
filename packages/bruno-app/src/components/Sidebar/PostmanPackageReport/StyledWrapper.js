import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const StyledWrapper = styled.div`
  .bruno-modal-card {
    width: 600px;
  }

  .pkg-section {
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.mantle};
    padding: 12px 14px;
  }

  .pkg-section + .pkg-section,
  .pkg-section + .pkg-status,
  .pkg-status + .pkg-status {
    margin-top: 10px;
  }

  .pkg-section-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    color: ${(props) => props.theme.text};
  }

  .pkg-section-title {
    flex: 1;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pkg-section-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border2};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .pkg-section-help {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.45;
    margin: 0 0 10px 0;

    code {
      background-color: ${(props) => props.theme.background.base};
      border: 1px solid ${(props) => props.theme.border.border2};
      padding: 1px 5px;
      border-radius: ${(props) => props.theme.border.radius.sm};
      font-size: 0.85em;
    }

    strong {
      color: ${(props) => props.theme.text};
      font-weight: 600;
    }
  }

  .pkg-section-danger .pkg-section-head {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .pkg-devmode {
    margin-top: 10px;
    border-color: ${(props) => props.theme.primary.solid};
  }

  .pkg-devmode-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .pkg-devmode-head svg {
    color: ${(props) => props.theme.primary.text};
    flex-shrink: 0;
  }

  .pkg-devmode-title {
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .pkg-devmode-desc {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.5;
    margin: 0 0 12px 0;

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: ${(props) => props.theme.text};
      font-size: 0.9em;
    }

    strong {
      color: ${(props) => props.theme.text};
      font-weight: 600;
    }
  }

  .pkg-devmode-trust {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    border: 1px solid ${(props) => props.theme.primary.solid};
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.primary.text};
    font-size: ${(props) => props.theme.font.size.base};

    svg {
      flex-shrink: 0;
    }
  }

  .pkg-inline-status {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 12px;
    font-size: ${(props) => props.theme.font.size.base};
  }

  .pkg-inline-info {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .pkg-inline-success {
    color: ${(props) => props.theme.colors.text.green};
  }

  .pkg-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pkg-list-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px 3px 6px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border2};
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
  }

  .pkg-list-item svg {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .pkg-section-danger .pkg-list-item {
    border-color: ${(props) => props.theme.status.danger.border};
    color: ${(props) => props.theme.colors.text.danger};
  }

  .pkg-cmd-block {
    margin-top: 12px;
  }

  .pkg-cmd-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 500;
  }

  .pkg-cmd-row {
    display: flex;
    align-items: stretch;
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.sm};
    overflow: hidden;
  }

  .pkg-cmd-code {
    flex: 1;
    padding: 7px 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    background: transparent;

    &::before {
      content: '$ ';
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .pkg-cmd-copy {
    background: transparent;
    border: none;
    border-left: 1px solid ${(props) => props.theme.border.border2};
    padding: 0 10px;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s, color 0.15s;

    &:hover {
      background-color: ${(props) => props.theme.background.mantle};
      color: ${(props) => props.theme.text};
    }
  }

  .pkg-status {
    padding: 10px 12px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.base};
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.4;
    border: 1px solid ${(props) => props.theme.border.border2};
    background-color: ${(props) => props.theme.background.mantle};

    strong {
      font-weight: 600;
    }
  }

  .pkg-status-info svg:first-child {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .pkg-status-success {
    color: ${(props) => props.theme.colors.text.green};
  }

  .pkg-status-success svg:first-child {
    color: ${(props) => props.theme.colors.text.green};
  }

  .pkg-status-danger {
    color: ${(props) => props.theme.colors.text.danger};
    flex-direction: column;
    gap: 8px;
  }

  .pkg-status-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pkg-status-log {
    margin: 0;
    padding: 8px 10px;
    background-color: ${(props) => props.theme.background.base};
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.border.border2};
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
    max-height: 160px;
    overflow: auto;
    white-space: pre-wrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    width: 100%;
  }

  .pkg-spin {
    animation: ${spin} 0.8s linear infinite;
  }
`;

export default StyledWrapper;
