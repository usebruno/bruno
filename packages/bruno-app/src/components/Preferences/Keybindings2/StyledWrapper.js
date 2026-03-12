import styled from 'styled-components';

const StyledWrapper = styled.div`
  min-height: 0;
  max-height: calc(100% - 30px);

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
    margin-bottom: 12px;
  }

  .reset-all-btn {
    display: flex;
    align-items: center;
    background: transparent;
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: 6px;
    padding: 4px 4px;
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

  .tables-container {
    overflow-y: auto;
    padding-right: 2px;

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
    }
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .group-block {
    margin-bottom: 20px;
  }

  .group-block:last-child {
    margin-bottom: 0;
  }

  .group-heading {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin-bottom: 8px;
    padding-left: 2px;
    user-select: none;
  }

  .table-container {
    min-height: 0;
    overflow: hidden;
    border-radius: ${(props) => props.theme.border.radius.base};
    border-bottom: 1px solid ${(props) => props.theme.table.border};
  }

  table {
    width: 100%;
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

  td {
    padding: 6px 10px;
    font-size: ${(props) => props.theme.font.size.sm};
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-left: 1px solid ${(props) => props.theme.table.border};
    border-right: 1px solid ${(props) => props.theme.table.border};
  }

  .keybinding-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .keybinding-row .edit-btn,
  .keybinding-row .reset-btn {
    flex-shrink: 0;
  }

  .button-placeholder {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
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

  .tooltip-mod.tooltip-mod--error {
    color: ${(props) => props.theme.status.danger.text} !important;
  }

  .empty-state {
    padding: 12px 2px;
    color: ${(props) => props.theme.text};
    opacity: 0.8;
  }
`;

export default StyledWrapper;
