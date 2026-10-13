import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;

  .tab-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: ${(props) => props.theme.console.bg};
  }

  .profiler-toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    background: ${(props) => props.theme.console.headerBg};
    flex-wrap: wrap;
  }

  button.profiler-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    font-size: ${(props) => props.theme.font.size.xs};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 3px;
    color: ${(props) => props.theme.console.buttonColor};
    background: transparent;
    cursor: pointer;

    &:hover { border-color: ${(props) => props.theme.primary.solid}; }
    &.recording { color: ${(props) => props.theme.colors.text.danger}; border-color: ${(props) => props.theme.colors.text.danger}; }
    &:disabled { opacity: 0.45; cursor: default; }
  }

  .toolbar-sep {
    width: 1px;
    align-self: stretch;
    background: ${(props) => props.theme.console.border};
    margin: 0 4px;
  }

  input.profiler-input {
    font-size: ${(props) => props.theme.font.size.xs};
    padding: 3px 8px;
    width: 180px;
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 3px;
    background: transparent;
    color: ${(props) => props.theme.console.messageColor};
    outline: none;

    &:focus { border-color: ${(props) => props.theme.primary.solid}; }
  }

  .baseline-banner {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.console.messageColor};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 3px;
    padding: 6px 10px;

    .warning { color: ${(props) => props.theme.colors.text.warning}; margin-top: 4px; }
  }

  .delta {
    display: block;
    font-size: 0.88em;
    font-variant-numeric: tabular-nums;
    &.better { color: ${(props) => props.theme.colors.text.green}; }
    &.worse { color: ${(props) => props.theme.colors.text.danger}; }
    &.same { color: ${(props) => props.theme.console.countColor}; }
  }

  .tag {
    margin-left: 6px;
    font-size: 0.85em;
    padding: 0 4px;
    border-radius: 2px;
    border: 1px solid ${(props) => props.theme.console.border};
    color: ${(props) => props.theme.console.countColor};
    font-family: inherit;
  }

  ul.insights {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .insight {
    border: 1px solid ${(props) => props.theme.console.border};
    border-left-width: 3px;
    border-radius: 3px;
    padding: 6px 10px;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.console.messageColor};

    &.severity-high { border-left-color: ${(props) => props.theme.colors.text.danger}; }
    &.severity-medium { border-left-color: ${(props) => props.theme.colors.text.warning}; }
    &.severity-info { border-left-color: ${(props) => props.theme.console.border}; }
    &.resolved { border-left-color: ${(props) => props.theme.colors.text.green}; opacity: 0.8; }
  }

  .insight-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .insight-title { font-weight: 500; }

  .insight-evidence {
    margin-top: 3px;
    font-family: monospace;
    color: ${(props) => props.theme.console.countColor};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .insight-suggestion {
    margin-top: 3px;
    color: ${(props) => props.theme.console.countColor};
  }

  .badge {
    font-size: 0.85em;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0 5px;
    border-radius: 2px;
    border: 1px solid currentColor;

    &.high { color: ${(props) => props.theme.colors.text.danger}; }
    &.medium { color: ${(props) => props.theme.colors.text.warning}; }
    &.info { color: ${(props) => props.theme.console.countColor}; }
    &.resolved { color: ${(props) => props.theme.colors.text.green}; }
  }

  .resolved-title {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    color: ${(props) => props.theme.console.countColor};
    margin: 12px 0 6px;
  }

  .toolbar-stats {
    margin-left: auto;
    display: flex;
    gap: 14px;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.console.countColor};
    font-variant-numeric: tabular-nums;

    b { color: ${(props) => props.theme.console.messageColor}; font-weight: 500; }
  }

  .profiler-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .panel-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.console.titleColor};
    margin: 0 0 2px 0;
  }

  .panel-note {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.console.countColor};
    margin: 0 0 8px 0;
  }

  .profiler-body > section {
    min-width: 0;
  }

  .table-scroll {
    overflow-x: auto;
    max-width: 100%;
  }

  table.profiler-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${(props) => props.theme.font.size.xs};

    th {
      text-align: left;
      font-weight: 500;
      color: ${(props) => props.theme.console.countColor};
      padding: 5px 8px;
      border-bottom: 1px solid ${(props) => props.theme.console.border};
      white-space: nowrap;
    }

    th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }

    td {
      padding: 4px 8px;
      color: ${(props) => props.theme.console.messageColor};
      border-bottom: 1px solid ${(props) => props.theme.console.border};
      white-space: nowrap;
    }

    td.name {
      font-family: monospace;
      max-width: 340px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    tr.hot td { color: ${(props) => props.theme.colors.text.danger}; }
    tr.gone td { opacity: 0.6; }

    .pct { opacity: 0.6; font-size: 0.92em; }
  }

  .state-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 8px;
  }

  .state-cell {
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 3px;
    padding: 7px 9px;
    display: flex;
    flex-direction: column;
    gap: 2px;

    .label {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.console.countColor};
    }
    .value {
      font-size: ${(props) => props.theme.font.size.base};
      color: ${(props) => props.theme.console.messageColor};
      font-variant-numeric: tabular-nums;
    }
  }

  .empty {
    color: ${(props) => props.theme.console.countColor};
    font-size: ${(props) => props.theme.font.size.xs};
    padding: 10px 2px;
  }
`;

export default StyledWrapper;
