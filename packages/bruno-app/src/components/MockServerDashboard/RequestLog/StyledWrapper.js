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

    &.status-2xx { color: #22c55e; }
    &.status-3xx { color: #3b82f6; }
    &.status-4xx { color: #f59e0b; }
    &.status-5xx { color: #ef4444; }
    &.status-unmatched { color: #ef4444; font-style: italic; }
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
`;

export default Wrapper;
