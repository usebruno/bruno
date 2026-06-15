import styled from 'styled-components';

const Wrapper = styled.div`
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

    tbody tr:hover .copy-path-btn {
      opacity: 1;
    }
  }

  .search-input {
    flex: 1;
    padding: 6px 10px;
    font-size: ${(props) => props.theme.font.size.sm};
    border: 1px solid ${(props) => props.theme.table.border} !important;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: inherit;

    &:focus {
      outline: none !important;
      border-color: var(--color-tab-active-border) !important;
    }
  }

  .method-badge {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;

    &.get { color: #22c55e; }
    &.post { color: #f59e0b; }
    &.put { color: #3b82f6; }
    &.patch { color: #a855f7; }
    &.delete { color: #ef4444; }
    &.head { color: #06b6d4; }
    &.options { color: #6b7280; }
  }

  .path-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .route-path {
    font-family: monospace;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .copy-path-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 2px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;

    &:focus-visible {
      opacity: 1;
    }

    &:hover {
      color: inherit;
    }
  }

  .source-file {
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .text-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .empty-state {
    padding: 40px 0;
    text-align: center;
  }
`;

export default Wrapper;
