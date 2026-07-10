import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 500;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
    }

    td {
      padding: 6px 10px;
    }

    th {
      padding: 6px 10px;
      text-align: left;
      font-weight: 600;
      border: 1px solid ${(props) => props.theme.table.border};
    }
  }

  input[type='text'] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;
    background-color: inherit;

    &:focus {
      outline: none !important;
      border: solid 1px transparent;
    }
  }

  .log-table-container {
    flex: 1;
    overflow: auto;
  }

  .method-badge {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;

    &.get { color: #22c55e; }
    &.post { color: #f59e0b; }
    &.put { color: #3b82f6; }
    &.patch { color: #a855f7; }
    &.delete { color: #ef4444; }
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
    font-size: 12px;
  }

  .log-timestamp {
    color: ${(props) => props.theme.colors.text.muted};
    font-family: monospace;
    font-size: 11px;
  }

  .no-match-label {
    color: ${(props) => props.theme.colors.text.danger};
    font-style: italic;
  }

  .text-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .text-link {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
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
    background: ${(props) => props.theme.table.row?.selected || 'rgba(127, 127, 127, 0.08)'};
  }

  .log-trace-row td {
    padding: 0;
    border-top: none;
    background: ${(props) => props.theme.table.row?.selected || 'rgba(127, 127, 127, 0.08)'};
  }

  .match-trace-panel {
    margin: 0;
    padding: 10px 12px 12px;
    border: none;
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-radius: 0;
    background: transparent;
    max-height: 240px;
    overflow: auto;
  }

  .match-trace-header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-bottom: 10px;
    font-size: 12px;
  }

  .match-trace-route {
    font-family: monospace;
    font-weight: 600;
  }

  .match-trace-result-success {
    color: #22c55e;
  }

  .match-trace-result-fail {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .match-trace-section {
    margin-top: 10px;
  }

  .match-trace-section-title {
    font-size: 11px;
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
    font-size: 12px;
  }

  .match-trace-candidate {
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 8px;

    &.is-selected {
      border-color: #22c55e;
    }
  }

  .match-trace-candidate-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .match-trace-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 999px;
    background: ${(props) => props.theme.table.border};
    color: ${(props) => props.theme.colors.text.muted};

    &.selected {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    &.skipped {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }
  }

  .match-trace-conditions {
    margin: 0;
    padding-left: 0;
    list-style: none;
    font-size: 12px;

    li {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: baseline;
      margin-bottom: 4px;
      font-family: monospace;

      &.pass {
        color: #22c55e;
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
  .match-trace-empty {
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
