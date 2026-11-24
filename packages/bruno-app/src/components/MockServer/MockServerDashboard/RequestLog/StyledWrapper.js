import styled from 'styled-components';

const Wrapper = styled.div`
  && .has-section-rows .table-container {
    overflow: clip;
  }

  tbody tr.log-trace-row,
  tbody tr.log-trace-row td.full-width-row {
    height: auto;
    max-height: none;
    overflow: visible;
    white-space: normal;
  }

  tbody tr.log-trace-row td.full-width-row {
    padding: 0 !important;
    border-right: none;
    text-overflow: clip;
  }

  tbody tr.log-trace-row td.full-width-row > .match-trace-panel {
    height: auto;
    max-height: 190px;
    overflow: auto;
  }

  tbody tr:not(.log-trace-row) {
    cursor: pointer;
  }

  tbody td > div:not(.match-trace-panel) {
    min-width: 0;
  }

  .truncate-cell {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .log-row-expanded td {
    background: ${(props) => props.theme.background.surface0};
  }

  .match-trace-panel {
    padding: 12px 14px 4px;
    min-width: 0;

    &:has(.match-trace-candidate:last-child.is-selected) {
      padding-bottom: 14px;
    }
  }

  .match-trace-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 12px;
    margin-bottom: 12px;
    min-width: 0;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .match-trace-route {
    flex: 1;
    min-width: 0;
    font-family: monospace;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .match-trace-result {
    flex-shrink: 0;
    font-size: ${(props) => props.theme.font.size.xs};
  }

  .match-trace-result-success {
    color: ${(props) => props.theme.status.success.text};
  }

  .match-trace-result-fail {
    color: ${(props) => props.theme.status.danger.text};
  }

  .match-trace-section {
    margin-top: 12px;
  }

  .match-trace-section-title {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 8px;
  }

  .match-trace-list {
    margin: 0;
    padding: 6px 10px;
    list-style: none;
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.background.surface0};
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};

    li {
      padding: 2px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .match-trace-candidate {
    border-bottom: 1px solid ${(props) => props.theme.border.border0};
    padding: 8px 10px;
    min-width: 0;

    &:last-child {
      margin-bottom: 0;
    }

    &:last-child:not(.is-selected) {
      border-bottom: none;
    }

    &.is-selected {
      border-color: ${(props) => props.theme.status.success.border};
      background: ${(props) => props.theme.background.surface0};
    }
  }

  .match-trace-candidate-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;

    .match-trace-candidate-name {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }
  }

  .match-trace-conditions {
    margin: 0;
    padding-left: 0;
    list-style: none;
    font-size: ${(props) => props.theme.font.size.sm};

    li {
      display: flex;
      gap: 4px;
      align-items: center;
      margin-bottom: 4px;
      min-width: 0;
      font-family: monospace;

      &:last-child {
        margin-bottom: 0;
      }

      .match-trace-condition-text {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .match-trace-condition-status {
    flex-shrink: 0;
  }

  .match-trace-actual {
    flex-shrink: 0;
    max-width: 40%;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.status.danger.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .match-trace-operator {
    margin-top: 8px;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .match-trace-error {
    margin-top: 8px;
    padding: 6px 8px;
    border: 1px solid ${(props) => props.theme.status.danger.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.status.danger.background};
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.status.danger.text};
    overflow-wrap: anywhere;
  }

  .match-trace-empty {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
