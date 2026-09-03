import styled from 'styled-components';

/* Table chrome mirrors components/EditableTable so both dashboard tabs read as one surface. */
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  .log-table-container {
    flex: 1;
    overflow: auto;
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    font-size: ${(props) => props.theme.font.size.base};

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 5px 10px;
      text-align: left;
      font-weight: 400;
      color: ${(props) => props.theme.table.thead.color};
      background: ${(props) => props.theme.sidebar.bg};
      user-select: none;
    }

    th,
    td {
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
      border-right: 1px solid ${(props) => props.theme.border.border0};

      &:last-child {
        border-right: none;
      }
    }

    td {
      padding: 6px 10px;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }
  }

  .status-code {
    font-weight: 600;
    font-family: monospace;

    &.status-2xx { color: ${(props) => props.theme.requestTabPanel.responseOk}; }
    &.status-3xx { color: ${(props) => props.theme.colors.text.warning}; }
    &.status-4xx { color: ${(props) => props.theme.requestTabPanel.responseError}; }
    &.status-5xx { color: ${(props) => props.theme.requestTabPanel.responseError}; }
    &.status-unmatched { color: ${(props) => props.theme.requestTabPanel.responseError}; font-style: italic; }
  }

  .log-path {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .log-timestamp {
    color: ${(props) => props.theme.colors.text.muted};
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
  }

  .no-match-label {
    color: ${(props) => props.theme.colors.text.danger};
    font-style: italic;
  }

  .empty-state {
    padding: 40px 0;
    text-align: center;
  }

  .inspect-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    padding: 0;
    line-height: 1;

    &:hover,
    &.is-active {
      color: ${(props) => props.theme.textLink};
    }
  }

  .log-row-expanded td {
    background: ${(props) => props.theme.dropdown.hoverBg};
  }

  .log-trace-row td {
    padding: 0;
    background: ${(props) => props.theme.dropdown.hoverBg};
  }

  .match-trace-panel {
    padding: 10px 12px 12px;
    max-height: 240px;
    overflow: auto;
  }

  .match-trace-header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-bottom: 10px;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .match-trace-route {
    font-family: monospace;
    font-weight: 600;
  }

  .match-trace-result-success {
    color: ${(props) => props.theme.status.success.text};
  }

  .match-trace-result-fail {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .match-trace-section {
    margin-top: 10px;
  }

  .match-trace-section-title {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 6px;
  }

  .match-trace-list {
    margin: 0;
    padding-left: 18px;
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .match-trace-candidate {
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.sm};
    padding: 8px;
    margin-bottom: 8px;

    &.is-selected {
      border-color: ${(props) => props.theme.status.success.border};
    }
  }

  .match-trace-candidate-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
    margin-bottom: 6px;
  }

  .match-trace-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 999px;
    background: ${(props) => props.theme.border.border0};
    color: ${(props) => props.theme.colors.text.muted};

    &.selected {
      background: ${(props) => props.theme.status.success.background};
      color: ${(props) => props.theme.status.success.text};
    }

    &.skipped {
      background: ${(props) => props.theme.status.warning.background};
      color: ${(props) => props.theme.status.warning.text};
    }
  }

  .match-trace-conditions {
    margin: 0;
    padding-left: 0;
    list-style: none;
    font-size: ${(props) => props.theme.font.size.sm};

    li {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: baseline;
      margin-bottom: 4px;
      font-family: monospace;

      &.pass {
        color: ${(props) => props.theme.status.success.text};
      }

      &.fail {
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }

  .match-trace-condition-status {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .match-trace-actual,
  .match-trace-fallback-note,
  .match-trace-operator,
  .match-trace-error {
    margin-top: 8px;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
    word-break: break-word;
  }

  .match-trace-empty {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
