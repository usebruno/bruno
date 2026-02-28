import styled from 'styled-components';

const StyledWrapper = styled.div`
  min-height: 0;
  height: 100%;

  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
  -ms-overflow-style: none;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
  }

  .reset-all-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: 6px;
    padding: 4px 10px;
    cursor: pointer;
    color: ${(props) => props.theme.text};
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.button.secondary.hoverBg};
      border-color: ${(props) => props.theme.button.secondary.hoverBorder};
    }
  }

  .keybinding-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .keybinding-row:hover .edit-btn {
    opacity: 0.9;
  }

  .shortcut-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 260px;
    flex: 1;
  }

  .shortcut-input {
    width: 200px;
    max-width: 200px;
    flex-shrink: 0;

    caret-color: ${(props) => props.theme.table.input.color};

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    border: none;
    outline: none;
    background: transparent;

    font-family: monospace;
    color: ${(props) => props.theme.table.input.color};
    cursor: pointer;

    &:hover {
      opacity: 0.85;
    }

    &:focus {
      opacity: 1;
    }

    &::placeholder {
      opacity: 0.5;
    }
  }

  .edit-btn {
    background: transparent;
    border: none;
    color: ${(props) => props.theme.table.thead.color};
    padding: 0;
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  .reset-btn {
    background: transparent;
    border: none;
    color: ${(props) => props.theme.table.thead.color};
    border-radius: 8px;
    padding: 0px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  .shortcut-input--error {
    opacity: 1;
  }

  .kb-tooltip {
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 12px;
    line-height: 1.2;
    max-width: 320px;
    white-space: normal;
  }

  .kb-tooltip--error {
    color: ${(props) => props.theme.colors?.text?.red || '#ef4444'};
  }

  .table-container {
    flex: 1 1 auto;
    min-height: 0;
    max-height: 650px;
    overflow-y: auto;

    border-radius: 8px;
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-bottom: 1px solid ${(props) => props.theme.table.border};

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
    }
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  }

  thead th:first-child,
  tbody td:first-child {
    width: 35%;
  }

  thead th:last-child,
  tbody td:last-child {
    width: 45%;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 5;

    background: ${(props) => props.theme.background};
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    color: ${(props) => props.theme.table.thead.color};
    font-size: ${(props) => props.theme.font.size.base};
    user-select: none;
    font-weight: 500;
    padding: 10px;
    text-align: left;

    border-left: 1px solid ${(props) => props.theme.table.border};
    border-right: 1px solid ${(props) => props.theme.table.border};
    border-bottom: 1px solid ${(props) => props.theme.table.border};
    box-shadow: 0 1px 0 ${(props) => props.theme.table.border};
  }

  td {
    padding: 6px 10px;
    font-size: ${(props) => props.theme.font.size.sm};
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-left: 1px solid ${(props) => props.theme.table.border};
    border-right: 1px solid ${(props) => props.theme.table.border};
  }
`;

export default StyledWrapper;
